"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface NetworkState {
  tick: number;
  timestamp: number;
  config: {
    total_bandwidth: number;
    base_latency: number;
    congestion_factor: number;
    packet_loss_rate: number;
    random_seed?: number;
  };
  demands: {
    video_streaming: TrafficDemand;
    online_gaming: TrafficDemand;
    iot_devices: TrafficDemand;
    voip_messaging: TrafficDemand;
  };
  baseline_result: AllocationResult;
  ai_result: AllocationResult;
  rl_result?: AllocationResult;
  congestion_level: number;
  explanation?: string;
  explanation_timestamp?: number;
}

interface TrafficDemand {
  user_type: string;
  bandwidth_demand: number;
  latency_sensitivity: number;
  packet_count: number;
  timestamp: number;
}

interface AllocationResult {
  decision: {
    allocations: {
      video_streaming: number;
      online_gaming: number;
      iot_devices: number;
      voip_messaging: number;
    };
    total_allocated: number;
    strategy_name: string;
    timestamp: number;
  };
  metrics: {
    video_streaming: UserTypeMetrics;
    online_gaming: UserTypeMetrics;
    iot_devices: UserTypeMetrics;
    voip_messaging: UserTypeMetrics;
  };
  qos_score: number;
  utilization: number;  // Change 1: network utilization %
}

interface UserTypeMetrics {
  latency: number;
  throughput: number;
  packet_loss: number;
  allocation_efficiency: number;
}

export type ConnectionStatus = "connected" | "disconnected";

interface UseWebSocketReturn {
  networkState: NetworkState | null;
  connectionStatus: ConnectionStatus;
  error: string | null;
}

export function useWebSocket(sessionId?: string): UseWebSocketReturn {
  const [networkState, setNetworkState] = useState<NetworkState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const connect = useCallback(() => {
    // Don't connect if no session ID
    if (!sessionId) {
      setConnectionStatus("disconnected");
      setError("No session ID provided");
      return;
    }

    try {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Build WebSocket URL with session ID
      const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
      // Remove trailing /ws if present, then add /ws/{session_id}
      const baseWithoutWs = wsBaseUrl.replace(/\/ws\/?$/, "");
      const wsUrl = `${baseWithoutWs}/ws/${sessionId}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus("connected");
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as NetworkState;
          setNetworkState(data);
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
          setError("Failed to parse message from server");
        }
      };

      ws.onerror = (event) => {
        // Silently handle WebSocket errors - they're expected when server is not running
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.warn("WebSocket connection error - server may not be running");
        }
      };

      ws.onclose = () => {
        setConnectionStatus("disconnected");
        wsRef.current = null;

        // Only attempt to reconnect if we were previously connected
        // This prevents reconnection attempts when navigating away from dashboard
        if (reconnectAttemptsRef.current < maxReconnectAttempts && sessionId) {
          reconnectAttemptsRef.current += 1;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };
    } catch (err) {
      console.error("Failed to create WebSocket connection:", err);
      setError("Failed to establish connection");
      setConnectionStatus("disconnected");
    }
  }, [sessionId]);

  useEffect(() => {
    // Establish connection on mount if session ID exists
    if (sessionId) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, sessionId]);

  return {
    networkState,
    connectionStatus,
    error,
  };
}
