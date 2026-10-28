"""
Simulation engine for AI-Based Intelligent Bandwidth Allocation Using
Reinforcement Learning.

# MODIFIED: 2026-10-09
#   Change 1: compute utilization in _calculate_allocation_result
#   Change 2: RL reward uses combined J(QoS,utilization) objective
#   Change 4: pass random_seed to RLAllocator for reproducibility;
#             derive per-type seeds (seed + index) for traffic generators
#   Change 5: reset() re-creates rl_allocator and resets ai_allocator weights

This module implements the core discrete-event simulation loop that orchestrates
traffic generation, allocation, metrics collection, and state broadcasting.
"""

import asyncio
import random
import time
from typing import Dict, Optional, Callable

from models import (
    SimulationConfig,
    UserType,
    TrafficDemand,
    AllocationDecision,
    AllocationResult,
    UserTypeMetrics,
    NetworkState
)
from simulator.traffic import (
    VideoStreamingGenerator,
    OnlineGamingGenerator,
    IoTDeviceGenerator,
    VoIPMessagingGenerator
)
from allocators.baseline import BaselineAllocator
from allocators.ai_allocator import AIAllocator
from allocators.rl_allocator import RLAllocator
from groq.override_layer import GroqOverrideLayer
from metrics.collector import MetricsCollector


