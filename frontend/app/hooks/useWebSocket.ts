'use client';
import { useState, useEffect, useCallback } from 'react';

export function useWebSocket(url: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setStatus('open');
      console.log('WebSocket Connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    ws.onclose = () => {
      setStatus('closed');
      console.log('WebSocket Disconnected');
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [url]);

  const sendMessage = useCallback((msg: any) => {
    if (socket && status === 'open') {
      socket.send(JSON.stringify(msg));
    }
  }, [socket, status]);

  return { lastMessage, status, sendMessage };
}
