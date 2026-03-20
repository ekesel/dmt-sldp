'use client';

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import WSClient from '../lib/socket';

interface WebSocketContextType {
  client: WSClient | null;
  lastMessage: any | null;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ url: string | null; children: React.ReactNode }> = ({ url, children }) => {
  const [lastMessage, setLastMessage] = React.useState<any | null>(null);
  const client = useMemo(() => (url ? new WSClient(url) : null), [url]);

  useEffect(() => {
    if (client) {
      const handleAllMessages = (msg: any) => setLastMessage(msg);
      
      // WSClient dispatches 'message' for JSON messages or specific types
      // We'll listen to a generic 'message' event if we implement it, 
      // or we can modify WSClient to dispatch a 'message' event for every incoming message.
      client.on('message', handleAllMessages);
      // Also listen to specific types just in case they don't have 'type' property
      // and are dispatched as 'message' by default in WSClient
      
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

export const useWebSocketInternal = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
