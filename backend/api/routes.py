"""
REST API routes for AI-Based 5G Digital Twin Network Simulator.

This module implements FastAPI REST endpoints for simulation control,
configuration management, and metrics retrieval with session-based multi-user support.
"""

import os
from typing import Optional
from fastapi import FastAPI, HTTPException, WebSocket, Header, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from models import SimulationConfig, MetricsStatistics, RLLearningStats
from api.session_manager import session_manager
from api.websocket import websocket_endpoint_session
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from db.repository import SimulationRepository


# Create FastAPI app
app = FastAPI(
    title="AI-Based 5G Digital Twin Network Simulator",
    description="Real-time 5G network simulation with AI-powered resource allocation (Multi-user)",
    version="2.0.0"
)

# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Only add HSTS in production
        if os.getenv("ENVIRONMENT") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Add CORS middleware for development and production origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://netpulseai.tanisheesh.in",
        "https://netpulseai.vercel.app",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Global repository instance (injected from main.py)
_repository: Optional["SimulationRepository"] = None


def set_repository(repo: "SimulationRepository"):
    """
    Set repository instance for dependency injection.
    
    Args:
        repo: SimulationRepository instance to use for database operations
    """
    global _repository
    _repository = repo


@app.post("/api/simulation/start")
async def start_simulation(
    config: SimulationConfig,
    response: Response,
    x_session_id: Optional[str] = Header(None)
) -> dict:
    """
    Start simulation with provided configuration.
    Creates a new session if no session ID provided.
    
    Args:
        config: Simulation configuration parameters.
        response: Response object to set session cookie.
        x_session_id: Optional session ID from header.
    
    Returns:
        Success message with session ID and configuration details.
    
    Raises:
        HTTPException 400: If configuration validation fails.
        HTTPException 409: If simulation is already running in this session.
    """
    # Get or create session
    if x_session_id:
        session = session_manager.get_session(x_session_id)
        if session and session.engine.is_running:
            raise HTTPException(
                status_code=409,
                detail="Simulation is already running in this session. Stop it before starting a new one."
            )
        session_id = x_session_id
    else:
        # Create new session
        groq_api_key = os.getenv("GROQ_API_KEY")
        session_id = session_manager.create_session(config, groq_api_key, _repository)
        session = session_manager.get_session(session_id)
    
    if not session:
        # Session expired or invalid, create new one
        groq_api_key = os.getenv("GROQ_API_KEY")
        session_id = session_manager.create_session(config, groq_api_key, _repository)
        session = session_manager.get_session(session_id)
    
    try:
        # Start simulation for this session
        await session.engine.start()
        
        # Set session ID in response header
        response.headers["X-Session-ID"] = session_id
        
        return {
            "status": "started",
            "message": "Simulation started successfully",
            "session_id": session_id,
            "config": config.model_dump(),
            "groq_enabled": session.engine.groq_layer.enabled
        }
    
    except Exception as e:
        # Log detailed error but return generic message
        import logging
        logging.error(f"Failed to start simulation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to start simulation. Please check your configuration and try again."
        )


@app.post("/api/simulation/stop")
async def stop_simulation(x_session_id: Optional[str] = Header(None)) -> dict:
    """
    Stop running simulation for the given session.
    
    Args:
        x_session_id: Session ID from header.
    
    Returns:
        Success message.
    
    Raises:
        HTTPException 400: If no session ID provided.
        HTTPException 404: If session not found.
        HTTPException 409: If simulation is not running.
    """
    if not x_session_id:
        raise HTTPException(
            status_code=400,
            detail="Session ID required. Start a simulation first."
        )
    
    session = session_manager.get_session(x_session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found or expired. Start a new simulation."
        )
    
    if not session.engine.is_running:
        raise HTTPException(
            status_code=409,
            detail="Simulation is not running in this session"
        )
    
    try:
        await session.engine.stop()
        
        return {
            "status": "stopped",
            "message": "Simulation stopped successfully",
            "session_id": x_session_id
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stop simulation: {str(e)}"
        )


