"""
Simulation repository for database CRUD operations.

This module provides the data access layer for simulation history persistence.
All methods handle errors gracefully and return None/False/empty results when
database is disabled or operations fail.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import SimulationConfig, UserType, TrafficDemand, AllocationResult
from .client import SupabaseClient

logger = logging.getLogger(__name__)


class SimulationRepository:
    """
    Repository for simulation history CRUD operations.
    
    Provides methods for creating, updating, querying, and deleting simulation
    runs, tick snapshots, and Groq decisions. All operations are fail-safe and
    return appropriate values when database is disabled or errors occur.
    """
    
    def __init__(self, supabase_client: SupabaseClient):
        """
        Initialize repository with Supabase client.
        
        Args:
            supabase_client: SupabaseClient instance for database access
        """
        self.client = supabase_client
    
    async def create_run(self, config: SimulationConfig) -> Optional[str]:
        """
        Create a new simulation run record.
        
        Args:
            config: Simulation configuration
            
        Returns:
            Run UUID if successful, None if database disabled or operation fails
        """
        if not self.client.is_connected:
            return None
        
        try:
            # Convert config to dict for JSONB storage
            config_dict = config.model_dump()
            
            # Insert new run
            result = self.client.client.table("simulation_runs").insert({
                "config": config_dict,
                "status": "running",
                "start_time": datetime.now().isoformat(),
                "total_ticks": 0
            }).execute()
            
            if result.data and len(result.data) > 0:
                run_id = result.data[0]["id"]
                logger.info(f"Created simulation run: {run_id}")
                return run_id
            else:
                logger.error("Failed to create run: no data returned")
                return None
                
        except Exception as e:
            logger.error(f"Failed to create simulation run: {e}")
            return None
    
    async def update_run(
        self,
        run_id: str,
        status: str,
        end_time: datetime,
        total_ticks: int,
        avg_baseline_qos: float,
        avg_ai_qos: float,
        qos_improvement: float
    ) -> bool:
        """
        Update simulation run with final statistics.
        
        Args:
            run_id: Run UUID
            status: Final status (completed, stopped)
            end_time: End timestamp
            total_ticks: Total ticks executed
            avg_baseline_qos: Average baseline QoS score
            avg_ai_qos: Average AI QoS score
            qos_improvement: QoS improvement percentage
            
        Returns:
            True if successful, False if database disabled or operation fails
        """
        if not self.client.is_connected:
            return False
        
        try:
            result = self.client.client.table("simulation_runs").update({
                "status": status,
                "end_time": end_time.isoformat(),
                "total_ticks": total_ticks,
                "avg_baseline_qos": avg_baseline_qos,
                "avg_ai_qos": avg_ai_qos,
                "qos_improvement": qos_improvement
            }).eq("id", run_id).execute()
            
            if result.data:
                logger.info(f"Updated run {run_id}: status={status}, ticks={total_ticks}")
                return True
            else:
                logger.error(f"Failed to update run {run_id}: no data returned")
                return False
                
        except Exception as e:
            logger.error(f"Failed to update run {run_id}: {e}")
            return False
    
    async def save_snapshot(
        self,
        run_id: str,
        tick: int,
        timestamp: datetime,
        demands: Dict[UserType, TrafficDemand],
        baseline_result: AllocationResult,
        ai_result: AllocationResult,
        congestion_level: float
    ) -> bool:
        """
        Save a tick snapshot to the database.
        
        Args:
            run_id: Run UUID
            tick: Tick number
            timestamp: Tick timestamp
            demands: Traffic demands by user type
            baseline_result: Baseline allocation result
            ai_result: AI allocation result
            congestion_level: Congestion level (0.0-1.0)
            
        Returns:
            True if successful, False if database disabled or operation fails
        """
        if not self.client.is_connected:
            return False
        
        try:
            # Validate tick number
            if tick < 0:
                logger.error(f"Invalid tick number: {tick}")
                return False
            
            # Convert demands to dict with string keys for JSONB
            demands_dict = {
                user_type.value: demand.model_dump()
                for user_type, demand in demands.items()
            }
            
            # Convert allocation results to dict
            baseline_dict = baseline_result.model_dump()
            ai_dict = ai_result.model_dump()
            
            # Insert snapshot
            result = self.client.client.table("tick_snapshots").insert({
                "run_id": run_id,
                "tick": tick,
                "timestamp": timestamp.isoformat(),
                "demands": demands_dict,
                "baseline_result": baseline_dict,
                "ai_result": ai_dict,
                "congestion_level": congestion_level
            }).execute()
            
            if result.data:
                return True
            else:
                logger.error(f"Failed to save snapshot for run {run_id} tick {tick}: no data returned")
                return False
                
        except Exception as e:
            logger.error(f"Failed to save snapshot for run {run_id} tick {tick}: {e}")
            return False
    
    async def save_groq_decision(
        self,
        run_id: str,
        tick: int,
        timestamp: datetime,
        reasoning: str,
        recommended_weights: Dict[UserType, float]
    ) -> bool:
        """
        Save a Groq AI decision to the database.
        
        Args:
            run_id: Run UUID
            tick: Tick number when decision was made
            timestamp: Decision timestamp
            reasoning: Natural language explanation
            recommended_weights: Recommended priority weights by user type
            
        Returns:
            True if successful, False if database disabled or operation fails
        """
        if not self.client.is_connected:
            return False
        
        try:
            # Convert weights to dict with string keys for JSONB
            weights_dict = {
                user_type.value: weight
                for user_type, weight in recommended_weights.items()
            }
            
            # Insert decision
            result = self.client.client.table("groq_decisions").insert({
                "run_id": run_id,
                "tick": tick,
                "timestamp": timestamp.isoformat(),
                "reasoning": reasoning,
                "recommended_weights": weights_dict
            }).execute()
            
            if result.data:
                return True
            else:
                logger.error(f"Failed to save Groq decision for run {run_id} tick {tick}: no data returned")
                return False
                
        except Exception as e:
            logger.error(f"Failed to save Groq decision for run {run_id} tick {tick}: {e}")
            return False
    
    async def get_runs(self, limit: int = 20) -> List[Dict]:
        """
        Get recent simulation runs ordered by start time descending.
        
        Args:
            limit: Maximum number of runs to return (default 20)
            
        Returns:
            List of run dictionaries, empty list if database disabled or operation fails
        """
        if not self.client.is_connected:
            return []
        
        try:
            result = self.client.client.table("simulation_runs") \
                .select("*") \
                .order("start_time", desc=True) \
                .limit(limit) \
                .execute()
            
            if result.data:
                return result.data
            else:
                return []
                
        except Exception as e:
            logger.error(f"Failed to get runs: {e}")
            return []
    
    async def get_all_runs(
        self,
        page: int = 1,
        limit: int = 20,
        sort: str = "desc"
    ) -> Dict:
        """
        Get paginated simulation runs.
        
        Args:
            page: Page number (1-indexed)
            limit: Items per page
            sort: Sort order "asc" or "desc" by start_time
            
        Returns:
            Dictionary with:
            - runs: List of run dictionaries for current page
            - total: Total number of runs
            - page: Current page number
            - limit: Items per page
            - total_pages: Total number of pages
            - has_next: Whether there is a next page
            - has_prev: Whether there is a previous page
        """
        if not self.client.is_connected:
            return {
                "runs": [],
                "total": 0,
                "page": page,
                "limit": limit,
                "total_pages": 0,
                "has_next": False,
                "has_prev": False
            }
        
        try:
            # Get total count
            count_result = self.client.client.table("simulation_runs") \
                .select("*", count="exact") \
                .execute()
            
            total = count_result.count if count_result.count is not None else 0
            
            # Calculate pagination
            total_pages = (total + limit - 1) // limit if total > 0 else 0
            has_next = page < total_pages
            has_prev = page > 1
            
            # Calculate offset
            offset = (page - 1) * limit
            
            # Get paginated data using range
            result = self.client.client.table("simulation_runs") \
                .select("*") \
                .order("start_time", desc=(sort == "desc")) \
                .range(offset, offset + limit - 1) \
                .execute()
            
            runs = result.data if result.data else []
            
            return {
                "runs": runs,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": total_pages,
                "has_next": has_next,
                "has_prev": has_prev
            }
                
        except Exception as e:
            logger.error(f"Failed to get paginated runs: {e}")
            return {
                "runs": [],
                "total": 0,
                "page": page,
                "limit": limit,
                "total_pages": 0,
                "has_next": False,
                "has_prev": False
            }
    
    async def get_run_by_id(self, run_id: str) -> Optional[Dict]:
        """
        Get a single simulation run with associated Groq decisions.
        
        Args:
            run_id: Run UUID
            
        Returns:
            Run dictionary with groq_decisions field, None if not found or database disabled
        """
        if not self.client.is_connected:
            return None
        
        try:
            # Get run
            run_result = self.client.client.table("simulation_runs") \
                .select("*") \
                .eq("id", run_id) \
                .execute()
            
            if not run_result.data or len(run_result.data) == 0:
                return None
            
            run = run_result.data[0]
            
            # Get associated Groq decisions
            decisions_result = self.client.client.table("groq_decisions") \
                .select("*") \
                .eq("run_id", run_id) \
                .order("tick", desc=False) \
                .execute()
            
            run["groq_decisions"] = decisions_result.data if decisions_result.data else []
            
            return run
            
        except Exception as e:
            logger.error(f"Failed to get run {run_id}: {e}")
            return None
    
    async def get_snapshots(self, run_id: str) -> List[Dict]:
        """
        Get all tick snapshots for a simulation run ordered by tick ascending.
        
        Args:
            run_id: Run UUID
            
        Returns:
            List of snapshot dictionaries, empty list if database disabled or operation fails
        """
        if not self.client.is_connected:
            return []
        
        try:
            result = self.client.client.table("tick_snapshots") \
                .select("*") \
                .eq("run_id", run_id) \
                .order("tick", desc=False) \
                .execute()
            
            if result.data:
                return result.data
            else:
                return []
                
        except Exception as e:
            logger.error(f"Failed to get snapshots for run {run_id}: {e}")
            return []
    
    async def delete_run(self, run_id: str) -> bool:
        """
        Delete a simulation run and all associated data.
        
        Cascades to tick_snapshots and groq_decisions via foreign key constraints.
        
        Args:
            run_id: Run UUID
            
        Returns:
            True if successful, False if not found, database disabled, or operation fails
        """
        if not self.client.is_connected:
            return False
        
        try:
            result = self.client.client.table("simulation_runs") \
                .delete() \
                .eq("id", run_id) \
                .execute()
            
            if result.data and len(result.data) > 0:
                logger.info(f"Deleted run {run_id} and associated data")
                return True
            else:
                logger.warning(f"Run {run_id} not found for deletion")
                return False
                
        except Exception as e:
            logger.error(f"Failed to delete run {run_id}: {e}")
            return False
