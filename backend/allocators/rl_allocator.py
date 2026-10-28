"""
RL allocator for AI-Based Intelligent Bandwidth Allocation Using
Reinforcement Learning.

# MODIFIED: 2026-10-09
#   Change 2: reward now uses combined J(QoS, utilization) objective
#             W_QOS = 0.7, W_UTIL = 0.3
#   Change 3: allocate() uses waterfill() so allocations are capped at demand
#   Change 4: __init__ accepts seed; uses self._rng (numpy Generator) instead
#             of global numpy RNG for reproducibility

This module implements a Multi-Armed Bandit allocator using epsilon-greedy strategy
that learns optimal allocation weights during simulation. No heavy ML libraries - pure numpy only.
"""

import time
import numpy as np
from typing import Dict, Optional

from models import UserType, TrafficDemand, AllocationDecision, AllocationResult
from allocators.utils import waterfill

# Reward weighting constants (Change 2)
W_QOS: float = 0.7
W_UTIL: float = 0.3


class RLAllocator:
    """
    Multi-Armed Bandit allocator using epsilon-greedy strategy.
    
    Learns optimal allocation weights during simulation by treating
    each user type's priority weight as an "arm" to explore/exploit.
    
    State: Q-values for each user type (estimated reward per weight level)
    Action: Choose priority weights from discrete options
    Reward: J(rl_result) - J(baseline_result)
            where J(r) = W_QOS*(qos/100) + W_UTIL*(utilization/100)
    
    Characteristics:
    - Learning: Improves allocation strategy over time
    - Exploration: Tries different weight combinations (epsilon-greedy)
    - Exploitation: Uses best-known weights as learning matures
    - Fast: Completes allocation in <10ms
    - Demand-capped: Uses waterfill so allocations never exceed demand
    - Reproducible: seeded numpy RNG (Change 4)
    """
    
    def __init__(self, epsilon: float = 0.15, learning_rate: float = 0.1,
                 seed: Optional[int] = None):
        """
        Initialize RL allocator with epsilon-greedy parameters.
        
        Args:
            epsilon: Exploration rate (0.15 = 15% random exploration)
            learning_rate: Q-learning update rate (0.1 = 10% weight on new info)
            seed: Optional integer seed for reproducible RNG (Change 4)
        """
        self.epsilon = epsilon  # exploration rate (15%)
        self.learning_rate = learning_rate
        self.name = "RL Multi-Armed Bandit"
        
        # Seeded RNG (Change 4) — replaces calls to global np.random.*
        self._rng = np.random.default_rng(seed)
        
        # Discrete weight options per user type
        self.weight_options = [0.5, 0.8, 1.0, 1.2, 1.5, 1.8, 2.0]
        
        # Q-values: estimated reward for each (user_type, weight_option) pair
        # Shape: 4 user types × 7 weight options
        self.q_values = {}  # initialize all to 0.0
        for user_type in UserType:
            self.q_values[user_type] = np.zeros(len(self.weight_options))
        
        # Current chosen weight index per user type
        self.current_weight_indices = {}  # start at middle option (1.0)
        for user_type in UserType:
            self.current_weight_indices[user_type] = 2  # index 2 = weight 1.0
        
        # Action counts for each (user_type, weight_option) pair
        self.action_counts = {}
        for user_type in UserType:
            self.action_counts[user_type] = np.zeros(len(self.weight_options))
        
        # Performance tracking
        self.total_reward = 0.0
        self.tick_count = 0
        self.recent_qos_history = []  # last 10 QoS scores for reward calc
        
        self.congestion_threshold = 0.8  # 80% capacity
    
    def allocate(
        self,
        total_bandwidth: float,
        demands: Dict[UserType, TrafficDemand],
        congestion_level: float = 0.0
    ) -> AllocationDecision:
        """
        Choose weights using epsilon-greedy, then allocate via waterfill.
        
        Allocations are capped at each user type's demand so that spare
        capacity is redistributed rather than wasted (Change 3).
        
        Args:
            total_bandwidth: Total available bandwidth in Mbps.
            demands: Dictionary mapping UserType to TrafficDemand for current tick.
            congestion_level: Current network congestion as fraction (0.0-1.0).
        
        Returns:
            AllocationDecision with RL-optimized, demand-capped bandwidth allocation.
        """
        # Step 1: Select weights using epsilon-greedy
        current_weights = {}
        for user_type in UserType:
            weight_index = self._epsilon_greedy_select(user_type)
            self.current_weight_indices[user_type] = weight_index
            current_weights[user_type] = self.weight_options[weight_index]
            
            # Increment action count
            self.action_counts[user_type][weight_index] += 1
        
        # Step 2: Calculate effective weights with congestion adjustment
        effective_weights = self._calculate_effective_weights(
            current_weights,
            congestion_level
        )
        
        # Step 3: Build weighted priority weights for waterfill
        # Weight the base demand proportionally to effective_weights + latency factor
        waterfill_weights: Dict[UserType, float] = {}
        for user_type, demand in demands.items():
            w = effective_weights[user_type]
            latency_factor = 1.0 + (demand.latency_sensitivity * 0.5)  # 1.0-1.5x boost
            waterfill_weights[user_type] = w * latency_factor
        
        # Step 4: Get raw demand per user type
        raw_demands: Dict[UserType, float] = {
            ut: d.bandwidth_demand for ut, d in demands.items()
        }
        
        # Step 5: Allocate using waterfill (demand-capped, Change 3)
        if sum(raw_demands.values()) > 0:
            allocations = waterfill(waterfill_weights, raw_demands, total_bandwidth)
        else:
            # Fallback to equal split if no demands
            bandwidth_per_type = total_bandwidth / len(UserType)
            allocations = {ut: round(bandwidth_per_type, 2) for ut in UserType}
        
        total_allocated = sum(allocations.values())
        
        return AllocationDecision(
            allocations=allocations,
            total_allocated=round(total_allocated, 2),
            strategy_name=self.name,
            timestamp=time.time()
        )
    
    def update(self, baseline_result: AllocationResult, rl_result: AllocationResult) -> None:
        """
        Update Q-values based on combined QoS+utilization reward (Change 2).
        
        Reward = J(rl_result) - J(baseline_result)
        J(r) = W_QOS * (qos_score / 100) + W_UTIL * (utilization / 100)
        
        Q update rule: Q(s,a) += lr * (reward - Q(s,a))
        
        Args:
            baseline_result: AllocationResult from baseline allocator this tick
            rl_result:       AllocationResult from RL allocator this tick
        """
        def J(result: AllocationResult) -> float:
            return W_QOS * (result.qos_score / 100.0) + W_UTIL * (result.utilization / 100.0)
        
        # Calculate combined objective reward (positive when RL beats baseline)
        reward = J(rl_result) - J(baseline_result)
        
        # Update total reward and tick count
        self.total_reward += reward
        self.tick_count += 1
        
        # Track recent QoS history
        self.recent_qos_history.append(rl_result.qos_score)
        if len(self.recent_qos_history) > 10:
            self.recent_qos_history.pop(0)
        
        # Update Q-values for each user type's chosen action
        for user_type in UserType:
            action_index = self.current_weight_indices[user_type]
            
            # Q-learning update rule
            old_q = self.q_values[user_type][action_index]
            self.q_values[user_type][action_index] = old_q + self.learning_rate * (reward - old_q)
    
    def get_current_weights(self) -> Dict[UserType, float]:
        """
        Return current priority weights being used.
        
        Returns:
            Dictionary mapping UserType to current weight value.
        """
        return {
            user_type: self.weight_options[self.current_weight_indices[user_type]]
            for user_type in UserType
        }
    
    def get_exploration_rate(self) -> float:
        """
        Return current epsilon (exploration rate).
        
        Returns:
            Current exploration rate (0.0-1.0).
        """
        return self.epsilon
    
    def get_learning_stats(self) -> dict:
        """
        Return stats about learning progress.
        
        Returns:
            Dictionary with learning statistics:
            - total_ticks: how many ticks learned
            - avg_reward: average combined-objective reward per tick
            - current_weights: current priority weights
            - exploration_rate: current epsilon
            - best_weights_found: highest Q-value weights per user type
        """
        # Calculate average reward
        avg_reward = self.total_reward / self.tick_count if self.tick_count > 0 else 0.0
        
        # Find best weights (highest Q-value) for each user type
        best_weights_found = {}
        for user_type in UserType:
            best_index = int(np.argmax(self.q_values[user_type]))
            best_weights_found[user_type] = self.weight_options[best_index]
        
        return {
            "total_ticks": self.tick_count,
            "avg_reward": round(avg_reward, 4),
            "current_weights": self.get_current_weights(),
            "exploration_rate": round(self.epsilon, 4),
            "best_weights_found": best_weights_found
        }
    
    def _epsilon_greedy_select(self, user_type: UserType) -> int:
        """
        With probability epsilon: random weight index (explore)
        With probability 1-epsilon: best Q-value weight index (exploit)
        
        Uses self._rng (seeded numpy Generator) instead of global RNG (Change 4).
        
        Args:
            user_type: User type to select weight for
        
        Returns:
            Index into self.weight_options
        """
        if self._rng.random() < self.epsilon:
            # Explore: random action
            return int(self._rng.integers(0, len(self.weight_options)))
        else:
            # Exploit: best known action
            return int(np.argmax(self.q_values[user_type]))
    
    def update_epsilon(self) -> None:
        """
        Decay epsilon over time: epsilon = max(0.05, epsilon * 0.995)
        
        More exploitation as learning matures.
        Called every tick.
        """
        self.epsilon = max(0.05, self.epsilon * 0.995)
    
    def _calculate_effective_weights(
        self,
        base_weights: Dict[UserType, float],
        congestion_level: float
    ) -> Dict[UserType, float]:
        """
        Calculate effective weights with congestion adjustment.
        
        When congestion exceeds 80%, apply additional boost to latency-sensitive
        traffic (gaming and VoIP) to maintain QoS during network stress.
        
        Args:
            base_weights: Base priority weights from RL selection
            congestion_level: Current network congestion as fraction (0.0-1.0).
        
        Returns:
            Dictionary mapping UserType to effective priority weights.
        """
        effective_weights = base_weights.copy()
        
        if congestion_level > self.congestion_threshold:
            # Calculate congestion severity (0.0-1.0 above threshold)
            severity = (congestion_level - self.congestion_threshold) / (1.0 - self.congestion_threshold)
            
            # Boost latency-sensitive traffic during congestion
            congestion_boost = {
                UserType.ONLINE_GAMING: 1.0 + (severity * 0.3),    # Up to 30% boost
                UserType.VOIP_MESSAGING: 1.0 + (severity * 0.2),   # Up to 20% boost
                UserType.VIDEO_STREAMING: 1.0,                      # No boost
                UserType.IOT_DEVICES: 1.0 - (severity * 0.1)       # Slight reduction
            }
            
            for user_type in UserType:
                effective_weights[user_type] *= congestion_boost[user_type]
        
        return effective_weights
