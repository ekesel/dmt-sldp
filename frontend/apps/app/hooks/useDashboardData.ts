'use client';
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

interface DashboardSummary {
  velocity: number;
  compliance_rate: number;
  defects: number;
  cycle_time: number;
}

interface VelocityData {
  sprint_name: string;
  velocity: number;
  total_story_points_completed: number;
}

interface ComplianceData {
  sprint_name: string;
  compliance_rate_percent: number;
}

interface Insight {
  id: number;
  summary: string;
  created_at: string;
}

export function useDashboardData() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [velocity, setVelocity] = useState<VelocityData[]>([]);
  const [compliance, setCompliance] = useState<ComplianceData[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { lastMessage } = useWebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/dashboard');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, velocityRes, complianceRes, insightsRes] = await Promise.all([
        fetch('/api/dashboard/summary/'),
        fetch('/api/dashboard/velocity/'),
        fetch('/api/dashboard/compliance/'),
        fetch('/api/ai-insights/')
      ]);

      if (!summaryRes.ok || !velocityRes.ok || !complianceRes.ok || !insightsRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      setSummary(await summaryRes.json());
      setVelocity(await velocityRes.json());
      setCompliance(await complianceRes.json());
      setInsights(await insightsRes.json());
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time updates
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'metrics_update') {
        // Refresh all data on metric update for simplicity, or optimize to update specific state
        fetchData();
      } else if (lastMessage.type === 'insight_ready') {
        // Optimistically add new insight
        setInsights(prev => [lastMessage.data, ...prev]);
      }
    }
  }, [lastMessage, fetchData]);

  return { summary, velocity, compliance, insights, loading, error, refresh: fetchData };
}
