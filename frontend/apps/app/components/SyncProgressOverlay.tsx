'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SyncProgressOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: number;
    tenantId: string;
}

interface SyncState {
    progress: number;
    status: 'pending' | 'in_progress' | 'success' | 'failed';
    message: string;
    source_id?: number;
}

export const SyncProgressOverlay: React.FC<SyncProgressOverlayProps> = ({ isOpen, onClose, projectId, tenantId }) => {
    const [syncState, setSyncState] = useState<SyncState>({
        progress: 0,
        status: 'pending',
        message: 'Initializing...',
    });

    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setSyncState({ progress: 0, status: 'pending', message: 'Initializing synchronization...' });
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        let isSubscribed = true;

        // Proactive fallback for local development or subdomains:
        // If dmt-tenant is missing, try to derive it from the URL
        if (typeof window !== 'undefined' && !localStorage.getItem('dmt-tenant')) {
            const host = window.location.hostname;
            const parts = host.split('.');
            if (parts.length > 1 && parts[0] !== 'localhost') {
                localStorage.setItem('dmt-tenant', parts[0]);
            } else if (tenantId) {
                localStorage.setItem('dmt-tenant', tenantId);
            }
        }

        // Dynamic import or direct usage of the shared manager 
        import('@dmt/api').then(({ getWebSocketManager }) => {
            if (!isSubscribed) return;

            const wsManager = getWebSocketManager();

            const handleProgress = (message: any) => {
                const data = message.payload || message; // handle both direct and payload-wrapped

                if (data.project_id && data.project_id !== projectId) {
                    return;
                }

                setSyncState({
                    progress: data.progress,
                    status: data.status,
                    message: data.message,
                    source_id: data.source_id
                });

                if (data.status === 'success' && data.progress === 100) {
                    toast.success('Synchronization complete');
                } else if (data.status === 'failed') {
                    toast.error(`Sync error: ${data.message}`);
                }
            };

            // Subscribe to sync_progress
            wsManager.subscribe('sync_progress', handleProgress);

            // Connect
            wsManager.connect().catch(console.error);
        });

        return () => {
            isSubscribed = false;
            import('@dmt/api').then(({ getWebSocketManager }) => {
                const wsManager = getWebSocketManager();
                // We only unsubscribe this specific component's listener,
                // we don't necessarily disconnect the whole socket if others use it
                wsManager.unsubscribe('sync_progress');
            });
        };
    }, [isOpen, projectId]);

    if (!isVisible) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Project Resync</h3>
                        <p className="text-sm text-slate-400">Synchronizing data from active sources</p>
                    </div>
                </div>

                {/* Progress Visual */}
                <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                        <div>
                            <span className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${syncState.status === 'failed' ? 'text-rose-500 bg-rose-500/10' :
                                syncState.status === 'success' ? 'text-emerald-500 bg-emerald-500/10' :
                                    'text-brand-primary bg-brand-primary/10'
                                }`}>
                                {syncState.status.replace('_', ' ')}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-semibold inline-block text-white">
                                {syncState.progress}%
                            </span>
                        </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-white/5">
                        <div
                            style={{ width: `${syncState.progress}%` }}
                            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${syncState.status === 'failed' ? 'bg-rose-500' :
                                syncState.status === 'success' ? 'bg-emerald-500' :
                                    'bg-brand-primary'
                                }`}
                        ></div>
                    </div>
                </div>

                {/* Status Message */}
                <div className={`flex items-start gap-3 p-4 rounded-xl mb-8 ${syncState.status === 'failed' ? 'bg-rose-500/5 text-rose-200' :
                    syncState.status === 'success' ? 'bg-emerald-500/5 text-emerald-200' :
                        'bg-white/5 text-slate-300'
                    }`}>
                    {syncState.status === 'in_progress' && <Loader2 size={18} className="animate-spin text-brand-primary shrink-0" />}
                    {syncState.status === 'success' && <CheckCircle size={18} className="text-emerald-500 shrink-0" />}
                    {syncState.status === 'failed' && <XCircle size={18} className="text-rose-500 shrink-0" />}
                    {syncState.status === 'pending' && <AlertTriangle size={18} className="text-amber-500 shrink-0" />}

                    <div className="flex-1">
                        <p className="text-sm font-medium">{syncState.message}</p>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg font-bold text-sm transition-all bg-white/10 text-white hover:bg-white/20"
                    >
                        {syncState.status === 'in_progress' ? 'Run in Background' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
};
