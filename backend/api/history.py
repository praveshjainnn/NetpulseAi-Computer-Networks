"""
History API routes for simulation history management.

This module implements FastAPI REST endpoints and WebSocket for retrieving,
exporting, replaying, and managing simulation history stored in Supabase.
"""

import asyncio
import csv
import io
import json
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, WebSocket, Query, Response
from fastapi.responses import StreamingResponse

from models import UserType
from db.repository import SimulationRepository

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/history", tags=["history"])

# Injected repository instance
repository: Optional[SimulationRepository] = None


def set_repository(repo: SimulationRepository):
    """
    Set repository instance for dependency injection.
    
    Args:
        repo: SimulationRepository instance to use for database operations
    """
    global repository
    repository = repo



@router.get("/")
async def list_runs(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    sort: str = Query(default="desc", pattern="^(asc|desc)$", description="Sort order by created_at")
):
    """
    List simulation runs with pagination.
    
    Returns paginated simulation runs ordered by start_time.
    Includes run_id, config summary, status, timestamps, ticks, and QoS metrics.
    
    Args:
        page: Page number (1-indexed), default 1, min 1
        limit: Items per page, default 20, min 1, max 100
        sort: Sort order "asc" or "desc" by start_time, default "desc"
    
    Returns:
        Dictionary with:
        - runs: Array of run summaries for current page
        - total: Total number of runs
        - page: Current page number
        - limit: Items per page
        - total_pages: Total number of pages
        - has_next: Whether there is a next page
        - has_prev: Whether there is a previous page
        
    Raises:
        HTTPException 503: When database is not configured
    """
    if not repository or not repository.client.is_connected:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )
    
    # Get paginated runs
    result = await repository.get_all_runs(page=page, limit=limit, sort=sort)
    
    # Transform runs to include config summary
    transformed_runs = []
    for run in result["runs"]:
        config = run.get("config", {})
        transformed_run = {
            "run_id": run["id"],
            "start_time": run["start_time"],
            "end_time": run.get("end_time"),
            "status": run["status"],
            "total_ticks": run.get("total_ticks", 0),
            "avg_baseline_qos": run.get("avg_baseline_qos"),
            "avg_ai_qos": run.get("avg_ai_qos"),
            "qos_improvement": run.get("qos_improvement"),
            "config_summary": {
                "total_bandwidth": config.get("total_bandwidth"),
                "base_latency": config.get("base_latency"),
                "congestion_factor": config.get("congestion_factor"),
                "packet_loss_rate": config.get("packet_loss_rate")
            }
        }
        transformed_runs.append(transformed_run)
    
    return {
        "runs": transformed_runs,
        "total": result["total"],
        "page": result["page"],
        "limit": result["limit"],
        "total_pages": result["total_pages"],
        "has_next": result["has_next"],
        "has_prev": result["has_prev"]
    }



@router.get("/{run_id}")
async def get_run(run_id: str):
    """
    Get a single simulation run with associated Groq decisions.
    
    Args:
        run_id: UUID of the simulation run
        
    Returns:
        Run dictionary with all metadata and groq_decisions array
        
    Raises:
        HTTPException 400: Invalid UUID format
        HTTPException 404: When run_id does not exist
        HTTPException 503: When database is not configured
    """
    # Validate UUID format
    from uuid import UUID
    try:
        UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run_id format. Must be a valid UUID.")
    
    if not repository or not repository.client.is_connected:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )
    
    run = await repository.get_run_by_id(run_id)
    
    if not run:
        raise HTTPException(
            status_code=404,
            detail="Run not found"
        )
    
    return run



@router.delete("/{run_id}")
async def delete_run(run_id: str):
    """
    Delete a simulation run and all associated data.
    
    Deletes the run record which cascades to tick_snapshots and groq_decisions
    via foreign key constraints.
    
    Args:
        run_id: UUID of the simulation run
        
    Returns:
        Success message
        
    Raises:
        HTTPException 404: When run_id does not exist
        HTTPException 503: When database is not configured
    """
    if not repository or not repository.client.is_connected:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )
    
    success = await repository.delete_run(run_id)
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Run not found"
        )
    
    return {"message": "Run deleted successfully"}



def _transform_snapshot_to_state(snapshot: dict) -> dict:
    """
    Transform database snapshot to NetworkState JSON format.
    
    Converts JSONB fields back to proper structure matching NetworkState model.
    
    Args:
        snapshot: Database snapshot dictionary
        
    Returns:
        Dictionary in NetworkState format
    """
    return {
        "tick": snapshot["tick"],
        "timestamp": snapshot["timestamp"],
        "demands": snapshot["demands"],
        "baseline_result": snapshot["baseline_result"],
        "ai_result": snapshot["ai_result"],
        "congestion_level": snapshot["congestion_level"]
    }


