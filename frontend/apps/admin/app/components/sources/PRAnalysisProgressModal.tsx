'use client';
import React, { useEffect, useState, useRef } from 'react';
import { Modal, Badge } from '../UIComponents';
import { CheckCircle2, AlertCircle, Loader2, Code2 } from 'lucide-react';
import { sources as sourcesApi } from '@dmt/api';

interface PRAnalysisProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceId: number;
    sourceName: string;
}

type Status = 'not_started' | 'running' | 'success' | 'failed' | 'error';

export default function PRAnalysisProgressModal({ isOpen, onClose, sourceId, sourceName }: PRAnalysisProgressModalProps) {
    const [status, setStatus] = useState<Status>('running');
    const [message, setMessage] = useState<string>('Initializing analysis engine...');
    const [errorMsg, setErrorMsg] = useState<string>('');

    // Use ref for interval so we can clear it reliably
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!isOpen) {
            if (pollInterval.current) clearInterval(pollInterval.current);
            return;
        }

        setStatus('running');
        setMessage('Starting PR diff analysis task...');
        setErrorMsg('');

        const checkStatus = async () => {
            try {
                const res = await (sourcesApi as any).prAnalysisStatus(sourceId);

                if (res.status === 'not_started') {
                    // Task hasn't written log yet, keep polling
                    return;
                }

                setStatus(res.status);
                setMessage(res.message);

                if (res.error_message) {
                    setErrorMsg(res.error_message);
                }

                // Stop polling if done
                if (res.status === 'success' || res.status === 'failed') {
                    if (pollInterval.current) {
                        clearInterval(pollInterval.current);
                        pollInterval.current = null;
                    }
                }
            } catch (err: any) {
                console.error("Polling error", err);
                setStatus('error');
                setErrorMsg('Failed to check analysis status. Check console.');
                if (pollInterval.current) {
                    clearInterval(pollInterval.current);
                    pollInterval.current = null;
                }
            }
        };

        // Poll every 3 seconds
        pollInterval.current = setInterval(checkStatus, 3000);

        // Initial check immediately
        checkStatus();

        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [isOpen, sourceId]);

    const renderIcon = () => {
        switch (status) {
            case 'success':
                return <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-4" />;
            case 'failed':
            case 'error':
                return <AlertCircle className="w-12 h-12 text-red-400 mb-4" />;
            default:
                return (
                    <div className="relative mb-4">
                        <Code2 className="w-12 h-12 text-blue-500 opacity-20" />
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin absolute top-0 left-0" />
                    </div>
                );
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`PR Analysis: ${sourceName}`}
            description="Scanning Pull Requests for AI-generated code markers and tracking developer review metrics."
        >
            <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-900 border border-slate-800 rounded-xl">
                {renderIcon()}

                <h3 className="text-xl font-semibold text-white mb-2">
                    {status === 'success' ? 'Analysis Complete' :
                        status === 'failed' || status === 'error' ? 'Analysis Failed' :
                            'Analyzing Pull Requests...'}
                </h3>

                <p className="text-slate-400 mb-6 max-w-sm">
                    {message}
                </p>

                {(status === 'failed' || status === 'error') && errorMsg && (
                    <div className="w-full bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400 text-left overflow-auto max-h-32 mb-6">
                        {errorMsg}
                    </div>
                )}

                <div className="w-full flex justify-center mt-2">
                    <Badge
                        label={status === 'running' ? 'In Progress' : status.toUpperCase()}
                        variant={status === 'success' ? 'success' : status === 'failed' || status === 'error' ? 'error' : 'default'}
                    />
                </div>

                {status !== 'running' && (
                    <button
                        onClick={onClose}
                        className="mt-8 px-8 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition"
                    >
                        Close
                    </button>
                )}
            </div>
        </Modal>
    );
}
