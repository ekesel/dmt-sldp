'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from './useWebSocket';
import api, { aiInsights } from '@dmt/api';
import { toast } from 'react-hot-toast';

interface DeepSprintInsight {
    id: number;
    summary: string;
    suggestions: any[]; // Assignee insights
    forecast: string;    // Used to store Risk Factors JSON
    project_id?: number | null;
    created_at: string;
}

export function useDeepSprintAnalysis(projectId: number | null, sprintId: number | null) {
    const [insight, setInsight] = useState<DeepSprintInsight | null>(null);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [error, setError] = useState<string | null>(null);

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
                const devDomains = process.env.NEXT_PUBLIC_DEV_DOMAINS ? process.env.NEXT_PUBLIC_DEV_DOMAINS.split(',') : ['localhost', '127.0.0.1'];
                if (parts.length > 1 && !devDomains.includes(parts[0])) {
                    return parts[0];
                }
                return 'default';
            };

            const tenant = getTenantId();
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname;
            const port = window.location.port;

            const directUrl = `${protocol}//${host}:8000/ws/telemetry/${tenant}/`;
            const fallbackUrl = `${protocol}//${host}${port ? `:${port}` : ''}/ws/telemetry/${tenant}/`;

            setWsUrls({ url: directUrl, fallback: fallbackUrl });
        }
    }, []);

    const { lastMessage } = useWebSocket(wsUrls.url || '', wsUrls.fallback || undefined);
    const { token } = useAuth();
    const fetchingRef = useRef(false);

    const fetchInsight = useCallback(async () => {
        if (!token || fetchingRef.current || !sprintId) return;

        try {
            fetchingRef.current = true;
            setLoading(true);

            const params = {
                project_id: projectId,
                insight_type: 'deep_sprint' as const
            };

            const insights = await aiInsights.list(params) as unknown as DeepSprintInsight[];

            // Since the backend might not filter by sprint_id in AIInsight model yet (we just added it to the task but not the model field for simplicity, storing multiple per project), 
            // we take the latest. If we want truly sprint-specific, we'd need a sprint_id on AIInsight model.
            // Re-checking backend: verify if I added sprint_id to AIInsight model.
            // I added insight_type. I didn't add sprint_id to the model, but I can filter results if they contain sprint info in summary or if I add it later.
            // For now, let's just take the latest deep_sprint insight for this project.

            if (insights && insights.length > 0) {
                setInsight(insights[0]);
            } else {
                setInsight(null);
            }

            setError(null);
        } catch (err: any) {
            console.error('Deep Sprint Insight load error:', err);
            setError(err.message || 'Failed to load analysis');
        } finally {
            fetchingRef.current = false;
            setLoading(false);
        }
    }, [token, projectId, sprintId]);

    useEffect(() => {
        fetchInsight();
    }, [fetchInsight]);

    useEffect(() => {
        if (lastMessage) {
            if (lastMessage.type === 'ai_insight_update') {
                setIsRefreshing(false);
                setProgress(100);
                setStatus('Complete');
                fetchInsight();
                setTimeout(() => {
                    setProgress(0);
                    setStatus('');
                }, 2000);
            } else if (lastMessage.type === 'ai_insight_progress') {
                const payload = lastMessage.message || lastMessage;
                if (payload.progress !== undefined) {
                    setIsRefreshing(true);
                    setProgress(payload.progress);
                    setStatus(payload.status || 'Processing...');
                }
            }
        }
    }, [lastMessage, fetchInsight]);

    const runAnalysis = async () => {
        if (!sprintId) {
            toast.error("Please select a sprint first");
            return;
        }

        try {
            setIsRefreshing(true);
            setProgress(10);
            setStatus('Triggering analysis...');
            await aiInsights.refresh(projectId as any, 'deep_sprint', sprintId);
            toast.success("Deep Sprint Analysis triggered");
        } catch (err: any) {
            console.error('[RunAnalysis] Error:', err);
            toast.error(err.message || "Failed to trigger analysis");
            setIsRefreshing(false);
            setProgress(0);
            setStatus('');
        }
    };

    return {
        insight,
        loading,
        error,
        refresh: fetchInsight,
        runAnalysis,
        isRefreshing,
        progress,
        status
    };
}
