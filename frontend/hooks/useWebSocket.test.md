# WebSocket Hook Unit Tests

## Overview

Comprehensive unit tests for the `useWebSocket` custom React hook that manages WebSocket connections for real-time simulation data streaming.

## Test Coverage

### Connection Lifecycle (5 tests)
- ✅ Establishes connection on component mount
- ✅ Updates status to "connected" when connection opens
- ✅ Updates status to "disconnected" when connection closes
- ✅ Closes connection gracefully on component unmount
- ✅ Clears reconnection timeout on unmount

### Reconnection Logic (4 tests)
- ✅ Attempts reconnection after 5 seconds on disconnect
- ✅ Does not reconnect immediately after disconnect
- ✅ Stops reconnecting after maximum attempts (10)
- ✅ Resets reconnection attempts counter on successful connection

### Message Parsing (5 tests)
- ✅ Parses valid NetworkState JSON messages correctly
- ✅ Handles messages with optional fields missing
- ✅ Handles invalid JSON gracefully with error state
- ✅ Continues receiving messages after parse error
- ✅ Updates networkState with each new message

### Error Handling (2 tests)
- ✅ Sets error state on WebSocket error
- ✅ Clears error on successful connection

### URL Configuration (3 tests)
- ✅ Uses default URL when not provided
- ✅ Uses custom URL when provided
- ✅ Reconnects to the same URL after disconnect

## Requirements Validated

- **Requirement 12.1**: Dashboard establishes WebSocket connection on component mount
- **Requirement 12.2**: Dashboard displays connection status as "Connected"
- **Requirement 12.3**: Dashboard displays "Disconnected" status and attempts reconnection every 5 seconds
- **Requirement 12.4**: Dashboard parses JSON and updates application state
- **Requirement 12.5**: Dashboard closes WebSocket connection gracefully on unmount

## Test Statistics

- **Total Tests**: 19
- **Passing**: 19
- **Failing**: 0
- **Coverage**: Connection lifecycle, reconnection logic, message parsing, error handling, URL configuration

## Testing Approach

The tests use a mock WebSocket implementation that simulates:
- Connection open/close events
- Message reception
- Error events
- Reconnection timing

Jest fake timers are used to control reconnection timing without waiting for actual delays.

## Running Tests

```bash
# Run all tests
npm test

# Run WebSocket tests specifically
npm test -- useWebSocket.test.ts

# Run tests in watch mode
npm test:watch
```
