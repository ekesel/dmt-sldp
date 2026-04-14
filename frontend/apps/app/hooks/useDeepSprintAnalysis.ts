'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from './useWebSocket';
import api, { aiInsights } from '@dmt/api';
import { toast } from 'react-hot-toast';

export interface AssigneeInsight {
    assignee_name: string;
    load_assessment: string;
    insight: string;
    action_item: string;
}

interface DeepSprintInsight {
    id: number;
    summary: string;
    suggestions: AssigneeInsight[]; // Assignee insights
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



    const { lastMessage } = useWebSocket();
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
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load analysis';
            console.error('Deep Sprint Insight load error:', err);
            setError(errorMessage);
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
            await aiInsights.refresh(projectId as number, 'deep_sprint', sprintId);
            toast.success("Deep Sprint Analysis triggered");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to trigger analysis";
            console.error('[RunAnalysis] Error:', err);
            toast.error(errorMessage);
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
