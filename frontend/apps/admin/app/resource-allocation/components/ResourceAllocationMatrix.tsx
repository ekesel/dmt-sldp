'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOverviewQueryOptions } from '../queries/query-options';
import { useSaveAllocationsMutation, usePublishAllocationsMutation } from '../queries/mutation-options';
import {
  Layers,
  Calendar,
  Save,
  Send,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Users,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  resourceAllocations,
  AllocationProjectHeader,
  DeveloperMatrixRow,
  ResourceAllocationOverviewData,
  SaveAllocationItemPayload,
  AllocationDeveloperSummary,
} from '@dmt/api';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface EditableDeveloperRow extends Omit<DeveloperMatrixRow, 'allocations'> {
  allocations: Record<string | number, number | string>;
  isDirty?: boolean;
  isSaving?: boolean;
}

/**
 * Extracts a user-friendly error message from an unknown error.
 */
function getErrorMessage(error: unknown, defaultMessage = 'An unexpected error occurred.'): string {
  if (error && typeof error === 'object') {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    if (err.message) {
      return err.message;
    }
  }
  return defaultMessage;
}

/**
 * Returns Tailwind class strings for allocation matrix cell inputs using globals.css tokens.
 */
function getCellInputClasses(isOver: boolean, hasAllocation: boolean): string {
  if (isOver) {
    return 'border-destructive/50 bg-destructive/10 text-destructive focus:ring-2 focus:ring-destructive/30';
  }
  if (hasAllocation) {
    return 'border-primary/40 bg-primary/10 text-primary font-bold focus:ring-2 focus:ring-primary/40';
  }
  return 'border-border/80 bg-muted/40 text-muted-foreground hover:border-border focus:bg-card focus:ring-2 focus:ring-primary/30';
}

/**
 * Returns Tailwind class strings for row backgrounds based on allocation state.
 */
function getRowBgClass(isOver: boolean, isDirty?: boolean): string {
  if (isOver) return 'bg-destructive/5';
  if (isDirty) return 'bg-primary/5';
  return '';
}

/**
 * Returns Tailwind class strings for capacity text colors.
 */
function getCapacityTextClass(isOver: boolean, isFull: boolean): string {
  if (isOver) return 'text-destructive';
  if (isFull) return 'text-success';
  return 'text-primary';
}

/**
 * Returns Tailwind class strings for capacity progress bar fills.
 */
function getProgressBarFillClass(isOver: boolean, isFull: boolean): string {
  if (isOver) return 'bg-destructive';
  if (isFull) return 'bg-success';
  return 'bg-primary';
}

interface PendingNavigation {
  type: 'month' | 'year' | 'refresh';
  value?: number;
}

/**
 * ResourceAllocationMatrix Component
 *
 * Provides a real-time matrix grid for admins to plan, distribute, and publish
 * monthly developer capacity allocations across active projects.
 */
