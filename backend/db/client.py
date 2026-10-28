"""
Supabase client wrapper with graceful degradation.

This module provides a wrapper around the Supabase client that handles
initialization from environment variables and gracefully degrades when
database credentials are missing or connection fails.
"""

import os
import logging
from typing import Optional
try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = None

logger = logging.getLogger(__name__)


class SupabaseClient:
    """
    Supabase client wrapper with graceful degradation.
    
    Initializes from SUPABASE_URL and SUPABASE_KEY environment variables.
    When credentials are missing or connection fails, sets connection status
    to disabled and returns None for all operations.
    """
    
    def __init__(self):
        """
        Initialize Supabase client from environment variables.
        
        Reads SUPABASE_URL and SUPABASE_KEY from environment. If either is
        missing or connection fails, sets _client to None and logs the issue.
        """
        self._client: Optional[Client] = None
        
        if create_client is None:
            logger.info("Supabase package not installed - database features disabled.")
            return

        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        
        if not url or not key:
            logger.info(
                "Supabase credentials not configured - database features disabled. "
                "Set SUPABASE_URL and SUPABASE_KEY environment variables to enable."
            )
            return
        
        try:
            self._client = create_client(url, key)
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(
                f"Failed to initialize Supabase client: {e}. "
                "Database features will be disabled."
            )
            self._client = None
    
    @property
    def is_connected(self) -> bool:
        """
        Check if database connection is available.
        
        Returns:
            True if client is initialized and ready, False otherwise
        """
        return self._client is not None
    
    @property
    def client(self) -> Optional[Client]:
        """
        Get the Supabase client instance.
        
        Returns:
            Supabase Client if connected, None if disabled
        """
        return self._client