def _generate_csv(snapshots: list) -> str:
    """
    Generate CSV from snapshots with flattened metrics columns.
    
    Creates CSV with one row per user_type per snapshot, with columns:
    tick, timestamp, user_type, baseline_allocation, ai_allocation,
    baseline_latency, ai_latency, baseline_throughput, ai_throughput,
    baseline_packet_loss, ai_packet_loss, congestion_level
    
    Args:
        snapshots: List of snapshot dictionaries from database
        
    Returns:
        CSV content as string
    """
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "tick",
        "timestamp",
        "user_type",
        "baseline_allocation",
        "ai_allocation",
        "baseline_latency",
        "ai_latency",
        "baseline_throughput",
        "ai_throughput",
        "baseline_packet_loss",
        "ai_packet_loss",
        "congestion_level"
    ])
    
    # Write data rows - one row per user type per snapshot
    for snapshot in snapshots:
        tick = snapshot["tick"]
        timestamp = snapshot["timestamp"]
        congestion = snapshot["congestion_level"]
        
        baseline_result = snapshot["baseline_result"]
        ai_result = snapshot["ai_result"]
        
        baseline_allocations = baseline_result["decision"]["allocations"]
        ai_allocations = ai_result["decision"]["allocations"]
        
        baseline_metrics = baseline_result["metrics"]
        ai_metrics = ai_result["metrics"]
        
        # Create row for each user type
        for user_type in UserType:
            user_type_str = user_type.value
            
            writer.writerow([
                tick,
                timestamp,
                user_type_str,
                baseline_allocations.get(user_type_str, 0.0),
                ai_allocations.get(user_type_str, 0.0),
                baseline_metrics.get(user_type_str, {}).get("latency", 0.0),
                ai_metrics.get(user_type_str, {}).get("latency", 0.0),
                baseline_metrics.get(user_type_str, {}).get("throughput", 0.0),
                ai_metrics.get(user_type_str, {}).get("throughput", 0.0),
                baseline_metrics.get(user_type_str, {}).get("packet_loss", 0.0),
                ai_metrics.get(user_type_str, {}).get("packet_loss", 0.0),
                congestion
            ])
    
    return output.getvalue()


@router.get("/{run_id}/export")
async def export_run(run_id: str, format: str = Query(...)):
    """
    Export simulation run data in CSV or JSON format.
    
    Args:
        run_id: UUID of the simulation run
        format: Export format - "csv" or "json"
        
    Returns:
        File download response with appropriate Content-Type and Content-Disposition
        
    Raises:
        HTTPException 400: When format parameter is invalid or missing
        HTTPException 404: When run_id does not exist
        HTTPException 503: When database is not configured
    """
    if not repository or not repository.client.is_connected:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )
    
    if format not in ["csv", "json"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid format. Use 'csv' or 'json'"
        )
    
    # Get run metadata
    run = await repository.get_run_by_id(run_id)
    if not run:
        raise HTTPException(
            status_code=404,
            detail="Run not found"
        )
    
    # Get snapshots
    snapshots = await repository.get_snapshots(run_id)
    
    if format == "csv":
        csv_content = _generate_csv(snapshots)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=simulation_{run_id}.csv"
            }
        )
    else:  # json
        json_content = {
            "run": run,
            "snapshots": snapshots
        }
        return Response(
            content=json.dumps(json_content, indent=2),
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=simulation_{run_id}.json"
            }
        )



@router.websocket("/{run_id}/replay")
async def replay_run(websocket: WebSocket, run_id: str, speed: float = Query(default=1.0)):
    """
    Stream simulation snapshots via WebSocket for replay.
    
    Accepts WebSocket connection and streams all tick_snapshots for the run_id
    in tick order at the configured speed (base interval divided by speed).
    
    Args:
        websocket: WebSocket connection
        run_id: UUID of the simulation run
        speed: Playback speed multiplier (0.5, 1.0, 2.0, 5.0) - default 1.0
        
    Sends:
        - Snapshot JSON messages in NetworkState format
        - Completion message: {"type": "replay_complete"}
        - Error messages on failure
    """
    await websocket.accept()
    
    if not repository or not repository.client.is_connected:
        await websocket.send_json({"error": "Database not configured"})
        await websocket.close()
        return
    
    # Validate speed parameter
    if speed not in [0.5, 1.0, 2.0, 5.0]:
        # Allow any positive speed value for flexibility
        if speed <= 0:
            await websocket.send_json({"error": "Invalid speed parameter. Must be positive."})
            await websocket.close()
            return
    
    # Load snapshots
    snapshots = await repository.get_snapshots(run_id)
    
    if not snapshots:
        await websocket.send_json({"error": "Run not found or no snapshots"})
        await websocket.close()
        return
    
    # Calculate interval: base 100ms adjusted by speed
    interval = 0.1 / speed
    
    try:
        # Stream snapshots at configured speed
        for snapshot in snapshots:
            # Transform snapshot to NetworkState format
            state_dict = _transform_snapshot_to_state(snapshot)
            await websocket.send_json(state_dict)
            await asyncio.sleep(interval)
        
        # Send completion message
        await websocket.send_json({"type": "replay_complete"})
        await websocket.close()
        
    except Exception as e:
        logger.error(f"Error during replay for run {run_id}: {e}")
        try:
            await websocket.send_json({"error": f"Replay error: {str(e)}"})
            await websocket.close()
        except:
            pass  # Connection may already be closed
