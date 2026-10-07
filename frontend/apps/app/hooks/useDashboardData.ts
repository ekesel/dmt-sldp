'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from './useWebSocket';
import api, { aiInsights } from '@dmt/api';
import { toast } from 'react-hot-toast';

export interface DashboardSummary {
  velocity: number;
  compliance_rate: number;
  bugs_resolved: number;
  cycle_time: number;
  ai_usage_percent: number;
  code_ai_usage_percent: number;
}

export interface VelocityData {
  sprint_name: string;
  velocity: number;
  total_story_points_completed: number;
}

export interface ComplianceData {
  sprint_name: string;
  compliance_rate_percent: number;
}

export interface Insight {
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

export interface DashboardDataResult {
  summary: DashboardSummary | null;
  velocity: VelocityData[];
  compliance: ComplianceData[];
  insights: Insight[];
  forecast: Record<string, string> | null;
  assigneeDistribution: AssigneeEntry[];
}

export function useDashboardData(projectId?: number | null, startDate?: string | null, endDate?: string | null) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStatus, setAiStatus] = useState('');

  const { lastMessage } = useWebSocket();

  const queryKey = ['dashboard-data', projectId ?? 'all', startDate ?? '', endDate ?? ''];

  const { data, isLoading, isFetching, error, refetch } = useQuery<DashboardDataResult, Error>({
    queryKey,
    queryFn: async () => {
      const params: Record<string, any> = projectId ? { project_id: projectId } : {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const [summaryData, velocityData, complianceData, insightsData, forecastData, assigneeData] = await Promise.all([
        api.get<DashboardSummary>('dashboard/summary/', { params }).then(r => r.data),
        api.get<VelocityData[]>('dashboard/velocity/', { params }).then(r => r.data),
        api.get<ComplianceData[]>('dashboard/compliance/', { params }).then(r => r.data),
        aiInsights.list(params) as unknown as Promise<Insight[]>,
        api.get<Record<string, string>>('dashboard/forecast/', { params }).then(r => r.data).catch(() => null),
        api.get<AssigneeEntry[]>('dashboard/assignee-distribution/', { params }).then(r => r.data).catch(() => []),
      ]);

      return {
        summary: summaryData,
        velocity: velocityData,
        compliance: complianceData,
        insights: insightsData,
        forecast: forecastData,
        assigneeDistribution: assigneeData,
      };
    },
    enabled: Boolean(token),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const lastProcessedMessageRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (lastMessage && lastMessage !== lastProcessedMessageRef.current) {
      lastProcessedMessageRef.current = lastMessage;
      if (lastMessage.type === 'metrics_update') {
        // Debounce invalidation so hundreds of work item saves during sync
        // are coalesced into a single dashboard refetch after updates settle
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        }, 1500);
      } else if (lastMessage.type === 'ai_insight_update') {
        setIsRefreshingInsights(false);
        setAiProgress(100);
        setAiStatus('Complete');
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        setTimeout(() => {
          setAiProgress(0);
          setAiStatus('');
        }, 2000);
      } else if (lastMessage.type === 'ai_insight_progress') {
        const payload = (lastMessage.message || lastMessage) as Record<string, unknown>;
        if (payload.progress !== undefined) {
          setIsRefreshingInsights(true);
          setAiProgress(payload.progress as number);
          setAiStatus((payload.status as string) || 'Processing...');
        }
      }
    }
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [lastMessage, queryClient]);

  const refreshInsights = async () => {
    try {
      setIsRefreshingInsights(true);
      await aiInsights.refresh(projectId);
      toast.success('AI Insights refresh triggered');
    } catch (err: any) {
      console.error('[RefreshInsights] Error:', err);
      toast.error(err.message || 'Failed to trigger AI insights refresh');
      setIsRefreshingInsights(false);
    }
  };

  return {
    summary: data?.summary ?? null,
    velocity: data?.velocity ?? [],
    compliance: data?.compliance ?? [],
    insights: data?.insights ?? [],
    forecast: data?.forecast ?? null,
    assigneeDistribution: data?.assigneeDistribution ?? [],
    loading: isLoading,
    isFetching,
    error: error ? error.message || 'Failed to load dashboard data' : null,
    refresh: refetch,
    refreshInsights,
    isRefreshingInsights,
    aiProgress,
    aiStatus,
  };
}
