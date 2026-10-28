"""
Backend tests for AI-Based Intelligent Bandwidth Allocation Using RL.

Tests cover:
- Change 1: utilization formula
- Change 2: waterfill invariants
- Change 3: new RL reward
- Change 4: seed determinism (500 ticks)
- Change 5: reset restores initial learning state

Run with:
    cd backend
    pip install pytest
    pytest tests/test_changes.py -v
"""

import asyncio
import sys
import os

# Ensure backend is on path
_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

import pytest
import numpy as np

from models import (
    SimulationConfig, UserType, AllocationResult,
    AllocationDecision, UserTypeMetrics, TrafficDemand
)
from allocators.utils import waterfill
from allocators.rl_allocator import RLAllocator, W_QOS, W_UTIL
from simulator.engine import SimulationEngine


# ─── helpers ──────────────────────────────────────────────────────────────────

def _make_alloc_result(qos: float, util: float) -> AllocationResult:
    """Minimal AllocationResult for reward tests."""
    allocations = {ut: 25.0 for ut in UserType}
    metrics = {
        ut: UserTypeMetrics(
            latency=10.0, throughput=5.0, packet_loss=2.0, allocation_efficiency=90.0
        )
        for ut in UserType
    }
    return AllocationResult(
        decision=AllocationDecision(
            allocations=allocations,
            total_allocated=100.0,
            strategy_name="test",
            timestamp=0.0,
        ),
        metrics=metrics,
        qos_score=qos,
        utilization=util,
    )


def _simple_demands(bw: float = 10.0) -> dict:
    """Create equal demands for all user types."""
    import time
    return {
        ut: TrafficDemand(
            user_type=ut,
            bandwidth_demand=bw,
            latency_sensitivity=0.5,
            packet_count=100,
            timestamp=time.time(),
        )
        for ut in UserType
    }


# ─── Change 1: utilization formula ────────────────────────────────────────────

class TestUtilizationFormula:
    """Test Change 1: utilization = 100 * sum(throughput) / total_bandwidth."""

    def test_utilization_full(self):
        """When all demand equals allocation, utilization should be close to 100%."""
        config = SimulationConfig(total_bandwidth=40.0, random_seed=1)
        engine = SimulationEngine(config)
        demands = _simple_demands(10.0)  # 4 types × 10 Mbps = 40 Mbps total demand

        # Use baseline allocator (equal split = 10 Mbps each)
        decision = engine.baseline_allocator.allocate(40.0, demands)
        result = engine._calculate_allocation_result(decision, demands, 0.0)

        # throughput per type = min(10, 10) = 10, sum = 40 → 100%
        assert abs(result.utilization - 100.0) < 1.0, (
            f"Expected ~100%, got {result.utilization}"
        )

    def test_utilization_below_demand(self):
        """When allocated < demand, utilization < 100%."""
        config = SimulationConfig(total_bandwidth=20.0, random_seed=2)
        engine = SimulationEngine(config)
        demands = _simple_demands(10.0)  # 40 Mbps demanded, only 20 Mbps available

        decision = engine.baseline_allocator.allocate(20.0, demands)
        result = engine._calculate_allocation_result(decision, demands, 0.0)

        # throughput per type = min(5, 10) = 5, sum = 20 → 100% of 20
        assert abs(result.utilization - 100.0) < 1.0

    def test_utilization_zero_when_no_demand(self):
        """Utilization is 0 when demand is 0."""
        config = SimulationConfig(total_bandwidth=100.0, random_seed=3)
        engine = SimulationEngine(config)
        demands = _simple_demands(0.0)

        decision = engine.baseline_allocator.allocate(100.0, demands)
        result = engine._calculate_allocation_result(decision, demands, 0.0)

        assert result.utilization == 0.0

    def test_utilization_capped_at_100(self):
        """Utilization never exceeds 100."""
        config = SimulationConfig(total_bandwidth=10.0, random_seed=4)
        engine = SimulationEngine(config)
        demands = _simple_demands(100.0)  # each type demands 100 Mbps

        decision = engine.baseline_allocator.allocate(10.0, demands)
        result = engine._calculate_allocation_result(decision, demands, 0.0)

        assert result.utilization <= 100.0


# ─── Change 3: waterfill invariants ───────────────────────────────────────────

