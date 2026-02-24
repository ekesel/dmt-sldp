'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from './useWebSocket';
import api, { aiInsights } from '@dmt/api';

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
  project_name?: string | null;
  created_at: string;
}

export interface AssigneeEntry {
  id: number | null;
  name: string;
  email: string;
  is_portal_user: boolean;
  total: number;
  in_progress: number;
  completed: number;
  avg_cycle_time_days: number | null;
}

export function useDashboardData(projectId?: number | null) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [velocity, setVelocity] = useState<VelocityData[]>([]);
  const [compliance, setCompliance] = useState<ComplianceData[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [forecast, setForecast] = useState<Record<string, string> | null>(null);
  const [assigneeDistribution, setAssigneeDistribution] = useState<AssigneeEntry[]>([]);
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
      const params = projectId ? { project_id: projectId } : {};

      // Use the api instance from @dmt/api which has interceptors for token refresh
      const [summaryData, velocityData, complianceData, insightsData, forecastData, assigneeData] = await Promise.all([
        api.get<DashboardSummary>('dashboard/summary/', { params }).then(r => r.data),
        api.get<VelocityData[]>('dashboard/velocity/', { params }).then(r => r.data),
        api.get<ComplianceData[]>('dashboard/compliance/', { params }).then(r => r.data),
        aiInsights.list(params) as unknown as Promise<Insight[]>,
        api.get<Record<string, string>>('dashboard/forecast/', { params }).then(r => r.data).catch(() => null),
        api.get<AssigneeEntry[]>('dashboard/assignee-distribution/', { params }).then(r => r.data).catch(() => []),
      ]);

      setSummary(summaryData);
      setVelocity(velocityData);
      setCompliance(complianceData);
      setInsights(insightsData);
      setForecast(forecastData);
      setAssigneeDistribution(assigneeData);

      setError(null);
    } catch (err: any) {
      console.error('Dashboard load error:', err);
      setError(err.message || 'Failed to load dashboard data');
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

  return { summary, velocity, compliance, insights, forecast, assigneeDistribution, loading, error, refresh: fetchData };
}
