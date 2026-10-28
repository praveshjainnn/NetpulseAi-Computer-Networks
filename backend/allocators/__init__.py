"""
Allocators package for AI-Based 5G Digital Twin Network Simulator.

This package contains bandwidth allocation strategies including the baseline
equal-split allocator and the AI-powered weighted priority allocator.
"""

from allocators.baseline import BaselineAllocator
from allocators.ai_allocator import AIAllocator

__all__ = [
    'BaselineAllocator',
    'AIAllocator',
]
