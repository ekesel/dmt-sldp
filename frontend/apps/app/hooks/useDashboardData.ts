'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from './useWebSocket';

interface DashboardSummary {
  velocity: number;
  compliance_rate: number;
  bugs_resolved: number;
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
  suggestions: any[];
  created_at: string;
}

export function useDashboardData(projectId?: number | null) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [velocity, setVelocity] = useState<VelocityData[]>([]);
  const [compliance, setCompliance] = useState<ComplianceData[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [forecast, setForecast] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamically determine WebSocket URL based on tenant
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const tenant = hostname.split('.')[0];
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      setWsUrl(`${protocol}//${window.location.host}/ws/telemetry/${tenant}/`);
    }
  }, []);

  const { lastMessage } = useWebSocket(wsUrl);

  const { token } = useAuth(); // Assuming useAuth exposes token or user.accessToken

  const fetchData = useCallback(async () => {
    if (!token) return; // Don't fetch if not authenticated

    try {
      setLoading(true);
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const timestamp = Date.now();
      const queryParams = new URLSearchParams({
        _t: timestamp.toString(),
        ...(projectId ? { project_id: projectId.toString() } : {})
      });
      const queryString = `?${queryParams.toString()}`;

      const [summaryRes, velocityRes, complianceRes, insightsRes, forecastRes] = await Promise.all([
        fetch(`/api/dashboard/summary/${queryString}`, { headers, cache: 'no-store' }),
        fetch(`/api/dashboard/velocity/${queryString}`, { headers, cache: 'no-store' }),
        fetch(`/api/dashboard/compliance/${queryString}`, { headers, cache: 'no-store' }),
        fetch(`/api/ai-insights/${queryString}`, { headers, cache: 'no-store' }),
        fetch(`/api/dashboard/forecast/${queryString}`, { headers, cache: 'no-store' })
      ]);

      if (!summaryRes.ok || !velocityRes.ok || !complianceRes.ok || !insightsRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      setSummary(await summaryRes.json());
      setVelocity(await velocityRes.json());
      setCompliance(await complianceRes.json());
      setInsights(await insightsRes.json());

      // Forecast might 404 if no history exists yet; handle gracefully
      if (forecastRes.ok) {
        setForecast(await forecastRes.json());
      } else {
        setForecast(null);
      }

      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [token, projectId]);

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

  return { summary, velocity, compliance, insights, forecast, loading, error, refresh: fetchData };
}
