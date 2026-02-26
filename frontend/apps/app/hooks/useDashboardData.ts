'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from './useWebSocket';
import api, { aiInsights } from '@dmt/api';
import { toast } from 'react-hot-toast';

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
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStatus, setAiStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Dynamically determine WebSocket URL based on tenant
  const [wsUrls, setWsUrls] = useState<{ url: string | null; fallback: string | null }>({
    url: null,
    fallback: null
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const getTenantId = () => {
        const stored = localStorage.getItem('dmt-tenant');
        if (stored && stored !== 'undefined' && stored !== 'null') return stored;

        const host = window.location.hostname;
        const parts = host.split('.');
        if (parts.length > 1 && parts[0] !== 'localhost') {
          return parts[0];
        }
        return 'default';
      };

      const tenant = getTenantId();
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = window.location.port;

      // Attempt direct connection to 8000 first, fallback to current port
      const directUrl = `${protocol}//${host}:8000/ws/telemetry/${tenant}/`;
      const fallbackUrl = `${protocol}//${host}${port ? `:${port}` : ''}/ws/telemetry/${tenant}/`;

      setWsUrls({
        url: directUrl,
        fallback: fallbackUrl
      });

      // Logic for fallback handling is currently partially in useWebSocket component logic 
      // but we force the preferred order here.
    }
  }, []);

  const { lastMessage } = useWebSocket(wsUrls.url || '', wsUrls.fallback || undefined);

  const { token } = useAuth(); // Assuming useAuth exposes token or user.accessToken

  const [isFetching, setIsFetching] = useState(false);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!token || fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      setIsFetching(true);
      setLoading(true);
      const params = projectId ? { project_id: projectId } : {};

      console.log(`[DashboardData] Fetching data for project: ${projectId || 'Global'}`);

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
      fetchingRef.current = false;
      setIsFetching(false);
      setLoading(false);
    }
  }, [token, projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create a debounced version of fetchData for WebSocket events
  const debouncedFetchData = useCallback(() => {
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 500); // 500ms debounce
    return () => clearTimeout(timeoutId);
  }, [fetchData]);

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'metrics_update') {
        debouncedFetchData();
      } else if (lastMessage.type === 'ai_insight_update') {
        console.log(`[WebSocket] ${lastMessage.type} received, refreshing insights...`);
        setIsRefreshingInsights(false);
        setAiProgress(100);
        setAiStatus('Complete');
        fetchData(); // AI update can be immediate
        // Reset progress after a short delay
        setTimeout(() => {
          setAiProgress(0);
          setAiStatus('');
        }, 2000);
      } else if (lastMessage.type === 'ai_insight_progress') {
        const payload = lastMessage.message || lastMessage;
        if (payload.progress !== undefined) {
          setIsRefreshingInsights(true);
          setAiProgress(payload.progress);
          setAiStatus(payload.status || 'Processing...');
        }
      }
    }
  }, [lastMessage, fetchData, debouncedFetchData]);

  const refreshInsights = async () => {
    try {
      setIsRefreshingInsights(true);
      await aiInsights.refresh(projectId);
      toast.success("AI Insights refresh triggered");
    } catch (err: any) {
      console.error('[RefreshInsights] Error:', err);
      toast.error(err.message || "Failed to trigger AI insights refresh");
    } finally {
      // Don't set to false here, wait for WebSocket 'ai_insight_update' or 'ai_insight_progress'
      // to manage the state after the trigger call succeeds.
    }
  };

  return {
    summary, velocity, compliance, insights, forecast, assigneeDistribution,
    loading, error, refresh: fetchData, refreshInsights, isRefreshingInsights,
    aiProgress, aiStatus
  };
}
