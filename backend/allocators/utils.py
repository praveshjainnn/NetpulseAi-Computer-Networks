"""
Utility functions for bandwidth allocation strategies.

MODIFIED: 2026-10-09 — Added for AI-Based Intelligent Bandwidth Allocation
Using Reinforcement Learning project. Implements water-fill algorithm so that
AI and RL allocators can cap allocations at demand and redistribute spare
capacity (Change 3).
"""


from typing import Dict
from models import UserType


def waterfill(
    weights: Dict[UserType, float],
    demands: Dict[UserType, float],
    capacity: float
) -> Dict[UserType, float]:
    """
    Proportional water-fill allocation that caps each type at its demand.

    Algorithm:
      1. Distribute capacity proportionally to weights.
      2. Cap each type at its demand; collect leftover.
      3. Redistribute leftover proportionally among types still below demand.
      4. Repeat until no leftover or all demands satisfied.

    Args:
        weights:  Priority weight per UserType (must be > 0).
        demands:  Bandwidth demand per UserType in Mbps.
        capacity: Total available bandwidth in Mbps.

    Returns:
        Allocation dict; total ≤ capacity, each value ≤ demand[type].
    """
    # Work with remaining capacity and a mutable set of "unsatisfied" types
    remaining_capacity = capacity
    allocations: Dict[UserType, float] = {ut: 0.0 for ut in weights}
    satisfied: set = set()

    for _iteration in range(len(weights) + 1):  # at most N+1 passes
        # Types still waiting for allocation
        active = {ut: weights[ut] for ut in weights if ut not in satisfied}
        if not active or remaining_capacity <= 0:
            break

        total_weight = sum(active.values())
        leftover = 0.0

        for ut, w in active.items():
            proportion = w / total_weight
            candidate = remaining_capacity * proportion
            demand = demands.get(ut, 0.0)
            if candidate >= demand:
                allocations[ut] += demand
                leftover += candidate - demand
                satisfied.add(ut)
            else:
                allocations[ut] += candidate

        remaining_capacity = leftover

    # Rounding guard: ensure total never exceeds capacity
    total = sum(allocations.values())
    if total > capacity:
        # Trim the largest allocation by the excess
        max_ut = max(allocations, key=allocations.__getitem__)
        allocations[max_ut] = max(0.0, allocations[max_ut] - (total - capacity))

    # Round to 2 decimal places
    return {ut: round(v, 2) for ut, v in allocations.items()}
