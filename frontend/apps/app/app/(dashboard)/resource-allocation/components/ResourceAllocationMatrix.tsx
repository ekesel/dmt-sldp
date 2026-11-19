'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOverviewQueryOptions } from '../queries/query-options';
import {
  Layers,
  Calendar,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Users,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  AllocationProjectHeader,
  DeveloperMatrixRow,
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

interface ReadOnlyDeveloperRow extends Omit<DeveloperMatrixRow, 'allocations'> {
  allocations: Record<string | number, number | string>;
}

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

function getCapacityTextClass(isOver: boolean, isFull: boolean): string {
  if (isOver) return 'text-destructive';
  if (isFull) return 'text-green-500';
  return 'text-primary';
}

function getProgressBarFillClass(isOver: boolean, isFull: boolean): string {
  if (isOver) return 'bg-destructive';
  if (isFull) return 'bg-green-500';
  return 'bg-primary';
}

function getRowBgClass(isOver: boolean): string {
  if (isOver) return 'bg-destructive/5';
  return '';
}

export function ResourceAllocationMatrix() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());



  const {
    data: queryData,
    isLoading,
    error: queryError,
    refetch: fetchOverview,
  } = useQuery(getOverviewQueryOptions(selectedMonth, selectedYear));

  const loadError = queryError ? getErrorMessage(queryError, 'Failed to load allocation matrix.') : null;

  useEffect(() => {
    if (queryError) {
      console.error('Failed to load resource allocations:', queryError);
      toast.error(loadError || 'Failed to load allocation matrix.');
    }
  }, [queryError, loadError]);

  const { projects, developers, monthlyStatus } = useMemo(() => {
    if (queryData?.overviewRes?.status && queryData.overviewRes.data) {
      const { overviewRes } = queryData;
      const masterProjects = overviewRes.data.projects || [];

      const overviewDevelopersMap = new Map(
        (overviewRes.data.developers || []).map((d: Partial<AllocationDeveloperSummary & DeveloperMatrixRow>) => [d.developer_id || d.id, d])
      );

      const masterDevelopers = overviewRes.data.developers || [];
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
        };
      });

      return {
        projects: masterProjects as AllocationProjectHeader[],
        developers: mappedDevelopers as ReadOnlyDeveloperRow[],
        monthlyStatus: (overviewRes.data.monthly_status as string) || 'DRAFT',
      };
    }
    return {
      projects: [] as AllocationProjectHeader[],
      developers: [] as ReadOnlyDeveloperRow[],
      monthlyStatus: 'DRAFT',
    };
  }, [queryData]);

  const metrics = useMemo(() => {
    const totalDevs = developers.length;
    const fullyAllocated = developers.filter((d) => d.total_allocated_percentage === 100).length;
    const underAllocated = developers.filter((d) => d.total_allocated_percentage < 100).length;
    const overAllocated = developers.filter((d) => d.is_over_capacity).length;

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

    const unallocatedDevs = developers.filter((d) => (d.total_allocated_percentage || 0) === 0);
    const unallocatedCount = unallocatedDevs.length;

    return {
      totalDevs,
      fullyAllocated,
      underAllocated,
      overAllocated,
      unallocatedDevs,
      unallocatedCount,
      projectTotals,
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
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 px-4 text-center">
          <RefreshCw className="w-7 h-7 sm:w-8 sm:h-8 text-primary animate-spin" />
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            Loading allocation matrix for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}...
          </p>
        </div>
      );
    }
    
    if (loadError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
          <div className="p-3 sm:p-3.5 bg-destructive/10 text-destructive rounded-xl sm:rounded-2xl mb-3 border border-destructive/20">
            <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Failed to Load Allocations</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mt-1 break-words">{loadError}</p>
          <button
            type="button"
            onClick={() => fetchOverview()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg sm:rounded-xl shadow transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Loading</span>
          </button>
        </div>
      );
    }

    if (projects.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
          <Briefcase className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base sm:text-lg font-semibold text-foreground">No Active Projects Found</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mt-1">
            There are no active projects configured in the system for resource allocation.
          </p>
        </div>
      );
    }

    if (developers.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
          <Users className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base sm:text-lg font-semibold text-foreground">No Developers Found</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mt-1">
            No active technical developers found.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)] min-h-[260px] sm:min-h-[400px]">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="border-b border-border bg-muted text-[10px] sm:text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              <th className="sticky top-0 left-0 z-30 bg-muted px-2 sm:px-4 py-2 sm:py-3.5 min-w-32 sm:min-w-56 max-w-36 sm:max-w-64 border-r border-b border-border break-words whitespace-normal">
                Developer
              </th>
              {projects.map((proj) => (
                <th
                  key={proj.id}
                  className="sticky top-0 z-20 bg-muted px-2 sm:px-4 py-2 sm:py-3.5 text-center min-w-24 sm:min-w-32 border-r border-b border-border/50"
                >
                  <div className="font-semibold text-foreground break-words whitespace-normal leading-tight line-clamp-2 max-w-[100px] sm:max-w-[150px] mx-auto" title={proj.name}>
                    {proj.name}
                  </div>
                </th>
              ))}
              <th className="sticky top-0 z-20 bg-muted px-2 sm:px-4 py-2 sm:py-3.5 text-center min-w-24 sm:min-w-36 border-r border-b border-border/50 break-words whitespace-normal">
                <span className="sm:hidden">Total</span>
                <span className="hidden sm:inline">Total Capacity</span>
              </th>
              <th className="sticky top-0 z-20 bg-muted px-1.5 sm:px-4 py-2 sm:py-3.5 text-center min-w-16 sm:min-w-24 border-r border-b border-border/50 break-words whitespace-normal">
                <span className="sm:hidden">Left</span>
                <span className="hidden sm:inline">Remaining</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs sm:text-sm">
            {developers.map((dev) => {
              const total = dev.total_allocated_percentage;
              const isOver = dev.is_over_capacity;
              const isFull = total === 100;

              return (
                <tr
                  key={dev.developer_id}
                  className={`transition-colors hover:bg-muted/30 ${getRowBgClass(isOver)}`}
                >
                  <td
                    className={`sticky left-0 z-10 px-2 sm:px-4 py-2 sm:py-3.5 border-r border-border backdrop-blur-sm min-w-32 sm:min-w-56 max-w-36 sm:max-w-64 ${
                      isOver ? 'bg-destructive/10' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      <div
                        className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center font-bold text-[9px] sm:text-xs flex-shrink-0 ${
                          isOver
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
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs sm:text-sm text-foreground break-words whitespace-normal leading-tight line-clamp-2" title={dev.developer_name}>
                          <span>{dev.developer_name}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {projects.map((proj) => {
                    const rawVal = dev.allocations[proj.id] ?? 0;
                    const hasAllocation = (parseFloat(String(rawVal)) || 0) > 0;

                    return (
                      <td
                        key={proj.id}
                        className="px-1.5 sm:px-3 py-1.5 sm:py-2.5 text-center border-r border-border/50 min-w-24 sm:min-w-32"
                      >
                        {hasAllocation ? (
                          <span className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 font-semibold text-xs sm:text-sm text-primary bg-primary/10 border border-primary/20 rounded-md sm:rounded-lg">
                            {rawVal}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs sm:text-sm">-</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="px-2 sm:px-4 py-1.5 sm:py-3.5 border-r border-border/50 min-w-24 sm:min-w-36">
                    <div className="flex flex-col gap-1 sm:gap-1.5">
                      <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold">
                        <span className={getCapacityTextClass(isOver, isFull)}>
                          {total}%
                        </span>
                        {isFull && (
                          <span className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 bg-green-500/20 text-green-500 rounded font-bold uppercase">
                            FULL
                          </span>
                        )}
                      </div>
                      <div className="w-full h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getProgressBarFillClass(isOver, isFull)}`}
                          style={{ width: `${Math.min(100, total)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-1.5 sm:px-4 py-1.5 sm:py-3.5 text-center border-r border-border/50 min-w-16 sm:min-w-24">
                    <span
                      className={`text-xs font-medium ${
                        dev.remaining_capacity_percentage > 0
                          ? 'text-warning'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {dev.remaining_capacity_percentage}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-5 lg:p-6 bg-card/60 border border-border/80 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2.5 bg-primary/10 text-primary rounded-lg sm:rounded-xl border border-primary/20 shrink-0 mt-0.5 sm:mt-0">
              <Layers className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-foreground flex flex-wrap items-center gap-1.5 sm:gap-2 leading-tight break-words whitespace-normal">
                <span className="break-words">Resource Allocation Matrix</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-secondary text-secondary-foreground border border-border shrink-0">
                  Read Only
                </span>
              </h1>
              <p className="text-[11px] sm:text-sm text-muted-foreground mt-0.5 leading-snug break-words whitespace-normal">
                View technical developer capacity across active projects.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          {/* Month & Year Picker */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 bg-muted/60 border border-border px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-xs sm:text-sm flex-1 lg:flex-initial min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-xs sm:text-sm font-medium text-foreground focus:outline-none cursor-pointer truncate"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1} className="bg-popover text-foreground">
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-muted-foreground">/</span>

            {/* Year Picker */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs sm:text-sm font-medium text-foreground focus:outline-none cursor-pointer shrink-0"
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
            onClick={() => fetchOverview()}
            disabled={isLoading}
            title="Refresh Matrix"
            className="p-2 sm:p-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg sm:rounded-xl border border-border transition disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 items-stretch">
        <div className="bg-card/50 border border-border p-2 sm:p-4 rounded-xl flex items-center gap-1.5 sm:gap-3.5 h-full min-w-0">
          <div className="p-1.5 sm:p-2.5 bg-info/10 text-info rounded-lg sm:rounded-xl shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold tracking-tight sm:tracking-wider break-words whitespace-normal leading-tight" title="Developers">
              Developers
            </p>
            <p className="text-base sm:text-xl font-bold text-foreground mt-0.5">{metrics.totalDevs}</p>
          </div>
        </div>

        <div className="bg-card/50 border border-border p-2 sm:p-4 rounded-xl flex items-center gap-1.5 sm:gap-3.5 h-full min-w-0">
          <div className="p-1.5 sm:p-2.5 bg-primary/10 text-primary rounded-lg sm:rounded-xl shrink-0">
            <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold tracking-tight sm:tracking-wider break-words whitespace-normal leading-tight" title="Active Projects">
              Active Projects
            </p>
            <p className="text-base sm:text-xl font-bold text-foreground mt-0.5">{projects.length}</p>
          </div>
        </div>

        <div className="bg-card/50 border border-border p-2 sm:p-4 rounded-xl flex items-center gap-1.5 sm:gap-3.5 h-full min-w-0">
          <div className="p-1.5 sm:p-2.5 bg-green-500/10 text-green-500 rounded-lg sm:rounded-xl shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold tracking-tight sm:tracking-wider break-words whitespace-normal leading-tight" title="100% Allocated">
              100% Allocated
            </p>
            <p className="text-base sm:text-xl font-bold text-foreground mt-0.5">{metrics.fullyAllocated}</p>
          </div>
        </div>

        <div className="bg-card/50 border border-border p-2 sm:p-4 rounded-xl flex items-center gap-1.5 sm:gap-3.5 h-full min-w-0">
          <div className="p-1.5 sm:p-2.5 bg-warning/10 text-warning rounded-lg sm:rounded-xl shrink-0">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold tracking-tight sm:tracking-wider break-words whitespace-normal leading-tight" title="Under-Allocated">
              Under-Allocated
            </p>
            <p className="text-base sm:text-xl font-bold text-foreground mt-0.5">{metrics.underAllocated}</p>
          </div>
        </div>
      </div>

      <div className="bg-card/50 border border-border rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
        {renderMatrixContent()}
      </div>
    </div>
  );
}
