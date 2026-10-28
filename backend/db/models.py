"""
Database models for Supabase persistence.

This module defines Pydantic models for database records and API responses.
These models are separate from the simulation models to allow for different
serialization formats and database-specific fields.
"""

from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class SimulationRunDB(BaseModel):
    """
    Database model for simulation_runs table.
    
    Represents a complete simulation execution with metadata and QoS metrics.
    """
    id: str = Field(description="UUID primary key")
    config: Dict = Field(description="Simulation configuration as JSONB")
    status: str = Field(description="Run status: running, completed, stopped")
    start_time: datetime = Field(description="Simulation start timestamp")
    end_time: Optional[datetime] = Field(default=None, description="Simulation end timestamp")
    total_ticks: int = Field(default=0, description="Total ticks executed")
    avg_baseline_qos: Optional[float] = Field(default=None, description="Average baseline QoS score")
    avg_ai_qos: Optional[float] = Field(default=None, description="Average AI QoS score")
    qos_improvement: Optional[float] = Field(default=None, description="QoS improvement percentage")


class TickSnapshotDB(BaseModel):
    """
    Database model for tick_snapshots table.
    
    Represents network state captured at a specific simulation tick.
    """
    id: str = Field(description="UUID primary key")
    run_id: str = Field(description="Foreign key to simulation_runs")
    tick: int = Field(description="Tick number")
    timestamp: datetime = Field(description="Tick timestamp")
    demands: Dict = Field(description="Traffic demands as JSONB")
    baseline_result: Dict = Field(description="Baseline allocation result as JSONB")
    ai_result: Dict = Field(description="AI allocation result as JSONB")
    congestion_level: float = Field(description="Congestion level (0.0-1.0)")


class GroqDecisionDB(BaseModel):
    """
    Database model for groq_decisions table.
    
    Represents an AI-generated strategic recommendation from Groq.
    """
    id: str = Field(description="UUID primary key")
    run_id: str = Field(description="Foreign key to simulation_runs")
    tick: int = Field(description="Tick number when decision was made")
    timestamp: datetime = Field(description="Decision timestamp")
    reasoning: str = Field(description="Natural language explanation")
    recommended_weights: Dict[str, float] = Field(description="Recommended priority weights")


class SimulationRunSummary(BaseModel):
    """
    API response model for simulation run summary.
    
    Used in the history list endpoint to provide overview of past runs.
    """
    run_id: str = Field(description="Run UUID")
    start_time: datetime = Field(description="Start timestamp")
    end_time: Optional[datetime] = Field(default=None, description="End timestamp")
    duration_seconds: Optional[float] = Field(default=None, description="Run duration in seconds")
    total_ticks: int = Field(description="Total ticks executed")
    status: str = Field(description="Run status")
    avg_baseline_qos: Optional[float] = Field(default=None, description="Average baseline QoS")
    avg_ai_qos: Optional[float] = Field(default=None, description="Average AI QoS")
    qos_improvement: Optional[float] = Field(default=None, description="QoS improvement %")
    config_summary: Dict = Field(description="Simplified config for display")


class SimulationRunDetail(BaseModel):
    """
    API response model for detailed simulation run.
    
    Used in the single run endpoint to provide complete run information
    including all AI decisions.
    """
    run_id: str = Field(description="Run UUID")
    config: Dict = Field(description="Complete simulation configuration")
    status: str = Field(description="Run status")
    start_time: datetime = Field(description="Start timestamp")
    end_time: Optional[datetime] = Field(default=None, description="End timestamp")
    total_ticks: int = Field(description="Total ticks executed")
    avg_baseline_qos: Optional[float] = Field(default=None, description="Average baseline QoS")
    avg_ai_qos: Optional[float] = Field(default=None, description="Average AI QoS")
    qos_improvement: Optional[float] = Field(default=None, description="QoS improvement %")
    groq_decisions: List[Dict] = Field(default_factory=list, description="List of AI decisions")
