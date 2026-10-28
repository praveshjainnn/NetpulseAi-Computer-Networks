/**
 * Unit tests for useWebSocket hook
 * Tests connection lifecycle, reconnection logic, and message parsing
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useWebSocket, NetworkState } from './useWebSocket';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Store instance for test access
    MockWebSocket.instances.push(this);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  send(data: string) {
    // Mock send implementation
  }

  // Helper for tests to trigger events
  triggerOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  triggerMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  triggerError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  triggerClose() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  static instances: MockWebSocket[] = [];
  static resetInstances() {
    MockWebSocket.instances = [];
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

describe('useWebSocket', () => {
  beforeEach(() => {
    MockWebSocket.resetInstances();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Connection Lifecycle', () => {
    it('should establish connection on mount', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));

      // Initially disconnected
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.networkState).toBeNull();
      expect(result.current.error).toBeNull();

      // WebSocket instance should be created
      expect(MockWebSocket.instances.length).toBe(1);
      expect(MockWebSocket.instances[0].url).toBe('ws://localhost:8000/ws');
    });

    it('should update status to connected when connection opens', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));

      // Trigger connection open
      act(() => {
        MockWebSocket.instances[0].triggerOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      expect(result.current.error).toBeNull();
    });

    it('should update status to disconnected when connection closes', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));

      // Open connection first
      act(() => {
        MockWebSocket.instances[0].triggerOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Close connection
      act(() => {
        MockWebSocket.instances[0].triggerClose();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('disconnected');
      });
    });

    it('should close connection gracefully on unmount', () => {
      const { unmount } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));

      const ws = MockWebSocket.instances[0];
      const closeSpy = jest.spyOn(ws, 'close');

      unmount();

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should clear reconnection timeout on unmount', () => {
      const { unmount } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));

      // Trigger close to start reconnection timer
      act(() => {
        MockWebSocket.instances[0].triggerClose();
      });

      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection after 5 seconds on disconnect', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));

      // Open and then close connection
      act(() => {
        MockWebSocket.instances[0].triggerOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      act(() => {
        MockWebSocket.instances[0].triggerClose();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('disconnected');
      });

      // Should have 1 WebSocket instance
      expect(MockWebSocket.instances.length).toBe(1);

      // Fast-forward 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should create a new WebSocket instance for reconnection
      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBe(2);
      });
    });

    it('should not reconnect immediately after disconnect', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));

      act(() => {
        MockWebSocket.instances[0].triggerOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      act(() => {
        MockWebSocket.instances[0].triggerClose();
      });

      // Fast-forward 4 seconds (less than 5)
      act(() => {
        jest.advanceTimersByTime(4000);
      });

      // Should still have only 1 WebSocket instance
      expect(MockWebSocket.instances.length).toBe(1);
    });

    it('should stop reconnecting after maximum attempts', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));

      // Simulate 10 failed connection attempts
      for (let i = 0; i < 10; i++) {
        act(() => {
          const currentWs = MockWebSocket.instances[MockWebSocket.instances.length - 1];
          currentWs.triggerClose();
        });

        act(() => {
          jest.advanceTimersByTime(5000);
        });
      }

      // After 10 attempts, close one more time to trigger the max attempts error
      act(() => {
        const currentWs = MockWebSocket.instances[MockWebSocket.instances.length - 1];
        currentWs.triggerClose();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Maximum reconnection attempts reached');
      });

      // Should not create more instances after max attempts
      const instanceCount = MockWebSocket.instances.length;
      
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(MockWebSocket.instances.length).toBe(instanceCount);
    });

    it('should reset reconnection attempts counter on successful connection', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));

      // First connection attempt - close immediately
      act(() => {
        MockWebSocket.instances[0].triggerClose();
      });

      // Wait for reconnection
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBe(2);
      });

      // Successfully connect
      act(() => {
        MockWebSocket.instances[1].triggerOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
        expect(result.current.error).toBeNull();
      });

      // Close again
      act(() => {
        MockWebSocket.instances[1].triggerClose();
      });

      // Should be able to reconnect again (counter was reset)
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBe(3);
      });
    });
  });

  describe('Message Parsing', () => {
    it('should parse valid NetworkState JSON message', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));

      const mockNetworkState: NetworkState = {
        tick: 42,
        timestamp: 1234567890,
        config: {
          total_bandwidth: 100,
          base_latency: 10,
          congestion_factor: 1.5,
          packet_loss_rate: 2.0,
        },
        demands: {
          video_streaming: {
            user_type: 'video_streaming',
            bandwidth_demand: 15.5,
            latency_sensitivity: 0.6,
            packet_count: 100,
            timestamp: 1234567890,
          },
          online_gaming: {
            user_type: 'online_gaming',
            bandwidth_demand: 3.2,
            latency_sensitivity: 0.9,
            packet_count: 50,
            timestamp: 1234567890,
          },
          iot_devices: {
            user_type: 'iot_devices',
            bandwidth_demand: 0.8,
            latency_sensitivity: 0.2,
            packet_count: 200,
            timestamp: 1234567890,
          },
          voip_messaging: {
            user_type: 'voip_messaging',
            bandwidth_demand: 2.1,
            latency_sensitivity: 0.7,
            packet_count: 75,
            timestamp: 1234567890,
          },
        },
        baseline_result: {
          decision: {
            allocations: {
              video_streaming: 25,
              online_gaming: 25,
              iot_devices: 25,
              voip_messaging: 25,
            },
            total_allocated: 100,
            strategy_name: 'baseline',
            timestamp: 1234567890,
          },
          metrics: {
            video_streaming: { latency: 15.2, throughput: 24.8, packet_loss: 1.5 },
            online_gaming: { latency: 12.1, throughput: 24.9, packet_loss: 1.2 },
            iot_devices: { latency: 18.5, throughput: 24.7, packet_loss: 2.1 },
            voip_messaging: { latency: 14.3, throughput: 24.8, packet_loss: 1.8 },
          },
          qos_score: 85.5,
        },
        ai_result: {
          decision: {
            allocations: {
              video_streaming: 35,
              online_gaming: 30,
              iot_devices: 15,
              voip_messaging: 20,
            },
            total_allocated: 100,
            strategy_name: 'ai',
            timestamp: 1234567890,
          },
          metrics: {
            video_streaming: { latency: 12.5, throughput: 34.5, packet_loss: 0.8 },
            online_gaming: { latency: 10.2, throughput: 29.8, packet_loss: 0.5 },
            iot_devices: { latency: 22.1, throughput: 14.9, packet_loss: 2.5 },
            voip_messaging: { latency: 11.8, throughput: 19.7, packet_loss: 1.1 },
          },
          qos_score: 92.3,
        },
        congestion_level: 0.75,
        explanation: 'AI allocator prioritized latency-sensitive traffic',
        explanation_timestamp: 1234567890,
      };

      act(() => {
        MockWebSocket.instances[0].triggerOpen();
      });

      act(() => {
        MockWebSocket.instances[0].triggerMessage(mockNetworkState);
      });

      await waitFor(() => {
        expect(result.current.networkState).toEqual(mockNetworkState);
      });
    });

    it('should handle message with optional fields missing', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));

      const mockNetworkState = {
        tick: 1,
        timestamp: 1234567890,
        config: {
          total_bandwidth: 100,
          base_latency: 10,
          congestion_factor: 1.5,
          packet_loss_rate: 2.0,
        },
        demands: {
          video_streaming: {
            user_type: 'video_streaming',
            bandwidth_demand: 15.5,
            latency_sensitivity: 0.6,
            packet_count: 100,
            timestamp: 1234567890,
          },
          online_gaming: {
            user_type: 'online_gaming',
            bandwidth_demand: 3.2,
            latency_sensitivity: 0.9,
            packet_count: 50,
            timestamp: 1234567890,
          },
          iot_devices: {
            user_type: 'iot_devices',
            bandwidth_demand: 0.8,
            latency_sensitivity: 0.2,
            packet_count: 200,
            timestamp: 1234567890,
          },
          voip_messaging: {
            user_type: 'voip_messaging',
            bandwidth_demand: 2.1,
            latency_sensitivity: 0.7,
            packet_count: 75,
            timestamp: 1234567890,
          },
        },
        baseline_result: {
          decision: {
            allocations: {
              video_streaming: 25,
              online_gaming: 25,
              iot_devices: 25,
              voip_messaging: 25,
            },
            total_allocated: 100,
            strategy_name: 'baseline',
            timestamp: 1234567890,
          },
          metrics: {
            video_streaming: { latency: 15.2, throughput: 24.8, packet_loss: 1.5 },
            online_gaming: { latency: 12.1, throughput: 24.9, packet_loss: 1.2 },
            iot_devices: { latency: 18.5, throughput: 24.7, packet_loss: 2.1 },
            voip_messaging: { latency: 14.3, throughput: 24.8, packet_loss: 1.8 },
          },
          qos_score: 85.5,
        },
        ai_result: {
          decision: {
            allocations: {
              video_streaming: 35,
              online_gaming: 30,
              iot_devices: 15,
              voip_messaging: 20,
            },
            total_allocated: 100,
            strategy_name: 'ai',
            timestamp: 1234567890,
          },
          metrics: {
            video_streaming: { latency: 12.5, throughput: 34.5, packet_loss: 0.8 },
            online_gaming: { latency: 10.2, throughput: 29.8, packet_loss: 0.5 },
            iot_devices: { latency: 22.1, throughput: 14.9, packet_loss: 2.5 },
            voip_messaging: { latency: 11.8, throughput: 19.7, packet_loss: 1.1 },
          },
          qos_score: 92.3,
        },
        congestion_level: 0.75,
        // No explanation or explanation_timestamp
      };

      act(() => {
        MockWebSocket.instances[0].triggerOpen();
      });

      act(() => {
        MockWebSocket.instances[0].triggerMessage(mockNetworkState);
      });

      await waitFor(() => {
        expect(result.current.networkState).toBeTruthy();
        expect(result.current.networkState?.explanation).toBeUndefined();
        expect(result.current.networkState?.explanation_timestamp).toBeUndefined();
      });
    });

    it('should handle invalid JSON gracefully', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));

      act(() => {
        MockWebSocket.instances[0].triggerOpen();
      });

      // Trigger message with invalid JSON
      act(() => {
        const ws = MockWebSocket.instances[0];
        if (ws.onmessage) {
          ws.onmessage(new MessageEvent('message', { data: 'invalid json {' }));
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to parse message from server');
      });

      // Network state should remain null
      expect(result.current.networkState).toBeNull();
    });

    it('should continue receiving messages after parse error', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));

      act(() => {
        MockWebSocket.instances[0].triggerOpen();
      });

      // Send invalid JSON
      act(() => {
        const ws = MockWebSocket.instances[0];
        if (ws.onmessage) {
          ws.onmessage(new MessageEvent('message', { data: 'invalid' }));
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to parse message from server');
      });

      // Send valid message
      const validState = {
        tick: 1,
        timestamp: 1234567890,
        config: { total_bandwidth: 100, base_latency: 10, congestion_factor: 1.5, packet_loss_rate: 2.0 },
        demands: {
          video_streaming: { user_type: 'video_streaming', bandwidth_demand: 15, latency_sensitivity: 0.6, packet_count: 100, timestamp: 1234567890 },
          online_gaming: { user_type: 'online_gaming', bandwidth_demand: 3, latency_sensitivity: 0.9, packet_count: 50, timestamp: 1234567890 },
          iot_devices: { user_type: 'iot_devices', bandwidth_demand: 0.8, latency_sensitivity: 0.2, packet_count: 200, timestamp: 1234567890 },
          voip_messaging: { user_type: 'voip_messaging', bandwidth_demand: 2, latency_sensitivity: 0.7, packet_count: 75, timestamp: 1234567890 },
        },
        baseline_result: {
          decision: { allocations: { video_streaming: 25, online_gaming: 25, iot_devices: 25, voip_messaging: 25 }, total_allocated: 100, strategy_name: 'baseline', timestamp: 1234567890 },
          metrics: {
            video_streaming: { latency: 15, throughput: 24, packet_loss: 1.5 },
            online_gaming: { latency: 12, throughput: 24, packet_loss: 1.2 },
            iot_devices: { latency: 18, throughput: 24, packet_loss: 2.1 },
            voip_messaging: { latency: 14, throughput: 24, packet_loss: 1.8 },
          },
          qos_score: 85,
        },
        ai_result: {
          decision: { allocations: { video_streaming: 35, online_gaming: 30, iot_devices: 15, voip_messaging: 20 }, total_allocated: 100, strategy_name: 'ai', timestamp: 1234567890 },
          metrics: {
            video_streaming: { latency: 12, throughput: 34, packet_loss: 0.8 },
            online_gaming: { latency: 10, throughput: 29, packet_loss: 0.5 },
            iot_devices: { latency: 22, throughput: 14, packet_loss: 2.5 },
            voip_messaging: { latency: 11, throughput: 19, packet_loss: 1.1 },
          },
          qos_score: 92,
        },
        congestion_level: 0.75,
      };

      act(() => {
        MockWebSocket.instances[0].triggerMessage(validState);
      });

      await waitFor(() => {
        expect(result.current.networkState).toEqual(validState);
      });
    });

    it('should update networkState with each new message', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));

      act(() => {
        MockWebSocket.instances[0].triggerOpen();
      });

      const createMockState = (tick: number) => ({
        tick,
        timestamp: 1234567890 + tick,
        config: { total_bandwidth: 100, base_latency: 10, congestion_factor: 1.5, packet_loss_rate: 2.0 },
        demands: {
          video_streaming: { user_type: 'video_streaming', bandwidth_demand: 15, latency_sensitivity: 0.6, packet_count: 100, timestamp: 1234567890 },
          online_gaming: { user_type: 'online_gaming', bandwidth_demand: 3, latency_sensitivity: 0.9, packet_count: 50, timestamp: 1234567890 },
          iot_devices: { user_type: 'iot_devices', bandwidth_demand: 0.8, latency_sensitivity: 0.2, packet_count: 200, timestamp: 1234567890 },
          voip_messaging: { user_type: 'voip_messaging', bandwidth_demand: 2, latency_sensitivity: 0.7, packet_count: 75, timestamp: 1234567890 },
        },
        baseline_result: {
          decision: { allocations: { video_streaming: 25, online_gaming: 25, iot_devices: 25, voip_messaging: 25 }, total_allocated: 100, strategy_name: 'baseline', timestamp: 1234567890 },
          metrics: {
            video_streaming: { latency: 15, throughput: 24, packet_loss: 1.5 },
            online_gaming: { latency: 12, throughput: 24, packet_loss: 1.2 },
            iot_devices: { latency: 18, throughput: 24, packet_loss: 2.1 },
            voip_messaging: { latency: 14, throughput: 24, packet_loss: 1.8 },
          },
          qos_score: 85,
        },
        ai_result: {
          decision: { allocations: { video_streaming: 35, online_gaming: 30, iot_devices: 15, voip_messaging: 20 }, total_allocated: 100, strategy_name: 'ai', timestamp: 1234567890 },
          metrics: {
            video_streaming: { latency: 12, throughput: 34, packet_loss: 0.8 },
            online_gaming: { latency: 10, throughput: 29, packet_loss: 0.5 },
            iot_devices: { latency: 22, throughput: 14, packet_loss: 2.5 },
            voip_messaging: { latency: 11, throughput: 19, packet_loss: 1.1 },
          },
          qos_score: 92,
        },
        congestion_level: 0.75,
      });

      // Send first message
      act(() => {
        MockWebSocket.instances[0].triggerMessage(createMockState(1));
      });

      await waitFor(() => {
        expect(result.current.networkState?.tick).toBe(1);
      });

      // Send second message
      act(() => {
        MockWebSocket.instances[0].triggerMessage(createMockState(2));
      });

      await waitFor(() => {
        expect(result.current.networkState?.tick).toBe(2);
      });

      // Send third message
      act(() => {
        MockWebSocket.instances[0].triggerMessage(createMockState(3));
      });

      await waitFor(() => {
        expect(result.current.networkState?.tick).toBe(3);
      });
    });
  });

  describe('Error Handling', () => {
    it('should set error state on WebSocket error', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));

      act(() => {
        MockWebSocket.instances[0].triggerError();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('WebSocket connection error');
      });
    });

    it('should clear error on successful connection', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));

      // Trigger error first
      act(() => {
        MockWebSocket.instances[0].triggerError();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('WebSocket connection error');
      });

      // Then connect successfully
      act(() => {
        MockWebSocket.instances[0].triggerOpen();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.connectionStatus).toBe('connected');
      });
    });
  });

  describe('URL Configuration', () => {
    it('should use default URL when not provided', () => {
      renderHook(() => useWebSocket());

      expect(MockWebSocket.instances[0].url).toBe('ws://localhost:8000/ws');
    });

    it('should use custom URL when provided', () => {
      renderHook(() => useWebSocket('ws://custom-host:9000/websocket'));

      expect(MockWebSocket.instances[0].url).toBe('ws://custom-host:9000/websocket');
    });

    it('should reconnect to the same URL', async () => {
      const customUrl = 'ws://test-server:8080/ws';
      renderHook(() => useWebSocket(customUrl));

      expect(MockWebSocket.instances[0].url).toBe(customUrl);

      // Close connection
      act(() => {
        MockWebSocket.instances[0].triggerClose();
      });

      // Wait for reconnection
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBe(2);
      });

      // Should reconnect to same URL
      expect(MockWebSocket.instances[1].url).toBe(customUrl);
    });
  });
});
