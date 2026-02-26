'use client';
import { useState, useEffect, useCallback } from 'react';

export function useWebSocket(url: string, fallbackUrl?: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');
  const [currentUrl, setCurrentUrl] = useState(url);

  useEffect(() => {
    setCurrentUrl(url);
  }, [url]);

  useEffect(() => {
    let ws: WebSocket;
    let fallbackTimeout: NodeJS.Timeout;

    const connect = (targetUrl: string) => {
      if (!targetUrl) return;

      const token = typeof window !== 'undefined' ? localStorage.getItem('dmt-access-token') : null;
      const authenticatedUrl = token ? `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}token=${token}` : targetUrl;

      console.log(`[WS] Connecting to ${authenticatedUrl.split('?')[0]}...`);
      ws = new WebSocket(authenticatedUrl);

      ws.onopen = () => {
        setStatus('open');
        console.log(`[WS] Connected to ${targetUrl}`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (e) {
          console.error('[WS] Failed to parse message', e);
        }
      };

      ws.onerror = (err) => {
        console.warn(`[WS] Connection failed for ${targetUrl}`, err);
        if (targetUrl === url && fallbackUrl && targetUrl !== fallbackUrl) {
          console.info(`[WS] Attempting fallback to ${fallbackUrl}`);
          setStatus('connecting');
          connect(fallbackUrl);
        }
      };

      ws.onclose = () => {
        setStatus('closed');
        console.log(`[WS] Disconnected from ${targetUrl}`);
      };

      setSocket(ws);
    };

    connect(currentUrl);

    return () => {
      if (ws) ws.close();
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, [currentUrl, url, fallbackUrl]);

  const sendMessage = useCallback((msg: any) => {
    if (socket && status === 'open') {
      socket.send(JSON.stringify(msg));
    }
  }, [socket, status]);

  return { lastMessage, status, sendMessage };
}
