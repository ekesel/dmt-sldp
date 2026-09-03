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

  const [projects, setProjects] = useState<AllocationProjectHeader[]>([]);
  const [developers, setDevelopers] = useState<ReadOnlyDeveloperRow[]>([]);
  const [monthlyStatus, setMonthlyStatus] = useState<'DRAFT' | 'PUBLISHED' | string>('DRAFT');

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

  useEffect(() => {
    if (queryData) {
      const { overviewRes } = queryData;
      if (overviewRes && overviewRes.status && overviewRes.data) {
        const masterProjects = overviewRes.data.projects || [];
        setProjects(masterProjects);

        const overviewDevelopersMap = new Map(
          (overviewRes.data.developers || []).map((d) => [d.developer_id, d])
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

        setDevelopers(mappedDevelopers);
        setMonthlyStatus(overviewRes.data.monthly_status || 'DRAFT');
      }
    }
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
          <thead>
            <tr className="border-b border-border bg-muted text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              <th className="sticky top-0 left-0 z-30 bg-muted px-4 py-3.5 min-w-56 max-w-64 border-r border-b border-border">
                Developer (Rows)
              </th>
              {projects.map((proj) => (
                <th
                  key={proj.id}
                  className="sticky top-0 z-20 bg-muted px-4 py-3.5 text-center min-w-32 border-r border-b border-border/50"
                >
                  <div className="font-semibold text-foreground truncate" title={proj.name}>
                    {proj.name}
                  </div>
                </th>
              ))}
              <th className="sticky top-0 z-20 bg-muted px-4 py-3.5 text-center min-w-36 border-r border-b border-border/50">
                Total Capacity
              </th>
              <th className="sticky top-0 z-20 bg-muted px-4 py-3.5 text-center min-w-24 border-r border-b border-border/50">
                Remaining
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-sm">
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
                    className={`sticky left-0 z-10 px-4 py-3.5 border-r border-border backdrop-blur-sm ${
                      isOver ? 'bg-destructive/10' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
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
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
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
                        className="px-3 py-2.5 text-center border-r border-border/50"
                      >
                        {hasAllocation ? (
                          <span className="inline-block px-3 py-1 font-semibold text-primary bg-primary/10 border border-primary/20 rounded-lg">
                            {rawVal}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="px-4 py-3.5 border-r border-border/50">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className={getCapacityTextClass(isOver, isFull)}>
                          {total}%
                        </span>
                        {isFull && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-500 rounded font-bold uppercase">
                            FULL
                          </span>
                        )}
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getProgressBarFillClass(isOver, isFull)}`}
                          style={{ width: `${Math.min(100, total)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-center border-r border-border/50">
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
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                Resource Allocation Matrix
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground border border-border">
                  Read Only
                </span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                View technical developer capacity across active projects.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/60 border border-border px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-sm font-medium text-foreground focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1} className="bg-popover text-foreground">
                  {name}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground">/</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-sm font-medium text-foreground focus:outline-none cursor-pointer"
            >
              {yearsList.map((yr) => (
                <option key={yr} value={yr} className="bg-popover text-foreground">
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchOverview()}
            disabled={isLoading}
            title="Refresh Matrix"
            className="p-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl border border-border transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

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
          <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
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

      <div className="bg-card/50 border border-border rounded-2xl shadow-sm overflow-hidden">
        {renderMatrixContent()}
      </div>
    </div>
  );
}
