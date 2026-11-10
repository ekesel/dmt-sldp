/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboardData } from '../useDashboardData';
import api, { aiInsights, resourceAllocations, sprints } from '@dmt/api';

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({ token: 'mock-token' }),
}));

vi.mock('../useWebSocket', () => ({
    useWebSocket: () => ({ lastMessage: null }),
}));

vi.mock('@dmt/api', () => ({
    default: {
        get: vi.fn(),
    },
    aiInsights: {
        list: vi.fn(),
        refresh: vi.fn(),
    },
    resourceAllocations: {
        getOverview: vi.fn(),
    },
    sprints: {
        list: vi.fn(),
    },
}));

describe('useDashboardData Hook', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });

        (api.get as any).mockImplementation((url: string) => {
            if (url === 'dashboard/summary/') {
                return Promise.resolve({ data: { velocity: 10, compliance_rate: 90, bugs_resolved: 2, cycle_time: 4 } });
            }
            if (url === 'dashboard/velocity/') {
                return Promise.resolve({ data: [{ sprint_name: 'Sprint 1', velocity: 10 }] });
            }
            if (url === 'dashboard/compliance/') {
                return Promise.resolve({ data: [] });
            }
            if (url === 'dashboard/assignee-distribution/') {
                return Promise.resolve({ data: [] });
            }
            if (url === 'dashboard/forecast/') {
                return Promise.resolve({ data: { '85': '2026-11-01' } });
            }
            return Promise.resolve({ data: {} });
        });

        (aiInsights.list as any).mockResolvedValue([
            { id: 1, summary: 'Insight summary for project', suggestions: [] }
        ]);

        (resourceAllocations.getOverview as any).mockResolvedValue({
            data: { developers: [] }
        });

        (sprints.list as any).mockResolvedValue([]);
    });

    const createWrapper = () => {
        return ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
    };

    it('fetches dashboard data without sprint filter when All Projects (projectId = null) is selected', async () => {
        const { result } = renderHook(
            () => useDashboardData(null, null, null, 101),
            { wrapper: createWrapper() }
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Verify api.get calls do not contain project_id, sprint_id, or sprint_ids
        const calls = (api.get as any).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        calls.forEach((call: any[]) => {
            const config = call[1];
            expect(config?.params?.project_id).toBeUndefined();
            expect(config?.params?.sprint_id).toBeUndefined();
            expect(config?.params?.sprint_ids).toBeUndefined();
        });
    });

    it('fetches dashboard data with project and sprint filter for metrics, but never applies sprint filter to AI Insights or Forecast', async () => {
        const { result } = renderHook(
            () => useDashboardData(2, null, null, 205),
            { wrapper: createWrapper() }
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
            expect(result.current.insights.length).toBe(1);
        });

        // Verify summary and velocity calls contain project_id and sprint_ids
        const summaryCall = (api.get as any).mock.calls.find((c: any[]) => c[0] === 'dashboard/summary/');
        const velocityCall = (api.get as any).mock.calls.find((c: any[]) => c[0] === 'dashboard/velocity/');

        expect(summaryCall[1].params).toEqual({
            project_id: 2,
            sprint_id: 205,
            sprint_ids: '205',
        });
        expect(velocityCall[1].params).toEqual({
            project_id: 2,
            sprint_id: 205,
            sprint_ids: '205',
        });

        // Verify AI Insights API was NOT called with sprint_id or sprint_ids
        expect(aiInsights.list).toHaveBeenCalledWith({ project_id: 2 });
        const aiCalls = (aiInsights.list as any).mock.calls;
        aiCalls.forEach((call: any[]) => {
            expect(call[0]?.sprint_id).toBeUndefined();
            expect(call[0]?.sprint_ids).toBeUndefined();
        });

        // Verify Forecast API was NOT called with sprint_id or sprint_ids
        const forecastCall = (api.get as any).mock.calls.find((c: any[]) => c[0] === 'dashboard/forecast/');
        expect(forecastCall).toBeDefined();
        expect(forecastCall[1].params).toEqual({ project_id: 2 });
    });

    it('keeps AI Insights and Forecast unchanged when sprint selection changes within the project', async () => {
        let currentSprintId: number | null = 101;

        const { result, rerender } = renderHook(
            () => useDashboardData(1, null, null, currentSprintId),
            { wrapper: createWrapper() }
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
            expect(result.current.insights.length).toBe(1);
            expect(result.current.forecast).toEqual({ '85': '2026-11-01' });
        });

        const initialAiCallsCount = (aiInsights.list as any).mock.calls.length;

        // Change sprint from 101 to 102
        currentSprintId = 102;
        rerender();

        // AI Insights and Forecast should remain unchanged and not re-fetched with sprint filter
        expect(result.current.insights.length).toBe(1);
        expect(result.current.forecast).toEqual({ '85': '2026-11-01' });
        expect((aiInsights.list as any).mock.calls.length).toBe(initialAiCallsCount);
    });

    it('clears stale data immediately when switching projects', async () => {
        let currentProjectId: number | null = 1;
        let currentSprintId: number | null = 10;

        const { result, rerender } = renderHook(
            () => useDashboardData(currentProjectId, null, null, currentSprintId),
            { wrapper: createWrapper() }
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
            expect(result.current.summary?.velocity).toBe(10);
        });

        // Delay the second project's response so we can inspect the immediate transition state
        (api.get as any).mockImplementation((url: string) => {
            return new Promise(resolve => {
                setTimeout(() => {
                    if (url === 'dashboard/summary/') {
                        resolve({ data: { velocity: 25, compliance_rate: 95, bugs_resolved: 5, cycle_time: 2 } });
                    } else {
                        resolve({ data: [] });
                    }
                }, 100);
            });
        });

        // Switch to Project 2 with sprint reset to null
        currentProjectId = 2;
        currentSprintId = null;
        rerender();

        // Data from project 1 must be cleared immediately (no stale data kept)
        expect(result.current.summary).toBeNull();
        expect(result.current.velocity).toEqual([]);
        expect(result.current.loading).toBe(true);

        // Wait for project 2 to finish loading
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
            expect(result.current.summary?.velocity).toBe(25);
        });
    });

    it('fetches resource allocation for the month of the selected past sprint and assigns correct allocation percentage', async () => {
        (resourceAllocations.getOverview as any).mockImplementation((params: any) => {
            if (params?.month === 10 && params?.year === 2026) {
                return Promise.resolve({
                    data: {
                        month: 10,
                        year: 2026,
                        developers: [
                            {
                                developer_id: 1,
                                developer_name: 'John Doe',
                                total_allocated_percentage: 100,
                                allocations: { '5': 100 }
                            }
                        ]
                    }
                });
            }
            return Promise.resolve({ data: { developers: [] } });
        });

        (api.get as any).mockImplementation((url: string) => {
            if (url === 'dashboard/assignee-distribution/') {
                return Promise.resolve({
                    data: [
                        {
                            id: 1,
                            name: 'John Doe',
                            email: 'john@samta.ai',
                            total: 5,
                            in_progress: 2,
                            completed: 3,
                            avg_cycle_time_days: 2.5
                        }
                    ]
                });
            }
            return Promise.resolve({ data: {} });
        });

        const selectedSprint = {
            id: 105,
            name: 'Sprint 105',
            start_date: '2026-10-01',
            end_date: '2026-10-15',
            status: 'closed'
        };

        const { result } = renderHook(
            () => useDashboardData(5, null, null, [105], null, [selectedSprint]),
            { wrapper: createWrapper() }
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
            expect(result.current.assigneeDistribution.length).toBe(1);
        });

        expect(resourceAllocations.getOverview).toHaveBeenCalledWith({ month: 10, year: 2026 });
        const dev = result.current.assigneeDistribution[0];
        expect(dev.allocation_percentage).toBe(100);
        expect(dev.has_allocation).toBe(true);
        expect(dev.allocation_period_label).toBe('October 2026');
    });

    it('fetches resource allocation for the month of a past date range', async () => {
        const { result } = renderHook(
            () => useDashboardData(5, '2026-09-01', '2026-09-30', null),
            { wrapper: createWrapper() }
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(resourceAllocations.getOverview).toHaveBeenCalledWith({ month: 9, year: 2026 });
    });
});
