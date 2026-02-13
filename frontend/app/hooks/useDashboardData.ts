'use client';
import { useState, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

interface DashboardMetrics {
  compliance_rate: number;
  avg_cycle_time: string;
  sprint_velocity: number;
}

export function useDashboardData() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time updates via WebSocket (environment-driven URL)
  const { lastMessage } = useWebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/dashboard');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Real API call (placeholder)
        const response = await fetch('/api/dashboard/metrics');
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        setMetrics(data);
        setLoading(false);
      } catch (err) {
        // Fallback to mock data for demonstration if API fails
        setMetrics({
          compliance_rate: 84.2,
          avg_cycle_time: '3.4 days',
          sprint_velocity: 42
        });
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update metrics when WebSocket message arrives
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'metrics_update') {
      setMetrics(lastMessage.data);
    }
  }, [lastMessage]);

  const refresh = () => {
    setLoading(true);
    // fetchData();
  };

  return { metrics, loading, error, refresh };
}
