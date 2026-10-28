"""
Traffic generation system for AI-Based 5G Digital Twin Network Simulator.

This module implements realistic traffic pattern generators for four distinct
5G user types: video streaming, online gaming, IoT devices, and VoIP/messaging.
Each generator produces statistically varied traffic demands across simulation ticks.
"""

import random
import time
from abc import ABC, abstractmethod
from typing import Optional

from models import TrafficDemand, UserType


class TrafficGenerator(ABC):
    """
    Abstract base class for user type traffic generation.
    
    Each concrete generator implements realistic traffic patterns for a specific
    5G user type, producing TrafficDemand objects with appropriate bandwidth,
    latency sensitivity, and packet characteristics.
    """
    
    def __init__(self, random_seed: Optional[int] = None):
        """
        Initialize traffic generator.
        
        Args:
            random_seed: Optional seed for reproducible random number generation.
                        If None, uses system time for non-deterministic behavior.
        """
        self.random_seed = random_seed
        self._rng = random.Random(random_seed)
    
    @abstractmethod
    def generate_demand(self, tick: int) -> TrafficDemand:
        """
        Generate traffic demand for the current simulation tick.
        
        Args:
            tick: Current simulation tick number.
            
        Returns:
            TrafficDemand object with bandwidth, latency sensitivity, and packet count.
        """
        pass
    
    def _get_timestamp(self) -> float:
        """Get current wall clock timestamp."""
        return time.time()


class VideoStreamingGenerator(TrafficGenerator):
    """
    Video streaming traffic generator.
    
    Characteristics:
    - High bandwidth demand: 5-25 Mbps
    - Moderate latency tolerance (latency_sensitivity: 0.4-0.6)
    - Moderate packet count: 50-200 packets per tick
    - Represents Netflix, YouTube, streaming services
    """
    
    def generate_demand(self, tick: int) -> TrafficDemand:
        """
        Generate video streaming traffic demand.
        
        Video streaming has high bandwidth requirements with some variance
        based on video quality (SD/HD/4K) and encoding efficiency.
        Latency is important but not critical.
        """
        # Bandwidth varies based on video quality and scene complexity
        bandwidth_demand = self._rng.uniform(5.0, 25.0)
        
        # Moderate latency sensitivity (buffering helps tolerate some latency)
        latency_sensitivity = self._rng.uniform(0.4, 0.6)
        
        # Moderate packet count (larger packets for video frames)
        packet_count = self._rng.randint(50, 200)
        
        return TrafficDemand(
            user_type=UserType.VIDEO_STREAMING,
            bandwidth_demand=round(bandwidth_demand, 2),
            latency_sensitivity=round(latency_sensitivity, 2),
            packet_count=packet_count,
            timestamp=self._get_timestamp()
        )


class OnlineGamingGenerator(TrafficGenerator):
    """
    Online gaming traffic generator.
    
    Characteristics:
    - Moderate bandwidth demand: 1-5 Mbps
    - Ultra-low latency requirement (latency_sensitivity: 0.85-0.95)
    - Low to moderate packet count: 20-100 packets per tick
    - Represents multiplayer games, cloud gaming, esports
    """
    
    def generate_demand(self, tick: int) -> TrafficDemand:
        """
        Generate online gaming traffic demand.
        
        Gaming requires low bandwidth but extremely low latency for
        responsive gameplay. Any latency above 20ms degrades experience.
        """
        # Moderate bandwidth (game state updates, voice chat)
        bandwidth_demand = self._rng.uniform(1.0, 5.0)
        
        # Ultra-low latency requirement (critical for gameplay)
        latency_sensitivity = self._rng.uniform(0.85, 0.95)
        
        # Frequent small packets for real-time updates
        packet_count = self._rng.randint(20, 100)
        
        return TrafficDemand(
            user_type=UserType.ONLINE_GAMING,
            bandwidth_demand=round(bandwidth_demand, 2),
            latency_sensitivity=round(latency_sensitivity, 2),
            packet_count=packet_count,
            timestamp=self._get_timestamp()
        )


class IoTDeviceGenerator(TrafficGenerator):
    """
    IoT device traffic generator.
    
    Characteristics:
    - Very low bandwidth demand: 0.1-1.0 Mbps
    - High latency tolerance (latency_sensitivity: 0.1-0.3)
    - Many small packets: 100-500 packets per tick
    - Represents sensors, smart home devices, industrial IoT
    """
    
    def generate_demand(self, tick: int) -> TrafficDemand:
        """
        Generate IoT device traffic demand.
        
        IoT devices send many small sensor readings and telemetry data.
        Bandwidth is minimal and latency tolerance is high (seconds acceptable).
        """
        # Very low bandwidth (small sensor data packets)
        bandwidth_demand = self._rng.uniform(0.1, 1.0)
        
        # High latency tolerance (non-real-time data)
        latency_sensitivity = self._rng.uniform(0.1, 0.3)
        
        # Many small packets (frequent sensor readings)
        packet_count = self._rng.randint(100, 500)
        
        return TrafficDemand(
            user_type=UserType.IOT_DEVICES,
            bandwidth_demand=round(bandwidth_demand, 2),
            latency_sensitivity=round(latency_sensitivity, 2),
            packet_count=packet_count,
            timestamp=self._get_timestamp()
        )


class VoIPMessagingGenerator(TrafficGenerator):
    """
    VoIP and messaging traffic generator.
    
    Characteristics:
    - Low to moderate bandwidth demand: 0.5-3.0 Mbps
    - Low latency requirement (latency_sensitivity: 0.65-0.80)
    - Bursty packet patterns: 10-150 packets per tick
    - Represents voice calls, video calls, instant messaging
    """
    
    def generate_demand(self, tick: int) -> TrafficDemand:
        """
        Generate VoIP/messaging traffic demand.
        
        VoIP has bursty patterns (speaking vs silence) with real-time
        requirements. Latency above 50ms causes noticeable call quality issues.
        """
        # Bursty bandwidth (varies with voice activity, message frequency)
        # Lower values during silence, higher during active conversation
        bandwidth_demand = self._rng.uniform(0.5, 3.0)
        
        # Low latency requirement (real-time communication)
        latency_sensitivity = self._rng.uniform(0.65, 0.80)
        
        # Bursty packet count (depends on voice activity)
        packet_count = self._rng.randint(10, 150)
        
        return TrafficDemand(
            user_type=UserType.VOIP_MESSAGING,
            bandwidth_demand=round(bandwidth_demand, 2),
            latency_sensitivity=round(latency_sensitivity, 2),
            packet_count=packet_count,
            timestamp=self._get_timestamp()
        )
