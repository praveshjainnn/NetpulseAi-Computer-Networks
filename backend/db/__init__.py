"""
Database module for Supabase PostgreSQL integration.

This module provides database client and repository layer for persisting
simulation history with graceful degradation when database is unavailable.
"""

from .client import SupabaseClient
from .repository import SimulationRepository

__all__ = ["SupabaseClient", "SimulationRepository"]
