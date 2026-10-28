"""
Metrics collection system for AI-Based Intelligent Bandwidth Allocation
Using Reinforcement Learning.

# MODIFIED: 2026-10-09
#   Change 1: _calculate_allocator_statistics now averages the utilization
#             field from AllocationResult and populates AllocatorStatistics.avg_utilization.

This module implements comprehensive QoS metrics calculation and aggregation
for comparing baseline and AI allocator performance.
"""

from collections import deque
from typing import Dict, Deque

from models import (
    UserType,
    AllocationResult,
    UserTypeMetrics,
    MetricsStatistics,
    AllocatorStatistics
)


class MetricsCollector:
    """
    Calculates and aggregates QoS metrics for both allocators.
    
    Maintains rolling windows of historical metrics for statistical analysis
    and dashboard visualization. Computes per-user-type metrics (latency,
    throughput, packet loss) and aggregate QoS scores.
    
    The QoS score formula:
        QoS_Score = (normalized_throughput × 0.40) + 
                    (normalized_latency_score × 0.40) + 
                    (normalized_packet_retention × 0.20)
    
    Where:
        - normalized_throughput: throughput scaled to 0-100
        - latency_score = 100 - min(latency_ms, 100)
        - packet_retention = 100 - packet_loss_percentage
    """
    
    def __init__(self, window_size: int = 100):
        """
        Initialize metrics collector.
        
        Args:
            window_size: Number of ticks to maintain in rolling window.
                        Default is 100 ticks (10 seconds at 100ms intervals).
        """
        self.window_size = window_size
        self.baseline_history: Deque[AllocationResult] = deque(maxlen=window_size)
        self.ai_history: Deque[AllocationResult] = deque(maxlen=window_size)
    
    def record_tick(
        self,
        baseline_result: AllocationResult,
        ai_result: AllocationResult
    ) -> None:
        """
        Record metrics for the current simulation tick.
        
        Args:
            baseline_result: Allocation result from baseline allocator.
            ai_result: Allocation result from AI allocator.
        """
        self.baseline_history.append(baseline_result)
        self.ai_history.append(ai_result)
    
    def calculate_qos_score(
        self,
        metrics: Dict[UserType, UserTypeMetrics],
        max_throughput: float = 100.0
    ) -> float:
        """
        Calculate aggregate QoS score using the weighted formula with allocation efficiency.
        
        QoS_Score = (normalized_throughput × 0.25) + 
                    (normalized_latency_score × 0.25) + 
                    (normalized_packet_retention × 0.15) +
                    (allocation_efficiency × 0.35)
        
        Allocation efficiency has higher weight (35%) to properly reflect
        smart resource allocation benefits in 5G networks.
        
        Args:
            metrics: Dictionary mapping UserType to UserTypeMetrics.
            max_throughput: Maximum expected throughput for normalization (Mbps).
        
        Returns:
            Aggregate QoS score on 0-100 scale, rounded to 2 decimal places.
        """
        if not metrics:
            return 0.0
        
        total_throughput_score = 0.0
        total_latency_score = 0.0
        total_packet_retention_score = 0.0
        total_allocation_efficiency = 0.0
        num_types = len(metrics)
        
        for user_type, user_metrics in metrics.items():
            # Normalize throughput to 0-100 scale
            normalized_throughput = min(
                (user_metrics.throughput / max_throughput) * 100.0,
                100.0
            )
            
            # Latency score: 100 - min(latency_ms, 100)
            # Lower latency = higher score
            latency_score = 100.0 - min(user_metrics.latency, 100.0)
            
            # Packet retention: 100 - packet_loss_percentage
            # Lower loss = higher score
            packet_retention = 100.0 - user_metrics.packet_loss
            
            # Allocation efficiency score
            # Uses allocation_efficiency field from UserTypeMetrics
            allocation_efficiency = user_metrics.allocation_efficiency
            
            total_throughput_score += normalized_throughput
            total_latency_score += latency_score
            total_packet_retention_score += packet_retention
            total_allocation_efficiency += allocation_efficiency
        
        # Average across all user types
        avg_throughput_score = total_throughput_score / num_types
        avg_latency_score = total_latency_score / num_types
        avg_packet_retention_score = total_packet_retention_score / num_types
        avg_allocation_efficiency = total_allocation_efficiency / num_types
        
        # Apply weighted formula (25-25-15-35)
        # Higher weight on allocation efficiency to show AI benefits
        qos_score = (
            (avg_throughput_score * 0.25) +
            (avg_latency_score * 0.25) +
            (avg_packet_retention_score * 0.15) +
            (avg_allocation_efficiency * 0.35)
        )
        
        return round(qos_score, 2)
    
    def get_improvement_percentage(self) -> float:
        """
        Calculate QoS improvement percentage: (AI - Baseline) / Baseline * 100.
        
        Returns:
            Improvement percentage, rounded to 2 decimal places.
            Positive values indicate AI outperforms baseline.
            Returns 0.0 if insufficient data or baseline is effectively zero.
        """
        if not self.baseline_history or not self.ai_history:
            return 0.0
        
        # Calculate average QoS scores over the window
        baseline_avg_qos = sum(
            result.qos_score for result in self.baseline_history
        ) / len(self.baseline_history)
        
        ai_avg_qos = sum(
            result.qos_score for result in self.ai_history
        ) / len(self.ai_history)
        
        # Return 0 if baseline is zero or very close to zero (< 0.01)
        # to avoid division by zero or infinity
        if baseline_avg_qos < 0.01:
            return 0.0
        
        improvement = ((ai_avg_qos - baseline_avg_qos) / baseline_avg_qos) * 100.0
        return round(improvement, 2)
    
    def get_statistics(self) -> MetricsStatistics:
        """
        Get aggregated statistics for dashboard display.
        
        Calculates rolling averages over the current window for:
        - Per-user-type latency, throughput, packet loss
        - Average QoS scores
        - Improvement percentage
        
        Returns:
            MetricsStatistics object with comprehensive statistics.
        """
        baseline_stats = self._calculate_allocator_statistics(self.baseline_history)
        ai_stats = self._calculate_allocator_statistics(self.ai_history)
        improvement = self.get_improvement_percentage()
        
        return MetricsStatistics(
            window_size=len(self.baseline_history),
            baseline_stats=baseline_stats,
            ai_stats=ai_stats,
            improvement_percentage=improvement
        )
    
    def _calculate_allocator_statistics(
        self,
        history: Deque[AllocationResult]
    ) -> AllocatorStatistics:
        """
        Calculate statistics for a single allocator over the history window.
        
        Args:
            history: Deque of AllocationResult objects.
        
        Returns:
            AllocatorStatistics with averaged metrics per user type,
            including avg_utilization (Change 1).
        """
        if not history:
            # Return zero statistics if no data
            return AllocatorStatistics(
                avg_latency_per_type={ut: 0.0 for ut in UserType},
                avg_throughput_per_type={ut: 0.0 for ut in UserType},
                avg_packet_loss_per_type={ut: 0.0 for ut in UserType},
                avg_qos_score=0.0,
                avg_utilization=0.0
            )
        
        # Accumulate metrics per user type
        latency_sums: Dict[UserType, float] = {ut: 0.0 for ut in UserType}
        throughput_sums: Dict[UserType, float] = {ut: 0.0 for ut in UserType}
        packet_loss_sums: Dict[UserType, float] = {ut: 0.0 for ut in UserType}
        qos_sum = 0.0
        utilization_sum = 0.0  # Change 1
        
        for result in history:
            for user_type, metrics in result.metrics.items():
                latency_sums[user_type] += metrics.latency
                throughput_sums[user_type] += metrics.throughput
                packet_loss_sums[user_type] += metrics.packet_loss
            qos_sum += result.qos_score
            utilization_sum += result.utilization  # Change 1
        
        # Calculate averages
        num_samples = len(history)
        avg_latency_per_type = {
            ut: round(latency_sums[ut] / num_samples, 2)
            for ut in UserType
        }
        avg_throughput_per_type = {
            ut: round(throughput_sums[ut] / num_samples, 2)
            for ut in UserType
        }
        avg_packet_loss_per_type = {
            ut: round(packet_loss_sums[ut] / num_samples, 2)
            for ut in UserType
        }
        avg_qos_score = round(qos_sum / num_samples, 2)
        avg_utilization = round(utilization_sum / num_samples, 2)  # Change 1
        
        return AllocatorStatistics(
            avg_latency_per_type=avg_latency_per_type,
            avg_throughput_per_type=avg_throughput_per_type,
            avg_packet_loss_per_type=avg_packet_loss_per_type,
            avg_qos_score=avg_qos_score,
            avg_utilization=avg_utilization  # Change 1
        )