@app.post("/api/simulation/reset")
async def reset_simulation(x_session_id: Optional[str] = Header(None)) -> dict:
    """
    Reset simulation to initial state for the given session.
    
    Args:
        x_session_id: Session ID from header.
    
    Returns:
        Success message.
    """
    if not x_session_id:
        return {
            "status": "reset",
            "message": "No session to reset"
        }
    
    session = session_manager.get_session(x_session_id)
    if not session:
        return {
            "status": "reset",
            "message": "Session not found or expired"
        }
    
    try:
        await session.engine.reset()
        
        return {
            "status": "reset",
            "message": "Simulation reset successfully",
            "session_id": x_session_id
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset simulation: {str(e)}"
        )


@app.delete("/api/simulation/session")
async def delete_session(x_session_id: Optional[str] = Header(None)) -> dict:
    """
    Delete a simulation session and cleanup resources.
    
    Args:
        x_session_id: Session ID from header.
    
    Returns:
        Success message.
    """
    if not x_session_id:
        raise HTTPException(
            status_code=400,
            detail="Session ID required"
        )
    
    deleted = await session_manager.delete_session(x_session_id)
    
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )
    
    return {
        "status": "deleted",
        "message": "Session deleted successfully",
        "session_id": x_session_id
    }


@app.get("/api/simulation/config")
async def get_config(x_session_id: Optional[str] = Header(None)) -> SimulationConfig:
    """
    Retrieve current simulation configuration for the given session.
    
    Args:
        x_session_id: Session ID from header.
    
    Returns:
        Current simulation configuration.
    
    Raises:
        HTTPException 400: If no session ID provided.
        HTTPException 404: If session not found.
    """
    if not x_session_id:
        raise HTTPException(
            status_code=400,
            detail="Session ID required. Start a simulation first."
        )
    
    session = session_manager.get_session(x_session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found or expired. Start a new simulation."
        )
    
    return session.engine.config


@app.get("/api/simulation/metrics")
async def get_metrics(x_session_id: Optional[str] = Header(None)) -> MetricsStatistics:
    """
    Retrieve aggregated historical metrics for the given session.
    
    Args:
        x_session_id: Session ID from header.
    
    Returns:
        Metrics statistics for all allocators.
    
    Raises:
        HTTPException 400: If no session ID provided.
        HTTPException 404: If session not found.
        HTTPException 409: If simulation hasn't collected any metrics yet.
    """
    if not x_session_id:
        raise HTTPException(
            status_code=400,
            detail="Session ID required. Start a simulation first."
        )
    
    session = session_manager.get_session(x_session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found or expired. Start a new simulation."
        )
    
    try:
        stats = session.engine.metrics_collector.get_statistics()
        
        if stats.window_size == 0:
            raise HTTPException(
                status_code=409,
                detail="No metrics available yet. Wait for simulation to run."
            )
        
        return stats
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve metrics: {str(e)}"
        )


@app.get("/api/simulation/status")
async def get_status(x_session_id: Optional[str] = Header(None)) -> dict:
    """
    Get current simulation status for the given session.
    
    Args:
        x_session_id: Session ID from header.
    
    Returns:
        Status information including running state, tick count, session info.
    """
    # Global stats
    total_sessions = session_manager.get_session_count()
    db_connected = _repository is not None and _repository.client.is_connected
    
    if not x_session_id:
        return {
            "running": False,
            "tick": 0,
            "session_id": None,
            "total_sessions": total_sessions,
            "database_connected": db_connected,
            "message": "No session ID provided"
        }
    
    session = session_manager.get_session(x_session_id)
    if not session:
        return {
            "running": False,
            "tick": 0,
            "session_id": x_session_id,
            "total_sessions": total_sessions,
            "database_connected": db_connected,
            "message": "Session not found or expired"
        }
    
    return {
        "running": session.engine.is_running,
        "tick": session.engine.current_tick,
        "session_id": x_session_id,
        "total_sessions": total_sessions,
        "groq_enabled": session.engine.groq_layer.enabled,
        "database_connected": db_connected,
        "current_run_id": session.engine.current_run_id,
        "session_created_at": session.created_at.isoformat(),
        "session_last_accessed": session.last_accessed.isoformat()
    }


