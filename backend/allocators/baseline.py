"""
Baseline allocator for AI-Based 5G Digital Twin Network Simulator.

This module implements a simple equal-split allocation strategy that serves
as the control group for comparing against the AI-powered allocator.
"""

import time
from typing import Dict

from models import UserType, TrafficDemand, AllocationDecision


class BaselineAllocator:
    """
    Simple equal-split bandwidth allocation strategy.
    
    Divides available bandwidth equally among all four user types without
    considering traffic characteristics, latency requirements, or QoS optimization.
    This deterministic approach serves as the baseline for performance comparison.
    
    Characteristics:
    - Deterministic: Same inputs always produce same outputs
    - Fast: Completes allocation in <10ms
    - Fair: Equal bandwidth for all user types
    - Simple: No prioritization or optimization logic
    """
    
    def __init__(self):
        """Initialize baseline allocator."""
        self.strategy_name = "Baseline Equal-Split"
    
    def allocate(
        self,
        total_bandwidth: float,
        demands: Dict[UserType, TrafficDemand]
    ) -> AllocationDecision:
        """
        Allocate bandwidth equally across all user types.
        
        This method divides the total available bandwidth into four equal parts,
        one for each user type, regardless of their actual demand or characteristics.
        
        Args:
            total_bandwidth: Total available bandwidth in Mbps.
            demands: Dictionary mapping UserType to TrafficDemand for current tick.
                    (Not used in baseline strategy, but included for interface consistency)
        
        Returns:
            AllocationDecision with equal bandwidth allocation for all user types.
            
        Performance:
            Execution time: <10ms per allocation (typically <1ms)
        
        Example:
            >>> allocator = BaselineAllocator()
            >>> demands = {user_type: traffic_demand for user_type in UserType}
            >>> decision = allocator.allocate(100.0, demands)
            >>> decision.allocations[UserType.VIDEO_STREAMING]
            25.0
        """
        # Simple equal split: divide by number of user types
        bandwidth_per_type = total_bandwidth / len(UserType)
        
        # Create allocation dictionary with equal bandwidth for each type
        allocations = {
            user_type: bandwidth_per_type
            for user_type in UserType
        }
        
        # Calculate total allocated (should equal total_bandwidth)
        total_allocated = sum(allocations.values())
        
        return AllocationDecision(
            allocations=allocations,
            total_allocated=total_allocated,
            strategy_name=self.strategy_name,
            timestamp=time.time()
        )
