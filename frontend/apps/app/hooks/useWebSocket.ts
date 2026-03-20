'use client';

import { useWebSocketInternal } from '../context/WebSocketContext';

/**
 * Custom hook to access the global WebSocket client.
 * Must be used within a WebSocketProvider.
 */
export function useWebSocket() {
  const context = useWebSocketInternal();
  return context;
}
