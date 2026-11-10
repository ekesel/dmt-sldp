'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from './useWebSocket';
import api, { aiInsights, resourceAllocations, sprints, DeveloperMatrixRow, WorkloadWarning } from '@dmt/api';
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
  seniority?: 'junior' | 'mid' | 'senior' | string;
  capacity?: number;
  ideal_min?: number;
  ideal_max?: number;
  workload_status?: 'Overloaded' | 'Balanced' | 'Underutilised' | string | null;
  percentile?: number | null;
  effective_load?: number;
  has_allocation?: boolean;
  allocation_percentage?: number | null;
  allocation_period_label?: string;
}

export interface SprintDateInfo {
  id: number;
  name?: string;
  start_date?: string | null;
  end_date?: string | null;
  status?: string;
}

export interface DashboardDataResult {
  summary: DashboardSummary | null;
  velocity: VelocityData[];
  compliance: ComplianceData[];
  insights: Insight[];
  forecast: Record<string, string> | null;
  assigneeDistribution: AssigneeEntry[];
  workloadWarnings: WorkloadWarning[];
  targetMonth?: { month: number; year: number; label: string };
}

export function useDashboardData(
  projectId?: number | null,
  startDate?: string | null,
  endDate?: string | null,
  sprintId?: number | number[] | string | null,
  sprintIds?: number | number[] | string | SprintDateInfo[] | null,
  selectedSprints?: SprintDateInfo[] | null
) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStatus, setAiStatus] = useState('');

  const { lastMessage } = useWebSocket();

  // Allow flexible sprintIds vs selectedSprints parameter positions
  const actualSelectedSprints: SprintDateInfo[] | null = (
    Array.isArray(sprintIds) && sprintIds.length > 0 && typeof sprintIds[0] === 'object'
      ? (sprintIds as unknown as SprintDateInfo[])
      : (selectedSprints ?? null)
  );

  const rawSprintParam = Array.isArray(sprintIds) && sprintIds.length > 0 && typeof sprintIds[0] === 'object'
    ? null
    : sprintIds;

  // When All Projects is selected (projectId is null/undefined), ignore any sprint IDs
  const effectiveSprintIds = projectId ? (rawSprintParam ?? sprintId) : null;
  const sprintKey = Array.isArray(effectiveSprintIds)
    ? effectiveSprintIds.join(',')
    : (effectiveSprintIds ?? 'all');

  const sprintsKeyPart = actualSelectedSprints && actualSelectedSprints.length > 0
    ? actualSelectedSprints.map(s => `${s.id}:${s.end_date || s.start_date || ''}`).join(',')
    : sprintKey;

  const queryKey = ['dashboard-data', projectId ?? 'all', startDate ?? '', endDate ?? '', sprintsKeyPart];

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

      const warningsParams: Record<string, any> = projectId ? { project_id: projectId } : {};

      // Determine the target date / period for resource allocation
      const now = new Date();
      let targetMonth = now.getMonth() + 1;
      let targetYear = now.getFullYear();
      let determinedDateStr: string | null = null;

      if (endDate) {
        determinedDateStr = endDate;
      } else if (startDate) {
        determinedDateStr = startDate;
      } else if (actualSelectedSprints && actualSelectedSprints.length > 0) {
        const dates = actualSelectedSprints
          .map(s => s.end_date || s.start_date)
          .filter(Boolean) as string[];
        if (dates.length > 0) {
          dates.sort();
          determinedDateStr = dates[dates.length - 1];
        }
      } else if (projectId && effectiveSprintIds) {
        // Fallback: look up sprint dates via API if not passed in actualSelectedSprints
        try {
          const list = await sprints.list(projectId);
          const idSet = new Set(
            Array.isArray(effectiveSprintIds)
              ? effectiveSprintIds.map(String)
              : [String(effectiveSprintIds)]
          );
          const matched = (list || []).filter((s: any) => idSet.has(String(s.id)));
          const dates = matched
            .map((s: any) => s.end_date || s.start_date)
            .filter(Boolean) as string[];
          if (dates.length > 0) {
            dates.sort();
            determinedDateStr = dates[dates.length - 1];
          }
        } catch {
          // fallback to now
        }
      }

      if (determinedDateStr) {
        const match = determinedDateStr.match(/^(\d{4})-(\d{2})/);
        if (match) {
          targetYear = parseInt(match[1], 10);
          targetMonth = parseInt(match[2], 10);
        } else {
          const d = new Date(determinedDateStr);
          if (!isNaN(d.getTime())) {
            targetYear = d.getFullYear();
            targetMonth = d.getMonth() + 1;
          }
        }
      }

      const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const isCurrentMonth = targetYear === now.getFullYear() && targetMonth === (now.getMonth() + 1);
      const allocationPeriodLabel = isCurrentMonth
        ? 'this month'
        : `${MONTH_NAMES[targetMonth - 1]} ${targetYear}`;

      const overviewPromise = resourceAllocations?.getOverview
        ? resourceAllocations.getOverview({ month: targetMonth, year: targetYear })
            .then(r => r?.data || null)
            .catch(() =>
              resourceAllocations.getOverview?.()
                ?.then(r => r?.data || null)
                ?.catch(() => null) ?? null
            )
        : Promise.resolve(null);

      const [summaryData, velocityData, complianceData, rawAssigneeData, warningsData, allocationOverview] = await Promise.all([
        api.get<DashboardSummary>('dashboard/summary/', { params }).then(r => r.data),
        api.get<VelocityData[]>('dashboard/velocity/', { params }).then(r => r.data),
        api.get<ComplianceData[]>('dashboard/compliance/', { params }).then(r => r.data),
        api.get<AssigneeEntry[]>('dashboard/assignee-distribution/', { params }).then(r => r.data).catch(() => []),
        api.get<{ warnings: WorkloadWarning[] }>('dashboard/workload-warnings/', { params: warningsParams }).then(r => r.data?.warnings || []).catch(() => []),
        overviewPromise,
      ]);

      const devById = new Map<number, DeveloperMatrixRow>();
      const devByName = new Map<string, DeveloperMatrixRow>();
      const hasOverviewDevelopers = Boolean(
        allocationOverview?.developers && Array.isArray(allocationOverview.developers) && allocationOverview.developers.length > 0
      );

      if (hasOverviewDevelopers && allocationOverview?.developers) {
        for (const dev of allocationOverview.developers) {
          if (dev.developer_id) devById.set(dev.developer_id, dev);
          if (dev.developer_name) devByName.set(dev.developer_name.trim().toLowerCase(), dev);
        }
      }

      const assigneeData: AssigneeEntry[] = (rawAssigneeData || []).map((assignee) => {
        let allocPct: number | null = null;
        let hasAlloc: boolean | undefined = undefined;

        if (hasOverviewDevelopers) {
          const dev = (assignee.id ? devById.get(assignee.id) : null) || devByName.get(assignee.name.trim().toLowerCase());
          if (dev) {
            if (projectId) {
              const val = dev.allocations?.[projectId] ?? dev.allocations?.[String(projectId)];
              allocPct = val !== undefined ? Number(val) : 0;
            } else {
              allocPct = Number(dev.total_allocated_percentage ?? 0);
            }
          } else {
            // Not in developer allocation sheet for this period => 0% allocation
            allocPct = 0;
          }
          hasAlloc = allocPct > 0;
        }

        return {
          ...assignee,
          allocation_percentage: allocPct,
          has_allocation: hasAlloc,
          allocation_period_label: allocationPeriodLabel,
        };
      });

      return {
        summary: summaryData,
        velocity: velocityData,
        compliance: complianceData,
        insights: [],
        forecast: null,
        assigneeDistribution: assigneeData,
        workloadWarnings: warningsData,
        targetMonth: {
          month: targetMonth,
          year: targetYear,
          label: allocationPeriodLabel,
        },
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
    workloadWarnings: data?.workloadWarnings ?? [],
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