@app.get("/api/simulation/rl-stats")
async def get_rl_stats(x_session_id: Optional[str] = Header(None)) -> RLLearningStats:
    """
    Get RL allocator learning statistics for the given session.
    
    Args:
        x_session_id: Session ID from header.
    
    Returns:
        Learning statistics including Q-values, exploration rate, and performance.
    
    Raises:
        HTTPException 400: If no session ID provided.
        HTTPException 404: If session not found.
    """
    if not x_session_id:
        raise HTTPException(
            status_code=400,
            detail="Session ID required. Start a simulation first."
        )
    
    session = session_manager.get_session(x_session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found or expired. Start a new simulation."
        )
    
    try:
        stats_dict = session.engine.rl_allocator.get_learning_stats()
        return RLLearningStats(**stats_dict)
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve RL stats: {str(e)}"
        )


@app.websocket("/ws/{session_id}")
async def websocket_route(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time simulation data streaming.
    Each session has its own WebSocket connection.
    
    Args:
        websocket: WebSocket connection from client.
        session_id: Session ID for this connection.
    """
    await websocket_endpoint_session(websocket, session_id)


@app.get("/api/health")
async def health_check() -> dict:
    """
    Health check endpoint for monitoring system status.
    
    Returns:
        Health status with database and session manager state.
    """
    # Check database connection
    db_healthy = _repository is not None and _repository.client.is_connected
    
    # Get session stats
    total_sessions = session_manager.get_session_count()
    
    # Overall health
    healthy = db_healthy
    
    return {
        "status": "healthy" if healthy else "degraded",
        "database": "connected" if db_healthy else "disconnected",
        "total_sessions": total_sessions,
        "timestamp": __import__("time").time()
    }


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "AI-Based 5G Digital Twin Network Simulator API",
        "version": "2.0.0",
        "multi_user": True,
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/api/health",
        "endpoints": {
            "POST /api/simulation/start": "Start simulation (creates session)",
            "POST /api/simulation/stop": "Stop running simulation",
            "POST /api/simulation/reset": "Reset simulation state",
            "DELETE /api/simulation/session": "Delete session and cleanup",
            "GET /api/simulation/config": "Get current configuration",
            "GET /api/simulation/metrics": "Get aggregated metrics",
            "GET /api/simulation/status": "Get simulation status",
            "GET /api/simulation/rl-stats": "Get RL learning statistics",
            "GET /api/health": "Health check endpoint",
            "WS /ws/{session_id}": "WebSocket for real-time data streaming",
            "GET /api/history": "List recent simulation runs",
            "GET /api/history/{run_id}": "Get single run with decisions",
            "DELETE /api/history/{run_id}": "Delete simulation run",
            "GET /api/history/{run_id}/export": "Export run data (CSV/JSON)",
            "WS /api/history/{run_id}/replay": "Replay simulation via WebSocket"
        },
        "headers": {
            "X-Session-ID": "Session ID (returned from /start, required for other endpoints)"
        }
    }


@app.on_event("startup")
async def startup_event():
    """Start background tasks on startup."""
    # Start session cleanup task
    import asyncio
    asyncio.create_task(session_manager.start_cleanup_task(interval_minutes=5))
    print("[Startup] Session cleanup task started")


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown."""
    # Cleanup all sessions
    session_ids = list(session_manager.sessions.keys())
    for session_id in session_ids:
        await session_manager.delete_session(session_id)
    print("[Shutdown] All sessions cleaned up")
