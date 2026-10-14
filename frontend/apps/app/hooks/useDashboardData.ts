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

export function useDashboardData(
  projectId?: number | null,
  startDate?: string | null,
  endDate?: string | null,
  sprintId?: number | number[] | string | null,
  sprintIds?: number | number[] | string | null
) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStatus, setAiStatus] = useState('');

  const { lastMessage } = useWebSocket();

  // When All Projects is selected (projectId is null/undefined), ignore any sprint IDs
  const effectiveSprintIds = projectId ? (sprintIds ?? sprintId) : null;
  const sprintKey = Array.isArray(effectiveSprintIds)
    ? effectiveSprintIds.join(',')
    : (effectiveSprintIds ?? 'all');

  const queryKey = ['dashboard-data', projectId ?? 'all', startDate ?? '', endDate ?? '', sprintKey];

  const { data, isLoading, isFetching, error, refetch } = useQuery<DashboardDataResult, Error>({
    queryKey,
    queryFn: async () => {
      const params: Record<string, any> = projectId ? { project_id: projectId } : {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (projectId && effectiveSprintIds !== undefined && effectiveSprintIds !== null && effectiveSprintIds !== '') {
        const sprintIdsStr = Array.isArray(effectiveSprintIds)
          ? effectiveSprintIds.filter(Boolean).join(',')
          : String(effectiveSprintIds);

        if (sprintIdsStr) {
          params.sprint_ids = sprintIdsStr;
          const singleNum = Number(sprintIdsStr);
          if (!isNaN(singleNum) && !sprintIdsStr.includes(',')) {
            params.sprint_id = singleNum;
          }
        }
      }

      const [summaryData, velocityData, complianceData, assigneeData] = await Promise.all([
        api.get<DashboardSummary>('dashboard/summary/', { params }).then(r => r.data),
        api.get<VelocityData[]>('dashboard/velocity/', { params }).then(r => r.data),
        api.get<ComplianceData[]>('dashboard/compliance/', { params }).then(r => r.data),
        api.get<AssigneeEntry[]>('dashboard/assignee-distribution/', { params }).then(r => r.data).catch(() => []),
      ]);

      return {
        summary: summaryData,
        velocity: velocityData,
        compliance: complianceData,
        insights: [],
        forecast: null,
        assigneeDistribution: assigneeData,
      };
    },
    enabled: Boolean(token),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData, previousQuery) => {
      // Clear stale sprint data and previous project metrics when switching projects
      if (previousQuery?.queryKey[1] !== (projectId ?? 'all')) {
        return undefined;
      }
      return previousData;
    },
  });

  // AI Insights and Forecast: project-level ONLY, never sprint-filtered
  const aiQueryKey = ['dashboard-ai', projectId ?? 'all'];

  const {
    data: aiData,
    isFetching: isAiFetching,
    error: aiError,
    refetch: refetchAi,
  } = useQuery<{ insights: Insight[]; forecast: Record<string, string> | null }, Error>({
    queryKey: aiQueryKey,
    queryFn: async () => {
      const aiParams: Record<string, any> = projectId ? { project_id: projectId } : {};
      const [insightsData, forecastData] = await Promise.all([
        aiInsights.list(aiParams) as unknown as Promise<Insight[]>,
        api.get<Record<string, string>>('dashboard/forecast/', { params: aiParams })
          .then(r => r.data)
          .catch(() => null),
      ]);

      return {
        insights: insightsData || [],
        forecast: forecastData || null,
      };
    },
    enabled: Boolean(token),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
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
        queryClient.invalidateQueries({ queryKey: ['dashboard-ai'] });
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-ai'] });
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
    insights: aiData?.insights ?? [],
    forecast: aiData?.forecast ?? null,
    assigneeDistribution: data?.assigneeDistribution ?? [],
    loading: isLoading,
    isFetching: isFetching || isAiFetching,
    error: error ? (error.message || 'Failed to load dashboard data') : (aiError ? (aiError.message || 'Failed to load AI insights') : null),
    refresh: async () => {
      await Promise.all([refetch(), refetchAi()]);
    },
    refreshInsights,
    isRefreshingInsights,
    aiProgress,
    aiStatus,
  };
}