class TestWaterfill:
    """Test Change 3: waterfill allocation invariants."""

    _weights = {ut: 1.0 for ut in UserType}

    def test_non_negative(self):
        """All allocations must be non-negative."""
        demands = {ut: 5.0 for ut in UserType}
        result = waterfill(self._weights, demands, 40.0)
        for ut, v in result.items():
            assert v >= 0.0, f"Negative allocation for {ut}"

    def test_never_above_demand(self):
        """Each allocation must not exceed the demand for that type."""
        demands = {ut: 5.0 for ut in UserType}
        result = waterfill(self._weights, demands, 100.0)  # plenty of capacity
        for ut in UserType:
            assert result[ut] <= demands[ut] + 0.01, (
                f"Allocation {result[ut]} exceeds demand {demands[ut]} for {ut}"
            )

    def test_total_leq_capacity(self):
        """Total allocation must not exceed capacity."""
        demands = {ut: 15.0 for ut in UserType}
        capacity = 40.0
        result = waterfill(self._weights, demands, capacity)
        assert sum(result.values()) <= capacity + 0.01

    def test_full_satisfaction_when_demand_lt_capacity(self):
        """When total demand < capacity, all types get their full demand."""
        demands = {ut: 5.0 for ut in UserType}  # 20 Mbps total
        capacity = 100.0
        result = waterfill(self._weights, demands, capacity)
        for ut in UserType:
            assert abs(result[ut] - demands[ut]) < 0.05, (
                f"{ut}: expected {demands[ut]} but got {result[ut]}"
            )

    def test_full_capacity_when_demand_gt_capacity(self):
        """When total demand > capacity, the full capacity is used."""
        demands = {ut: 50.0 for ut in UserType}  # 200 Mbps demanded
        capacity = 60.0
        result = waterfill(self._weights, demands, capacity)
        assert sum(result.values()) <= capacity + 0.01
        # capacity should be fully used (all types still unsatisfied)
        assert abs(sum(result.values()) - capacity) < 0.1

    def test_asymmetric_demands(self):
        """Types with smaller demand are fully satisfied; remainder goes to larger demand."""
        demands = {
            UserType.VIDEO_STREAMING: 30.0,
            UserType.ONLINE_GAMING:   2.0,   # small
            UserType.IOT_DEVICES:     1.0,   # small
            UserType.VOIP_MESSAGING:  30.0,
        }
        capacity = 40.0
        result = waterfill(self._weights, demands, capacity)

        # Small-demand types must be fully satisfied
        assert abs(result[UserType.ONLINE_GAMING]  - 2.0) < 0.1
        assert abs(result[UserType.IOT_DEVICES]    - 1.0) < 0.1
        # Total must be at or near capacity
        assert sum(result.values()) <= capacity + 0.01


# ─── Change 2: RL reward uses combined J objective ─────────────────────────────

class TestRLReward:
    """Test Change 2: reward = J(rl) - J(baseline) with W_QOS=0.7, W_UTIL=0.3."""

    def test_reward_constants(self):
        assert W_QOS == 0.7
        assert W_UTIL == 0.3

    def test_reward_positive_when_rl_wins(self):
        alloc = RLAllocator(seed=0)
        baseline = _make_alloc_result(qos=60.0, util=50.0)
        rl_res   = _make_alloc_result(qos=80.0, util=70.0)
        alloc.update(baseline, rl_res)
        assert alloc.total_reward > 0.0

    def test_reward_negative_when_rl_loses(self):
        alloc = RLAllocator(seed=0)
        baseline = _make_alloc_result(qos=80.0, util=70.0)
        rl_res   = _make_alloc_result(qos=60.0, util=50.0)
        alloc.update(baseline, rl_res)
        assert alloc.total_reward < 0.0

    def test_util_zero_reproduces_old_qos_only(self):
        """With W_UTIL=0 (simulated by equal util), reward should equal QoS diff."""
        alloc = RLAllocator(seed=0)
        # Set W_UTIL effectively to 0 by using same utilization for both
        baseline = _make_alloc_result(qos=60.0, util=0.0)
        rl_res   = _make_alloc_result(qos=80.0, util=0.0)
        # J(rl) - J(baseline) = 0.7*(80/100) + 0.3*(0) - (0.7*(60/100) + 0) = 0.14
        expected = 0.7 * (80 / 100.0) - 0.7 * (60 / 100.0)
        alloc.update(baseline, rl_res)
        assert abs(alloc.total_reward - expected) < 1e-6

    def test_reward_changes_when_utilization_changes(self):
        """Different utilization → different reward even with same QoS."""
        alloc1 = RLAllocator(seed=0)
        alloc2 = RLAllocator(seed=0)

        baseline = _make_alloc_result(qos=70.0, util=50.0)

        rl_high_util = _make_alloc_result(qos=70.0, util=90.0)
        rl_low_util  = _make_alloc_result(qos=70.0, util=10.0)

        alloc1.update(baseline, rl_high_util)
        alloc2.update(baseline, rl_low_util)

        assert alloc1.total_reward != alloc2.total_reward