export function ResourceAllocationMatrix() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isBulkSaving, setIsBulkSaving] = useState<boolean>(false);
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);

  const [projects, setProjects] = useState<AllocationProjectHeader[]>([]);
  const [developers, setDevelopers] = useState<EditableDeveloperRow[]>([]);
  const [monthlyStatus, setMonthlyStatus] = useState<'DRAFT' | 'PUBLISHED' | string>('DRAFT');

  // Fetch matrix data from API using React Query
  const {
    data: queryData,
    isLoading,
    error: queryError,
    refetch: fetchOverview,
  } = useQuery(getOverviewQueryOptions(selectedMonth, selectedYear));

  const saveMutation = useSaveAllocationsMutation(selectedMonth, selectedYear);
  const publishMutation = usePublishAllocationsMutation(selectedMonth, selectedYear);

  const loadError = queryError ? getErrorMessage(queryError, 'Failed to load allocation matrix.') : null;

  useEffect(() => {
    if (queryError) {
      console.error('Failed to load resource allocations:', queryError);
      toast.error(loadError || 'Failed to load allocation matrix.');
    }
  }, [queryError, loadError]);

  // Sync React Query data into local state for editing
  useEffect(() => {
    if (queryData) {
      const { overviewRes, developersRes, projectsRes } = queryData;
      if (overviewRes && overviewRes.status && overviewRes.data) {
        // Use master projects list if available, fallback to overview
        const masterProjects = (projectsRes && projectsRes.status && projectsRes.data) ? projectsRes.data : overviewRes.data.projects || [];
        setProjects(masterProjects);

        // Get allocations lookup from overview
        const overviewDevelopersMap = new Map(
          (overviewRes.data.developers || []).map((d) => [d.developer_id, d])
        );

        // Map over master developers list if available, else overview developers
        const masterDevelopers = (developersRes && developersRes.status && developersRes.data) ? developersRes.data : overviewRes.data.developers || [];
        
        const mappedDevelopers = masterDevelopers.map((dev: Partial<AllocationDeveloperSummary & DeveloperMatrixRow>) => {
          const devId = dev.id || dev.developer_id!;
          const devName = dev.full_name || dev.developer_name!;
          const overviewDev = overviewDevelopersMap.get(devId) || {
            total_allocated_percentage: 0,
            remaining_capacity_percentage: 100,
            is_over_capacity: false,
            allocations: {},
          };

          return {
            developer_id: devId,
            developer_name: devName,
            total_allocated_percentage: overviewDev.total_allocated_percentage,
            remaining_capacity_percentage: overviewDev.remaining_capacity_percentage,
            is_over_capacity: overviewDev.is_over_capacity,
            allocations: { ...overviewDev.allocations },
            isDirty: false,
            isSaving: false,
          };
        });

        setDevelopers(mappedDevelopers);
        setMonthlyStatus(overviewRes.data.monthly_status || 'DRAFT');
      }
    }
  }, [queryData]);

  // Guard against accidental tab close or page reload when unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasDirty = developers.some((d) => d.isDirty);
      if (hasDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [developers]);

  // Handle local cell edit and real-time recalculation without stripping decimal points
  const handleAllocationChange = (
    developerId: number,
    projectId: number,
    rawVal: string
  ) => {
    let sanitizedVal = rawVal;
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed) && parsed > 100) {
      sanitizedVal = '100';
    } else if (!isNaN(parsed) && parsed < 0) {
      sanitizedVal = '0';
    }

    setDevelopers((prevRows) =>
      prevRows.map((dev) => {
        if (dev.developer_id !== developerId) return dev;

        const updatedAllocations = {
          ...dev.allocations,
          [projectId]: sanitizedVal,
        };

        // Recalculate total safely parsing numeric values
        const total = Object.values(updatedAllocations).reduce<number>(
          (acc, val) => acc + (parseFloat(String(val)) || 0),
          0
        );
        const roundedTotal = Math.round(total * 100) / 100;
        const remaining = Math.max(0, Math.round((100 - roundedTotal) * 100) / 100);
        const isOver = roundedTotal > 100;

        return {
          ...dev,
          allocations: updatedAllocations,
          total_allocated_percentage: roundedTotal,
          remaining_capacity_percentage: remaining,
          is_over_capacity: isOver,
          isDirty: true,
        };
      })
    );
  };

  // On blur, normalize trailing decimals or empty values (e.g., "12." -> 12)
  const handleAllocationBlur = (developerId: number, projectId: number) => {
    setDevelopers((prevRows) =>
      prevRows.map((dev) => {
        if (dev.developer_id !== developerId) return dev;
        const raw = dev.allocations[projectId];
        const numeric = parseFloat(String(raw));
        const normalized = isNaN(numeric) || numeric <= 0 ? 0 : Math.round(numeric * 100) / 100;
        return {
          ...dev,
          allocations: {
            ...dev.allocations,
            [projectId]: normalized,
          },
        };
      })
    );
  };

  // Save single developer row
  const saveDeveloperRow = async (dev: EditableDeveloperRow) => {
    try {
      setDevelopers((prev) =>
        prev.map((d) => (d.developer_id === dev.developer_id ? { ...d, isSaving: true } : d))
      );

      const allocationItems: SaveAllocationItemPayload[] = Object.entries(dev.allocations)
        .filter(([, pct]) => (parseFloat(String(pct)) || 0) > 0)
        .map(([pId, pct]) => ({
          project_id: Number(pId),
          percentage_allocated: parseFloat(String(pct)) || 0,
        }));

      const res = await saveMutation.mutateAsync({
        user_id: dev.developer_id,
        month: selectedMonth,
        year: selectedYear,
        status: monthlyStatus,
        allocations: allocationItems,
      });

      if (res.status) {
        toast.success(res.message || `Saved allocation for ${dev.developer_name}`);
        setDevelopers((prev) =>
          prev.map((d) =>
            d.developer_id === dev.developer_id
              ? { ...d, isDirty: false, isSaving: false }
              : d
          )
        );
      } else {
        toast.error(res.message || 'Failed to save allocation.');
        setDevelopers((prev) =>
          prev.map((d) =>
            d.developer_id === dev.developer_id ? { ...d, isSaving: false } : d
          )
        );
      }
    } catch (error: unknown) {
      console.error('Save error:', error);
      toast.error(getErrorMessage(error, `Failed to save allocation for ${dev.developer_name}`));
      setDevelopers((prev) =>
        prev.map((d) =>
          d.developer_id === dev.developer_id ? { ...d, isSaving: false } : d
        )
      );
    }
  };

  // Bulk save all dirty rows concurrently with partial-failure isolation
  const saveAllDirtyRows = async (): Promise<boolean> => {
    const dirtyRows = developers.filter((d) => d.isDirty);
    if (dirtyRows.length === 0) {
      toast('No changes to save.', { icon: 'ℹ️' });
      return true;
    }

    // Check if any dirty row has over-capacity
    const overCapacityRows = dirtyRows.filter((d) => d.is_over_capacity);
    if (overCapacityRows.length > 0) {
      const names = overCapacityRows.map((d) => d.developer_name).join(', ');
      toast.error(`Cannot save: ${names} exceed 100% allocation.`);
      return false;
    }

    setIsBulkSaving(true);

    // Mark all dirty rows as saving
    setDevelopers((prev) =>
      prev.map((d) => (d.isDirty ? { ...d, isSaving: true } : d))
    );

    const savePromises = dirtyRows.map(async (dev) => {
      const allocationItems: SaveAllocationItemPayload[] = Object.entries(dev.allocations)
        .filter(([, pct]) => (parseFloat(String(pct)) || 0) > 0)
        .map(([pId, pct]) => ({
          project_id: Number(pId),
          percentage_allocated: parseFloat(String(pct)) || 0,
        }));

      const res = await saveMutation.mutateAsync({
        user_id: dev.developer_id,
        month: selectedMonth,
        year: selectedYear,
        status: monthlyStatus,
        allocations: allocationItems,
      });

      if (!res || !res.status) {
        throw new Error(res?.message || `Failed to save ${dev.developer_name}`);
      }

      return dev.developer_id;
    });

    const results = await Promise.allSettled(savePromises);

    const successfulIds = new Set<number>();
    let errorCount = 0;

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        successfulIds.add(result.value);
      } else {
        errorCount++;
      }
    });

    // Update local state: only mark successfully saved rows clean; preserve dirty state on failed rows
    setDevelopers((prev) =>
      prev.map((dev) => {
        if (successfulIds.has(dev.developer_id)) {
          return { ...dev, isDirty: false, isSaving: false };
        }
        if (dev.isDirty) {
          return { ...dev, isSaving: false };
        }
        return dev;
      })
    );

    setIsBulkSaving(false);

    if (errorCount === 0) {
      toast.success(`Successfully saved all ${successfulIds.size} updated developer allocations.`);
      return true;
    } else {
      toast.error(
        `Saved ${successfulIds.size} developers, but ${errorCount} failed. Failed rows remain unsaved for retry.`
      );
      return false;
    }
  };

  // Publish monthly allocations
  const handlePublishMonth = async () => {
    const hasOverCapacity = developers.some((d) => d.is_over_capacity);
    if (hasOverCapacity) {
      toast.error(
        'Cannot publish: One or more developers exceed 100% capacity. Please adjust allocations first.'
      );
      return;
    }

    // If there are unsaved changes, prompt
    const hasUnsaved = developers.some((d) => d.isDirty);
    if (hasUnsaved) {
      toast.error('Please save all pending changes before publishing the monthly allocation.');
      return;
    }

    try {
      setIsPublishing(true);
      const res = await publishMutation.mutateAsync({
        month: selectedMonth,
        year: selectedYear,
      });

      if (res.status) {
        toast.success(
          res.message ||
          `Resource allocations for ${selectedYear}-${String(selectedMonth).padStart(2, '0')} published successfully!`
        );
        setShowPublishModal(false);
        setMonthlyStatus('PUBLISHED');
        fetchOverview();
      } else {
        toast.error(res.message || 'Failed to publish allocations.');
      }
    } catch (error: unknown) {
      console.error('Publish error:', error);
      toast.error(getErrorMessage(error, 'Failed to publish monthly allocations.'));
    } finally {
      setIsPublishing(false);
    }
  };

  // Safe Month Change Handler with custom modal guard
  const handleMonthChange = (newMonth: number) => {
    if (developers.some((d) => d.isDirty)) {
      setPendingNavigation({ type: 'month', value: newMonth });
      return;
    }
    setSelectedMonth(newMonth);
  };

  // Safe Year Change Handler with custom modal guard
  const handleYearChange = (newYear: number) => {
    if (developers.some((d) => d.isDirty)) {
      setPendingNavigation({ type: 'year', value: newYear });
      return;
    }
    setSelectedYear(newYear);
  };

  // Safe Refresh Handler with custom modal guard
  const handleRefresh = () => {
    if (developers.some((d) => d.isDirty)) {
      setPendingNavigation({ type: 'refresh' });
      return;
    }
    fetchOverview();
  };

  // Execute confirmed pending navigation
  const executePendingNavigation = (nav: PendingNavigation) => {
    if (nav.type === 'month' && nav.value !== undefined) {
      setSelectedMonth(nav.value);
    } else if (nav.type === 'year' && nav.value !== undefined) {
      setSelectedYear(nav.value);
    } else if (nav.type === 'refresh') {
      fetchOverview();
    }
    setPendingNavigation(null);
  };

  // Handle Save & Proceed from Unsaved Changes Modal
  const handleSaveAndProceed = async () => {
    if (!pendingNavigation) return;
    const saveSucceeded = await saveAllDirtyRows();
    if (saveSucceeded) {
      executePendingNavigation(pendingNavigation);
    }
  };

  // Summary Metrics calculations
  const metrics = useMemo(() => {
    const totalDevs = developers.length;
    const fullyAllocated = developers.filter(
      (d) => d.total_allocated_percentage === 100
    ).length;
    const underAllocated = developers.filter(
      (d) => d.total_allocated_percentage < 100
    ).length;
    const overAllocated = developers.filter((d) => d.is_over_capacity).length;
    const dirtyCount = developers.filter((d) => d.isDirty).length;

    // Project aggregate totals
    const projectTotals: Record<number, number> = {};
    projects.forEach((p) => {
      projectTotals[p.id] = 0;
    });

    developers.forEach((dev) => {
      projects.forEach((proj) => {
        const val = parseFloat(String(dev.allocations[proj.id])) || 0;
        projectTotals[proj.id] = Math.round(((projectTotals[proj.id] || 0) + val) * 100) / 100;
      });
    });

    const unallocatedDevs = developers.filter(
      (d) => (d.total_allocated_percentage || 0) === 0
    );
    const unallocatedCount = unallocatedDevs.length;

    return {
      totalDevs,
      fullyAllocated,
      underAllocated,
      overAllocated,
      unallocatedDevs,
      unallocatedCount,
      projectTotals,
      dirtyCount,
    };
  }, [developers, projects]);

  const yearsList = [
    currentDate.getFullYear() - 1,
    currentDate.getFullYear(),
    currentDate.getFullYear() + 1,
  ];

  const renderMatrixContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">
            Loading allocation matrix for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}...
          </p>
        </div>
      );
    }
    
    if (loadError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="p-3.5 bg-destructive/10 text-destructive rounded-2xl mb-3 border border-destructive/20">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Failed to Load Allocations</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">{loadError}</p>
          <button
            type="button"
            onClick={() => fetchOverview()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Loading</span>
          </button>
        </div>
      );
    }

    if (projects.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <Briefcase className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No Active Projects Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            There are no active projects configured in the system for resource allocation.
          </p>
        </div>
      );
    }

    if (developers.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <Users className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No Developers Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            No active technical developers found.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[400px]">
        <table className="w-full text-left border-collapse min-w-max">
          {/* Header */}
          <thead>
            <tr className="border-b border-border bg-muted text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              {/* Developer Name Column (Sticky top-left) */}
              <th className="sticky top-0 left-0 z-30 bg-muted px-4 py-3.5 min-w-56 max-w-64 border-r border-b border-border">
                Developer (Rows)
              </th>

              {/* Dynamic Project Columns */}
              {projects.map((proj) => (
                <th
                  key={proj.id}
                  className="sticky top-0 z-20 bg-muted px-4 py-3.5 text-center min-w-32 border-r border-b border-border/50"
                >
                  <div className="font-semibold text-foreground truncate" title={proj.name}>
                    {proj.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground lowercase">
                    {metrics.projectTotals[proj.id] || 0}% total
                  </div>
                </th>
              ))}

              {/* Total Allocated Column */}
              <th className="sticky top-0 z-20 bg-muted px-4 py-3.5 text-center min-w-36 border-r border-b border-border/50">
                Total Capacity
              </th>

              {/* Remaining Column */}
              <th className="sticky top-0 z-20 bg-muted px-4 py-3.5 text-center min-w-24 border-r border-b border-border/50">
                Remaining
              </th>

              {/* Row Actions */}
              <th className="sticky top-0 z-20 bg-muted px-4 py-3.5 text-center min-w-24 border-b border-border">
                Actions
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-border/60 text-sm">
            {developers.map((dev) => {
              const total = dev.total_allocated_percentage;
              const isOver = dev.is_over_capacity;
              const isFull = total === 100;

              return (
                <tr
                  key={dev.developer_id}
                  className={`transition-colors hover:bg-muted/30 ${getRowBgClass(isOver, dev.isDirty)}`}
                >
                  {/* Sticky Developer Row Header */}
                  <td
                    className={`sticky left-0 z-10 px-4 py-3.5 border-r border-border backdrop-blur-sm ${isOver
                        ? 'bg-destructive/10'
                        : 'bg-card'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar Initials */}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${isOver
                            ? 'bg-destructive/20 text-destructive border border-destructive/30'
                            : 'bg-primary/10 text-primary border border-primary/20'
                          }`}
                      >
                        {dev.developer_name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                          <span>{dev.developer_name}</span>
                          {dev.isDirty && (
                            <span
                              className="w-2 h-2 rounded-full bg-primary"
                              title="Unsaved changes"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Project Allocation Cells */}
                  {projects.map((proj) => {
                    const rawVal = dev.allocations[proj.id] ?? 0;
                    const hasAllocation = (parseFloat(String(rawVal)) || 0) > 0;

                    return (
                      <td
                        key={proj.id}
                        className="px-3 py-2.5 text-center border-r border-border/50"
                      >
                        <div className="relative inline-flex items-center justify-center group">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={rawVal === 0 || rawVal === '0' ? '' : rawVal}
                            placeholder="0"
                            onChange={(e) =>
                              handleAllocationChange(
                                dev.developer_id,
                                proj.id,
                                e.target.value
                              )
                            }
                            onBlur={() =>
                              handleAllocationBlur(
                                dev.developer_id,
                                proj.id
                              )
                            }
                            className={`w-16 text-center text-sm font-semibold rounded-lg px-1.5 py-1.5 border transition ${getCellInputClasses(
                              isOver,
                              hasAllocation
                            )}`}
                          />
                          <span className="ml-1 text-xs text-muted-foreground font-medium">
                            %
                          </span>
                        </div>
                      </td>
                    );
                  })}

                  {/* Total Allocation Progress Bar */}
                  <td className="px-4 py-3.5 border-r border-border/50">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className={getCapacityTextClass(isOver, isFull)}>
                          {total}%
                        </span>
                        {isFull && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-success/20 text-success rounded font-bold uppercase">
                            100%
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getProgressBarFillClass(isOver, isFull)}`}
                          style={{ width: `${Math.min(100, total)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Remaining Capacity */}
                  <td className="px-4 py-3.5 text-center border-r border-border/50">
                    <span
                      className={`text-xs font-medium ${dev.remaining_capacity_percentage > 0
                          ? 'text-warning'
                          : 'text-muted-foreground'
                        }`}
                    >
                      {dev.remaining_capacity_percentage}%
                    </span>
                  </td>

                  {/* Row Action: Save or Status */}
                  <td className="px-4 py-3.5 text-center">
                    {dev.isDirty ? (
                      <button
                        onClick={() => saveDeveloperRow(dev)}
                        disabled={dev.isSaving || dev.is_over_capacity}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-lg shadow-sm transition disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{dev.isSaving ? 'Saving...' : 'Save'}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground/70 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Synced
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Table Footer: Column Summary */}
          <tfoot>
            <tr className="bg-muted border-t-2 border-border font-semibold text-xs text-foreground">
              <td className="sticky bottom-0 left-0 z-30 bg-muted px-4 py-3.5 border-r border-t-2 border-border">
                Project Workload Sum
              </td>
              {projects.map((proj) => (
                <td
                  key={proj.id}
                  className="sticky bottom-0 z-20 bg-muted px-4 py-3.5 text-center border-r border-t-2 border-border/50 font-bold text-primary"
                >
                  {metrics.projectTotals[proj.id] || 0}%
                </td>
              ))}
              <td className="sticky bottom-0 z-20 bg-muted px-4 py-3.5 text-center border-r border-t-2 border-border/50">
                <span className="text-muted-foreground font-normal">
                  Avg / Dev:{' '}
                  {developers.length > 0
                    ? Math.round(
                      (developers.reduce(
                        (acc, d) => acc + d.total_allocated_percentage,
                        0
                      ) /
                        developers.length) *
                      10
                    ) / 10
                    : 0}
                  %
                </span>
              </td>
              <td className="sticky bottom-0 z-20 bg-muted px-4 py-3.5 text-center border-r border-t-2 border-border/50 text-muted-foreground font-normal">
                —
              </td>
              <td className="sticky bottom-0 z-20 bg-muted px-4 py-3.5 text-center border-t-2 border-border text-muted-foreground font-normal">
                {metrics.dirtyCount > 0 ? `${metrics.dirtyCount} unsaved` : 'All saved'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card/60 border border-border/80 backdrop-blur-md p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                Resource Allocation Matrix
                {monthlyStatus === 'PUBLISHED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/30">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Published
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-warning/10 text-warning border border-warning/30">
                    <AlertTriangle className="w-3.5 h-3.5" /> Draft Mode
                  </span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Assign and monitor technical developer capacity across active projects.
              </p>
            </div>
          </div>
        </div>

        {/* Date & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Picker */}
          <div className="flex items-center gap-2 bg-muted/60 border border-border px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="bg-transparent text-sm font-medium text-foreground focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1} className="bg-popover text-foreground">
                  {name}
                </option>
              ))}
            </select>

            <span className="text-muted-foreground">/</span>

            {/* Year Picker */}
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="bg-transparent text-sm font-medium text-foreground focus:outline-none cursor-pointer"
            >
              {yearsList.map((yr) => (
                <option key={yr} value={yr} className="bg-popover text-foreground">
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh Matrix"
            className="p-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl border border-border transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Bulk Save Button */}
          {metrics.dirtyCount > 0 && (
            <button
              onClick={saveAllDirtyRows}
              disabled={isBulkSaving || metrics.overAllocated > 0}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm rounded-xl shadow transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Save ({metrics.dirtyCount})</span>
            </button>
          )}

          {/* Publish Month Button */}
          <button
            onClick={() => setShowPublishModal(true)}
            disabled={
              isPublishing ||
              metrics.overAllocated > 0 ||
              metrics.dirtyCount > 0 ||
              monthlyStatus === 'PUBLISHED'
            }
            className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-xl shadow transition ${monthlyStatus === 'PUBLISHED'
                ? 'bg-success/20 text-success border border-success/30 cursor-not-allowed'
                : 'bg-success hover:bg-success/90 text-success-foreground disabled:opacity-50'
              }`}
          >
            <Send className="w-4 h-4" />
            <span>{monthlyStatus === 'PUBLISHED' ? 'Published' : 'Publish Allocations'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card/50 border border-border p-4 rounded-xl flex items-center gap-3.5">
          <div className="p-3 bg-info/10 text-info rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
              Developers
            </p>
            <p className="text-xl font-bold text-foreground">{metrics.totalDevs}</p>
          </div>
        </div>

        <div className="bg-card/50 border border-border p-4 rounded-xl flex items-center gap-3.5">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
              Active Projects
            </p>
            <p className="text-xl font-bold text-foreground">{projects.length}</p>
          </div>
        </div>

        <div className="bg-card/50 border border-border p-4 rounded-xl flex items-center gap-3.5">
          <div className="p-3 bg-success/10 text-success rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
              100% Allocated
            </p>
            <p className="text-xl font-bold text-foreground">{metrics.fullyAllocated}</p>
          </div>
        </div>

        <div className="bg-card/50 border border-border p-4 rounded-xl flex items-center gap-3.5">
          <div className="p-3 bg-warning/10 text-warning rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
              Under-Allocated
            </p>
            <p className="text-xl font-bold text-foreground">{metrics.underAllocated}</p>
          </div>
        </div>
      </div>

      {/* Matrix Table Container */}
      <div className="bg-card/50 border border-border rounded-2xl shadow-sm overflow-hidden">
        {renderMatrixContent()}
      </div>

      {/* Publish Confirmation Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-success/10 text-success rounded-xl border border-success/20">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Publish Monthly Allocations</h3>
                <p className="text-xs text-muted-foreground">
                  {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Publishing will transition all draft resource allocations for{' '}
              <strong>
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </strong>{' '}
              to <strong className="text-success">PUBLISHED</strong> status, making them live
              across the system.
            </p>

            <div className="bg-muted/50 p-3.5 rounded-xl border border-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Developers included:</span>
                <span className="font-semibold text-foreground">{developers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active projects:</span>
                <span className="font-semibold text-foreground">{projects.length}</span>
              </div>
            </div>

            {/* Warning for unallocated developers */}
            {metrics.unallocatedCount > 0 && (
              <div className="p-3.5 bg-warning/10 border border-warning/30 rounded-xl space-y-2 text-xs">
                <div className="flex items-start gap-2 text-warning font-semibold">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Warning: {metrics.unallocatedCount}{' '}
                    {metrics.unallocatedCount === 1 ? 'user is' : 'users are'} not allocated to any project (0% capacity):
                  </span>
                </div>
                <div className="max-h-28 overflow-y-auto pl-6 space-y-1">
                  {metrics.unallocatedDevs.map((dev) => (
                    <div key={dev.developer_id} className="text-muted-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning/70 flex-shrink-0" />
                      <span className="font-medium text-foreground">{dev.developer_name}</span>
                      <span className="text-[11px] text-muted-foreground">(0% allocated)</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground pl-6">
                  Publishing will proceed with zero allocation for {metrics.unallocatedCount === 1 ? 'this user' : 'these users'}.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublishMonth}
                disabled={isPublishing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-success hover:bg-success/90 text-success-foreground rounded-xl shadow transition disabled:opacity-50"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm & Publish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Navigation Modal */}
      {pendingNavigation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-warning/10 text-warning rounded-xl border border-warning/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Unsaved Changes Detected</h3>
                <p className="text-xs text-muted-foreground">
                  {metrics.dirtyCount} developer allocation(s) modified
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              You have unsaved changes in the allocation matrix. Changing view or refreshing will discard
              these edits. How would you like to proceed?
            </p>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingNavigation(null)}
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-xl transition"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => executePendingNavigation(pendingNavigation)}
                className="px-4 py-2 text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 rounded-xl transition"
              >
                Discard Changes
              </button>
              <button
                type="button"
                onClick={handleSaveAndProceed}
                disabled={isBulkSaving || metrics.overAllocated > 0}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow transition disabled:opacity-50"
              >
                {isBulkSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save & Proceed</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
