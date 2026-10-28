"""
Main entry point for AI-Based 5G Digital Twin Network Simulator backend.

This module starts the FastAPI server with uvicorn, serving both REST API
endpoints and WebSocket connections for real-time simulation data streaming.
"""

import uvicorn
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from api.routes import app
from api import history, routes
from db.client import SupabaseClient
from db.repository import SimulationRepository

# Initialize database components
supabase_client = SupabaseClient()
repository = SimulationRepository(supabase_client)

# Set repository for history API
history.set_repository(repository)

# Set repository for main routes (for simulation engine)
routes.set_repository(repository)

# Include history router
app.include_router(history.router)


def main():
    """
    Start the FastAPI server.
    
    Runs on localhost:8000 with auto-reload enabled for development.
    """
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )


if __name__ == "__main__":
    main()
