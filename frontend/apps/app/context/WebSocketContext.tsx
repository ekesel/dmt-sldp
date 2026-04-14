'use client';

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import WSClient from '../lib/socket';

/**
 * Represents a standard message received over the WebSocket.
 */
export interface WebSocketMessage {
  type: string;
  message?: {
    progress?: number;
    status?: string;
    [key: string]: unknown;
  };
  progress?: number;
  status?: string;
  [key: string]: unknown;
}

/**
 * Type guard to check if an unknown message adheres to the WebSocketMessage interface.
 */
export function isWebSocketMessage(msg: unknown): msg is WebSocketMessage {
  return typeof msg === 'object' && msg !== null && 'type' in msg;
}

interface WebSocketContextType {
  client: WSClient | null;
  /**
   * The most recently received message from any WebSocket channel.
   */
  lastMessage: WebSocketMessage | null;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

/**
 * Provides WebSocket connectivity and message state to the application.
 * @param url The WebSocket server URL. If null, no connection is established.
 */
export const WebSocketProvider: React.FC<{ url: string | null; children: React.ReactNode }> = ({ url, children }) => {
  const [lastMessage, setLastMessage] = React.useState<WebSocketMessage | null>(null);
  
  const client = useMemo(() => {
    if (url) {
      return new WSClient(url);
    }
    return null;
  }, [url]);

  useEffect(() => {
    if (client) {
      const handleAllMessages = (msg: unknown) => {
        if (isWebSocketMessage(msg)) {
          setLastMessage(msg);
        }
      };
      
      // WSClient dispatches 'message' for JSON messages or specific types
      client.on('message', handleAllMessages);
      
      client.connect();
      return () => {
        client.off('message', handleAllMessages);
        client.disconnect();
      };
    }
  }, [client]);

  return (
    <WebSocketContext.Provider value={{ client, lastMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};

/**
 * Hook to access the WebSocket client and last message from the nearest provider.
 * @throws Error if used outside of a WebSocketProvider.
 */
export const useWebSocketInternal = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
