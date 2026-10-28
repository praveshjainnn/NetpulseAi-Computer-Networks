"""
WebSocket server for AI-Based 5G Digital Twin Network Simulator.

This module implements real-time data streaming to connected clients via WebSocket,
with session-based multi-user support.
"""

import json
from typing import Dict, List
from fastapi import WebSocket, WebSocketDisconnect

from models import NetworkState
from api.session_manager import session_manager


class SessionConnectionManager:
    """
    Manages WebSocket connections per session.
    
    Each session can have multiple WebSocket connections (e.g., multiple browser tabs).
    Broadcasts are sent only to connections belonging to the same session.
    """
    
    def __init__(self):
        # session_id -> list of websockets
        self.connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str) -> bool:
        """
        Accept a new WebSocket connection for a session.
        
        Args:
            websocket: WebSocket connection to accept.
            session_id: Session ID for this connection.
        
        Returns:
            True if connection accepted, False if session not found.
        """
        # Check if session exists
        session = session_manager.get_session(session_id)
        if not session:
            await websocket.close(code=1008, reason="Session not found or expired")
            return False
        
        await websocket.accept()
        
        if session_id not in self.connections:
            self.connections[session_id] = []
        
        self.connections[session_id].append(websocket)
        print(f"[WebSocket] Connected to session {session_id}. Connections: {len(self.connections[session_id])}")
        return True
    
    def disconnect(self, websocket: WebSocket, session_id: str) -> None:
        """
        Remove a WebSocket connection.
        
        Args:
            websocket: WebSocket connection to remove.
            session_id: Session ID for this connection.
        """
        if session_id in self.connections and websocket in self.connections[session_id]:
            self.connections[session_id].remove(websocket)
            print(f"[WebSocket] Disconnected from session {session_id}. Connections: {len(self.connections[session_id])}")
            
            # Clean up empty session connection lists
            if not self.connections[session_id]:
                del self.connections[session_id]
    
    async def broadcast_to_session(self, session_id: str, network_state: NetworkState) -> None:
        """
        Broadcast network state to all connections in a session.
        
        Args:
            session_id: Session ID to broadcast to.
            network_state: Network state snapshot to broadcast.
        """
        if session_id not in self.connections:
            return
        
        # Serialize network state to JSON
        try:
            message = network_state.model_dump_json()
        except Exception as e:
            print(f"Error serializing network state: {e}")
            return
        
        # Broadcast to all connections in this session
        failed_connections = []
        
        for connection in self.connections[session_id]:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Error broadcasting to client: {e}")
                failed_connections.append(connection)
        
        # Remove failed connections
        for connection in failed_connections:
            self.disconnect(connection, session_id)
    
    def get_connection_count(self, session_id: str) -> int:
        """
        Get the number of active connections for a session.
        
        Args:
            session_id: Session ID.
        
        Returns:
            Number of active WebSocket connections for this session.
        """
        return len(self.connections.get(session_id, []))


# Global connection manager instance
connection_manager = SessionConnectionManager()


async def websocket_endpoint_session(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time simulation data streaming.
    
    Args:
        websocket: WebSocket connection from client.
        session_id: Session ID for this connection.
    """
    # Accept connection
    connected = await connection_manager.connect(websocket, session_id)
    
    if not connected:
        return
    
    # Get session and set up broadcast callback
    session = session_manager.get_session(session_id)
    if session:
        # Set broadcast callback for this session
        async def broadcast_callback(network_state: NetworkState):
            await connection_manager.broadcast_to_session(session_id, network_state)
        
        session.engine.set_state_callback(broadcast_callback)
    
    try:
        # Keep connection alive and listen for client messages
        while True:
            # Wait for any message from client (ping/pong to keep alive)
            data = await websocket.receive_text()
            
            # Echo back for connection health check
            if data == "ping":
                await websocket.send_text("pong")
    
    except WebSocketDisconnect:
        # Client disconnected normally
        connection_manager.disconnect(websocket, session_id)
    
    except Exception as e:
        # Unexpected error
        print(f"WebSocket error: {e}")
        connection_manager.disconnect(websocket, session_id)
