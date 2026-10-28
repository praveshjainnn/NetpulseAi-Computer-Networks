"""
Session-based simulation manager for multi-user support.

Each user gets their own simulation session with independent state.
"""

import uuid
import asyncio
from typing import Dict, Optional
from datetime import datetime, timedelta

from simulator.engine import SimulationEngine
from models import SimulationConfig


class SimulationSession:
    """Individual simulation session for a user."""
    
    def __init__(self, session_id: str, engine: SimulationEngine):
        self.session_id = session_id
        self.engine = engine
        self.created_at = datetime.now()
        self.last_accessed = datetime.now()
    
    def touch(self):
        """Update last accessed time."""
        self.last_accessed = datetime.now()
    
    def is_expired(self, timeout_minutes: int = 30) -> bool:
        """Check if session has expired."""
        return datetime.now() - self.last_accessed > timedelta(minutes=timeout_minutes)


class SessionManager:
    """
    Manages multiple simulation sessions for different users.
    
    Features:
    - Session creation with unique IDs
    - Session cleanup after timeout
    - Per-session simulation engines
    - Automatic cleanup of expired sessions
    """
    
    def __init__(self):
        self.sessions: Dict[str, SimulationSession] = {}
        self._cleanup_task: Optional[asyncio.Task] = None
    
    def create_session(self, config: SimulationConfig, groq_api_key: Optional[str], repository) -> str:
        """
        Create a new simulation session.
        
        Args:
            config: Simulation configuration
            groq_api_key: Groq API key for AI integration
            repository: Database repository
        
        Returns:
            Session ID
        """
        session_id = str(uuid.uuid4())
        
        # Create new simulation engine for this session
        engine = SimulationEngine(config, groq_api_key=groq_api_key, repository=repository)
        
        # Create session
        session = SimulationSession(session_id, engine)
        self.sessions[session_id] = session
        
        print(f"[Session] Created session {session_id}. Total sessions: {len(self.sessions)}")
        return session_id
    
    def get_session(self, session_id: str) -> Optional[SimulationSession]:
        """Get session by ID and update last accessed time."""
        session = self.sessions.get(session_id)
        if session:
            session.touch()
        return session
    
    async def delete_session(self, session_id: str) -> bool:
        """
        Delete a session and cleanup resources.
        
        Args:
            session_id: Session ID to delete
        
        Returns:
            True if session was deleted, False if not found
        """
        session = self.sessions.get(session_id)
        if not session:
            return False
        
        # Stop simulation if running
        if session.engine.is_running:
            await session.engine.stop()
        
        # Close engine
        await session.engine.close()
        
        # Remove session
        del self.sessions[session_id]
        print(f"[Session] Deleted session {session_id}. Total sessions: {len(self.sessions)}")
        return True
    
    async def cleanup_expired_sessions(self, timeout_minutes: int = 30):
        """Remove expired sessions."""
        expired = [
            session_id 
            for session_id, session in self.sessions.items() 
            if session.is_expired(timeout_minutes)
        ]
        
        for session_id in expired:
            await self.delete_session(session_id)
            print(f"[Session] Cleaned up expired session: {session_id}")
    
    async def start_cleanup_task(self, interval_minutes: int = 5):
        """Start background task to cleanup expired sessions."""
        while True:
            await asyncio.sleep(interval_minutes * 60)
            await self.cleanup_expired_sessions()
    
    def get_session_count(self) -> int:
        """Get number of active sessions."""
        return len(self.sessions)


# Global session manager instance
session_manager = SessionManager()