class SimulationEngine:
    """
    Core simulation orchestrator managing tick-based execution.
    
    The engine runs at 100ms intervals, coordinating:
    - Traffic generation for all user types
    - Bandwidth allocation by both baseline and AI allocators
    - QoS metrics calculation
    - Groq API strategic evaluation (every 50 ticks)
    - Network state broadcasting
    
    Key Design Principles:
    - ONE traffic demand snapshot per tick, shared by both allocators (fair comparison)
    - Deterministic execution when random_seed is provided
    - Graceful error handling with simulation continuity
    - Real-time performance (<100ms per tick)
    """
    
    def __init__(self, config: SimulationConfig, groq_api_key: Optional[str] = None, repository=None):
        """
        Initialize simulation engine.
        
        Args:
            config: Simulation configuration parameters.
            groq_api_key: Optional Groq API key for AI insights.
            repository: Optional SimulationRepository for database persistence.
        """
        self.config = config
        self.tick_interval = 0.1  # 100ms
        self.current_tick = 0
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        
        # Database persistence (optional)
        self.repository = repository
        self.current_run_id: Optional[str] = None
        self.snapshot_interval = 5  # Save snapshot every 5 ticks
        self.stats_update_interval = 10  # Update stats every 10 ticks
        
        # Set random seed if provided for reproducibility
        if config.random_seed is not None:
            random.seed(config.random_seed)
        
        # Initialize traffic generators with per-type seeds (Change 4)
        # Using seed+index avoids correlated sequences across user types
        def _make_seed(base: Optional[int], idx: int) -> Optional[int]:
            return (base + idx) if base is not None else None

        self.traffic_generators = {
            UserType.VIDEO_STREAMING: VideoStreamingGenerator(_make_seed(config.random_seed, 0)),
            UserType.ONLINE_GAMING:   OnlineGamingGenerator(_make_seed(config.random_seed, 1)),
            UserType.IOT_DEVICES:     IoTDeviceGenerator(_make_seed(config.random_seed, 2)),
            UserType.VOIP_MESSAGING:  VoIPMessagingGenerator(_make_seed(config.random_seed, 3)),
        }
        
        # Initialize allocators
        self.baseline_allocator = BaselineAllocator()
        self.ai_allocator = AIAllocator()
        self.rl_allocator = RLAllocator(seed=config.random_seed)  # Change 4
        
        # Initialize Groq layer
        self.groq_layer = GroqOverrideLayer(api_key=groq_api_key)
        
        # Initialize metrics collector
        self.metrics_collector = MetricsCollector(window_size=100)
        
        # State broadcast callback (set by WebSocket server)
        self.state_callback: Optional[Callable] = None
        
        # Latest network state
        self.latest_state: Optional[NetworkState] = None
    
    async def start(self) -> None:
        """
        Start the simulation loop.
        
        Begins executing simulation ticks at 100ms intervals.
        Creates a database run record if repository is configured.
        """
        if self.is_running:
            return
        
        # Create database run record
        if self.repository:
            self.current_run_id = await self.repository.create_run(self.config)
        
        self.is_running = True
        self.current_tick = 0
        self._task = asyncio.create_task(self._simulation_loop())
    
    async def stop(self) -> None:
        """
        Stop the simulation loop.
        
        Gracefully stops the simulation and cancels the tick task.
        Finalizes the database run record if repository is configured.
        """
        if not self.is_running:
            return
        
        self.is_running = False
        
        # Finalize database run
        if self.repository and self.current_run_id:
            asyncio.create_task(self._finalize_run("completed"))
        
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
    
    async def reset(self) -> None:
        """
        Reset simulation state to initial conditions.
        
        Stops the simulation, clears history, resets tick counter,
        and re-creates the RL allocator so Q-values, epsilon, and
        reward history return to their initial values (Change 5).
        Updates the database run status to "stopped" if active.
        """
        # Update run status to stopped if active
        if self.repository and self.current_run_id and self.is_running:
            asyncio.create_task(self._finalize_run("stopped"))
        
        await self.stop()
        
        self.current_tick = 0
        self.latest_state = None
        self.current_run_id = None
        
        # Reset metrics collector
        self.metrics_collector = MetricsCollector(window_size=100)
        
        # Re-create traffic generators with initial seeds (Change 5)
        def _make_seed(base: Optional[int], idx: int) -> Optional[int]:
            return (base + idx) if base is not None else None

        self.traffic_generators = {
            UserType.VIDEO_STREAMING: VideoStreamingGenerator(_make_seed(self.config.random_seed, 0)),
            UserType.ONLINE_GAMING:   OnlineGamingGenerator(_make_seed(self.config.random_seed, 1)),
            UserType.IOT_DEVICES:     IoTDeviceGenerator(_make_seed(self.config.random_seed, 2)),
            UserType.VOIP_MESSAGING:  VoIPMessagingGenerator(_make_seed(self.config.random_seed, 3)),
        }
        
        # Reset baseline allocator
        self.baseline_allocator = BaselineAllocator()

        # Re-create RL allocator to wipe Q-values, epsilon, reward history (Change 5)
        self.rl_allocator = RLAllocator(seed=self.config.random_seed)
        
        # Reset AI allocator priority weights to defaults (Change 5)
        self.ai_allocator = AIAllocator()
        
        # Reset random seed if configured
        if self.config.random_seed is not None:
            random.seed(self.config.random_seed)
    
    async def _simulation_loop(self) -> None:
        """
        Main simulation loop executing ticks at 100ms intervals.
        
        Uses asyncio.sleep for precise timing control.
        """
        try:
            while self.is_running:
                tick_start = time.time()
                
                # Execute simulation tick
                network_state = await self._simulation_tick()
                
                # Broadcast state if callback is set
                if self.state_callback:
                    await self.state_callback(network_state)
                
                # Calculate elapsed time and sleep for remainder of interval
                tick_duration = time.time() - tick_start
                
                if tick_duration > self.tick_interval:
                    print(f"Warning: Tick {self.current_tick} took {tick_duration*1000:.2f}ms (>100ms)")
                
                sleep_time = max(0, self.tick_interval - tick_duration)
                await asyncio.sleep(sleep_time)
                
        except asyncio.CancelledError:
            # Graceful shutdown
            pass
        except Exception as e:
            import traceback
            print(f"Simulation loop error: {e}")
            traceback.print_exc()
            self.is_running = False
    
    async def _simulation_tick(self) -> NetworkState:
        """
        Execute a single simulation tick.
        
        Steps:
        1. Generate traffic demands (ONE snapshot for fair comparison)
        2. Allocate bandwidth with both allocators using same demands
        3. Calculate QoS metrics for both allocations
        4. Evaluate Groq strategy (every 50 ticks)
        5. Collect metrics
        6. Create and return network state
        
        Returns:
            NetworkState snapshot for this tick.
        """
        self.current_tick += 1
        timestamp = time.time()
        
        # Step 1: Generate traffic demands (ONE snapshot per tick)
        demands = self._generate_traffic_demands()
        
        # Step 2: Calculate current congestion level
        total_demand = sum(d.bandwidth_demand for d in demands.values())
        congestion_level = min(total_demand / self.config.total_bandwidth, 1.0)
        
        # Step 3: Allocate bandwidth with baseline allocator
        baseline_decision = self.baseline_allocator.allocate(
            self.config.total_bandwidth,
            demands
        )
        baseline_result = self._calculate_allocation_result(
            baseline_decision,
            demands,
            congestion_level
        )
        
        # Step 4: Allocate bandwidth with AI allocator
        ai_decision = self.ai_allocator.allocate(
            self.config.total_bandwidth,
            demands,
            congestion_level
        )
        ai_result = self._calculate_allocation_result(
            ai_decision,
            demands,
            congestion_level
        )
        
        # Step 4b: Allocate bandwidth with RL allocator
        rl_decision = self.rl_allocator.allocate(
            self.config.total_bandwidth,
            demands,
            congestion_level
        )
        rl_result = self._calculate_allocation_result(
            rl_decision,
            demands,
            congestion_level
        )
        
        # Step 4c: Update RL allocator with reward (Change 2)
        # Reward = J(rl_result) - J(baseline_result)
        # J(r) = W_QOS*(qos/100) + W_UTIL*(utilization/100)
        self.rl_allocator.update(baseline_result, rl_result)
        self.rl_allocator.update_epsilon()
        
        # Step 5: Evaluate Groq strategy (every 50 ticks)
        if self.current_tick % self.groq_layer.override_interval == 0:
            # Create temporary network state for Groq evaluation
            temp_state = NetworkState(
                tick=self.current_tick,
                timestamp=timestamp,
                config=self.config,
                demands=demands,
                baseline_result=baseline_result,
                ai_result=ai_result,
                rl_result=rl_result,
                congestion_level=congestion_level
            )
            
            recommendation = await self.groq_layer.evaluate_strategy(
                temp_state,
                self.current_tick,
                self.ai_allocator
            )
            
            if recommendation:
                explanation = recommendation.reasoning
                explanation_timestamp = recommendation.timestamp
            else:
                explanation = self.groq_layer.last_explanation
                explanation_timestamp = timestamp
        else:
            explanation = self.groq_layer.last_explanation
            explanation_timestamp = timestamp
        
        # Step 6: Collect metrics
        self.metrics_collector.record_tick(baseline_result, ai_result)
        
        # Step 7: Create network state
        network_state = NetworkState(
            tick=self.current_tick,
            timestamp=timestamp,
            config=self.config.model_dump() if hasattr(self.config, 'model_dump') else self.config,
            demands=demands,
            baseline_result=baseline_result,
            ai_result=ai_result,
            rl_result=rl_result,
            congestion_level=congestion_level,
            explanation=explanation,
            explanation_timestamp=explanation_timestamp
        )
        
        # Step 8: Non-blocking database writes
        if self.repository and self.current_run_id:
            # Save snapshot every 5 ticks
            if self.current_tick % self.snapshot_interval == 0:
                asyncio.create_task(self._save_snapshot(network_state))
            
            # Update run statistics every 10 ticks
            if self.current_tick % self.stats_update_interval == 0:
                asyncio.create_task(self._update_run_stats())
            
            # Save Groq decision when available
            if explanation and explanation_timestamp:
                asyncio.create_task(self._save_groq_decision(
                    self.current_tick,
                    explanation_timestamp,
                    explanation,
                    recommendation.priority_adjustments if recommendation else {}
                ))
        
        self.latest_state = network_state
        return network_state
    
    def _generate_traffic_demands(self) -> Dict[UserType, TrafficDemand]:
        """
        Generate traffic demands for all user types.
        
        Creates ONE demand snapshot per tick that is shared by both allocators
        to ensure fair comparison.
        
        Returns:
            Dictionary mapping UserType to TrafficDemand.
        """
        demands = {}
        
        for user_type, generator in self.traffic_generators.items():
            try:
                demand = generator.generate_demand(self.current_tick)
                demands[user_type] = demand
            except Exception as e:
                print(f"Error generating traffic for {user_type}: {e}")
                # Fallback to default demand
                demands[user_type] = TrafficDemand(
                    user_type=user_type,
                    bandwidth_demand=10.0,
                    latency_sensitivity=0.5,
                    packet_count=100,
                    timestamp=time.time()
                )
        
        return demands
    
    def _calculate_allocation_result(
        self,
        decision: AllocationDecision,
        demands: Dict[UserType, TrafficDemand],
        congestion_level: float
    ) -> AllocationResult:
        """
        Calculate QoS metrics for an allocation decision.
        
        Applies network constraints (base latency, congestion factor, packet loss)
        to determine experienced QoS for each user type.
        
        Args:
            decision: Allocation decision from an allocator.
            demands: Traffic demands for this tick.
            congestion_level: Current network congestion (0.0-1.0).
        
        Returns:
            AllocationResult with metrics and QoS score.
        """
        metrics = {}
        
        for user_type, allocated_bandwidth in decision.allocations.items():
            demand = demands[user_type]
            
            # Calculate throughput (limited by allocation and demand)
            throughput = min(allocated_bandwidth, demand.bandwidth_demand)
            
            # Calculate latency with congestion factor
            # Base latency + congestion penalty
            congestion_penalty = self.config.base_latency * (self.config.congestion_factor - 1.0) * congestion_level
            latency = self.config.base_latency + congestion_penalty
            
            # Add latency penalty for under-allocation
            if demand.bandwidth_demand > 0:
                allocation_ratio = allocated_bandwidth / demand.bandwidth_demand
                if allocation_ratio < 1.0:
                    # Under-allocated traffic experiences additional latency
                    under_allocation_penalty = (1.0 - allocation_ratio) * 20.0 * demand.latency_sensitivity
                    latency += under_allocation_penalty
            
            # Calculate packet loss
            # Base packet loss + congestion-induced loss
            packet_loss = self.config.packet_loss_rate
            if congestion_level > 0.8:
                # High congestion increases packet loss
                congestion_loss = (congestion_level - 0.8) * 10.0
                packet_loss += congestion_loss
            
            # Under-allocation increases packet loss
            if demand.bandwidth_demand > 0:
                allocation_ratio = allocated_bandwidth / demand.bandwidth_demand
                if allocation_ratio < 1.0:
                    under_allocation_loss = (1.0 - allocation_ratio) * 5.0
                    packet_loss += under_allocation_loss
            
            # Clamp packet loss to 0-100 range
            packet_loss = max(0.0, min(100.0, packet_loss))
            
            # Calculate allocation efficiency score
            # Rewards smart allocation that provides headroom without waste
            allocation_efficiency = 100.0  # Default perfect score
            
            if demand.bandwidth_demand > 0:
                allocation_ratio = allocated_bandwidth / demand.bandwidth_demand
                
                if allocation_ratio < 0.8:
                    # Severe under-allocation: major penalty
                    # 50% = 50 points, 80% = 80 points
                    allocation_efficiency = allocation_ratio * 100.0
                elif allocation_ratio < 1.0:
                    # Slight under-allocation: minor penalty
                    # 80% = 80 points, 95% = 95 points
                    allocation_efficiency = allocation_ratio * 100.0
                elif allocation_ratio >= 1.0 and allocation_ratio <= 3.0:
                    # Perfect to good over-allocation: FULL 100 points
                    # 1x to 3x is excellent - provides burst capacity
                    allocation_efficiency = 100.0
                elif allocation_ratio > 3.0 and allocation_ratio <= 10.0:
                    # Moderate over-allocation: very slight penalty
                    # 5x = 97 points, 10x = 94 points
                    allocation_efficiency = 100.0 - ((allocation_ratio - 3.0) * 0.85)
                else:
                    # Excessive over-allocation: penalty for waste
                    # 15x = 90 points, 20x+ = 85 points
                    allocation_efficiency = max(85.0, 100.0 - ((allocation_ratio - 3.0) * 0.6))
            
            metrics[user_type] = UserTypeMetrics(
                latency=round(latency, 2),
                throughput=round(throughput, 2),
                packet_loss=round(packet_loss, 2),
                allocation_efficiency=round(allocation_efficiency, 2)
            )
        
        # Calculate aggregate QoS score
        qos_score = self.metrics_collector.calculate_qos_score(
            metrics,
            max_throughput=self.config.total_bandwidth / len(UserType)
        )
        
        # Calculate network utilization (Change 1)
        # utilization_pct = 100 * sum(throughput) / total_bandwidth
        # throughput = min(allocated, demand) already computed in metrics
        total_throughput = sum(
            m.throughput for m in metrics.values()
        )
        utilization = (
            100.0 * total_throughput / self.config.total_bandwidth
            if self.config.total_bandwidth > 0 else 0.0
        )
        utilization = round(min(utilization, 100.0), 2)
        
        return AllocationResult(
            decision=decision,
            metrics=metrics,
            qos_score=qos_score,
            utilization=utilization
        )
    
    def set_state_callback(self, callback: Callable) -> None:
        """
        Set callback for broadcasting network state.
        
        Args:
            callback: Async function to call with NetworkState after each tick.
        """
        self.state_callback = callback
    
    def get_latest_state(self) -> Optional[NetworkState]:
        """
        Get the most recent network state.
        
        Returns:
            Latest NetworkState or None if simulation hasn't started.
        """
        return self.latest_state
    
    async def _save_snapshot(self, state: NetworkState) -> None:
        """
        Save snapshot with error handling.
        
        Args:
            state: NetworkState to save
        """
        try:
            from datetime import datetime
            await self.repository.save_snapshot(
                run_id=self.current_run_id,
                tick=state.tick,
                timestamp=datetime.fromtimestamp(state.timestamp),
                demands=state.demands,
                baseline_result=state.baseline_result,
                ai_result=state.ai_result,
                congestion_level=state.congestion_level
            )
        except Exception as e:
            print(f"Failed to save snapshot for tick {state.tick}: {e}")
    
    async def _save_groq_decision(
        self,
        tick: int,
        timestamp: float,
        reasoning: str,
        weights: Dict[UserType, float]
    ) -> None:
        """
        Save Groq decision with error handling.
        
        Args:
            tick: Tick number
            timestamp: Decision timestamp
            reasoning: Natural language explanation
            weights: Recommended priority weights
        """
        try:
            from datetime import datetime
            await self.repository.save_groq_decision(
                run_id=self.current_run_id,
                tick=tick,
                timestamp=datetime.fromtimestamp(timestamp),
                reasoning=reasoning,
                recommended_weights=weights
            )
        except Exception as e:
            print(f"Failed to save Groq decision for tick {tick}: {e}")
    
    async def _update_run_stats(self) -> None:
        """
        Update run statistics with error handling.
        """
        try:
            from datetime import datetime
            stats = self.metrics_collector.get_statistics()
            await self.repository.update_run(
                run_id=self.current_run_id,
                status="running",
                end_time=datetime.now(),
                total_ticks=self.current_tick,
                avg_baseline_qos=stats.baseline_stats.avg_qos_score,
                avg_ai_qos=stats.ai_stats.avg_qos_score,
                qos_improvement=stats.improvement_percentage
            )
        except Exception as e:
            print(f"Failed to update run stats: {e}")
    
    async def _finalize_run(self, status: str) -> None:
        """
        Finalize run with final statistics.
        
        Args:
            status: Final status (completed, stopped)
        """
        try:
            from datetime import datetime
            stats = self.metrics_collector.get_statistics()
            await self.repository.update_run(
                run_id=self.current_run_id,
                status=status,
                end_time=datetime.now(),
                total_ticks=self.current_tick,
                avg_baseline_qos=stats.baseline_stats.avg_qos_score,
                avg_ai_qos=stats.ai_stats.avg_qos_score,
                qos_improvement=stats.improvement_percentage
            )
        except Exception as e:
            print(f"Failed to finalize run: {e}")
    
    async def close(self) -> None:
        """Clean up resources."""
        await self.stop()
        await self.groq_layer.close()