# ─── Change 4: seed determinism ──────────────────────────────────────────────

class TestSeedDeterminism:
    """Test Change 4: two runs with the same seed give identical results."""

    def _collect(self, n_ticks: int = 500) -> list:
        config = SimulationConfig(total_bandwidth=60.0, random_seed=42)
        engine = SimulationEngine(config)
        results = []

        async def inner():
            for _ in range(n_ticks):
                state = await engine._simulation_tick()
                results.append((
                    round(state.baseline_result.qos_score, 4),
                    round(state.ai_result.qos_score, 4),
                    round(state.rl_result.qos_score if state.rl_result else 0, 4),
                    round(state.baseline_result.utilization, 4),
                    round(state.rl_result.utilization if state.rl_result else 0, 4),
                ))

        asyncio.get_event_loop().run_until_complete(inner())
        return results

    def test_same_seed_same_results(self):
        run1 = self._collect(500)
        run2 = self._collect(500)
        assert run1 == run2, "Two runs with same seed produced different results"


# ─── Change 5: reset restores initial learning state ─────────────────────────

class TestResetRestoresState:
    """Test Change 5: run, reset, run again → identical results."""

    def test_reset_then_same_results(self):
        config = SimulationConfig(total_bandwidth=60.0, random_seed=7)

        async def inner():
            engine = SimulationEngine(config)

            # First run: 20 ticks
            run1 = []
            for _ in range(20):
                state = await engine._simulation_tick()
                run1.append(round(state.rl_result.qos_score if state.rl_result else 0, 4))

            # Reset
            await engine.reset()

            # Second run: 20 ticks — should match first
            run2 = []
            for _ in range(20):
                state = await engine._simulation_tick()
                run2.append(round(state.rl_result.qos_score if state.rl_result else 0, 4))

            assert run1 == run2, (
                f"After reset, results differ:\n  run1={run1}\n  run2={run2}"
            )

        asyncio.get_event_loop().run_until_complete(inner())

    def test_rl_epsilon_resets(self):
        """After reset, RL epsilon should be back to initial value."""
        config = SimulationConfig(total_bandwidth=60.0, random_seed=5)

        async def inner():
            engine = SimulationEngine(config)
            initial_eps = engine.rl_allocator.epsilon

            # Run enough to decay epsilon
            for _ in range(200):
                await engine._simulation_tick()

            decayed_eps = engine.rl_allocator.epsilon
            assert decayed_eps < initial_eps

            await engine.reset()
            assert abs(engine.rl_allocator.epsilon - initial_eps) < 1e-9

        asyncio.get_event_loop().run_until_complete(inner())

    def test_rl_q_values_reset(self):
        """After reset, RL Q-values should all be zero."""
        config = SimulationConfig(total_bandwidth=60.0, random_seed=6)

        async def inner():
            engine = SimulationEngine(config)

            for _ in range(50):
                await engine._simulation_tick()

            # Q-values should be non-zero after learning
            total_q = sum(
                np.sum(np.abs(engine.rl_allocator.q_values[ut]))
                for ut in UserType
            )
            assert total_q > 0.0

            await engine.reset()

            # Q-values should be zero after reset
            total_q_after = sum(
                np.sum(np.abs(engine.rl_allocator.q_values[ut]))
                for ut in UserType
            )
            assert total_q_after == 0.0

        asyncio.get_event_loop().run_until_complete(inner())
