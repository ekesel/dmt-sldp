import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface SyncProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceId: number;
    sourceName: string;
    tenantId: string;
}

interface SyncState {
    progress: number;
    status: 'pending' | 'in_progress' | 'success' | 'failed';
    message: string;
    stats?: {
        item_count?: number;
        duration?: string;
    };
}

const SyncProgressModal: React.FC<SyncProgressModalProps> = ({ isOpen, onClose, sourceId, sourceName, tenantId }) => {
    const [syncState, setSyncState] = useState<SyncState>({
        progress: 0,
        status: 'pending',
        message: 'Initializing...',
    });

    // Helper to get WS base origin
    const getWsOrigin = () => {
        const envUrl = process.env.NEXT_PUBLIC_WS_URL;
        if (envUrl) {
            try {
                if (envUrl.includes('://')) {
                    const url = new URL(envUrl);
                    return `${url.protocol}//${url.host}`;
                }
                return envUrl;
            } catch (e) {
                console.warn('Invalid NEXT_PUBLIC_WS_URL, falling back to window location');
            }
        }
        const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        return `${protocol}//${host}:8000`;
    };

    const wsOrigin = getWsOrigin();
    const WS_URL = `${wsOrigin}/ws/telemetry`;

    useEffect(() => {
        if (!isOpen) {
            setSyncState({ progress: 0, status: 'pending', message: 'Initializing...' });
            return;
        }

        // Connect to WebSocket
        const token = localStorage.getItem('dmt-access-token');
        const urlWithToken = `${WS_URL}/${tenantId}/?token=${token}`;

        console.log(`Connecting to WS: ${urlWithToken}`);
        const ws = new WebSocket(urlWithToken);

        ws.onopen = () => {
            console.log('Connected to Telemetry WS');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Filter events for this source (or all sync events if broad)
                if (data.type === 'sync_progress' && (data.source_id === sourceId || !data.source_id)) {
                    setSyncState(prev => ({
                        ...prev,
                        progress: data.progress,
                        status: data.status,
                        message: data.message,
                        stats: data.stats
                    }));

                    if (data.status === 'success') {
                        toast.success('Sync Completed!');
                    } else if (data.status === 'failed') {
                        toast.error('Sync Failed');
                    }
                }
            } catch (e) {
                console.error('WS Parse Error', e);
            }
        };

        ws.onerror = (e) => {
            console.error('WebSocket Error', e);
            // toast.error('Connection to sync service lost');
        };

        return () => {
            ws.close();
        };
    }, [isOpen, sourceId, WS_URL]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-2">Syncing {sourceName}</h3>
                    <p className="text-slate-400 text-sm mb-6">Please wait while we fetch data from the source.</p>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-700 rounded-full h-2.5 mb-2">
                        <div
                            className={`h-2.5 rounded-full transition-all duration-300 ${syncState.status === 'failed' ? 'bg-red-500' :
                                syncState.status === 'success' ? 'bg-green-500' : 'bg-blue-600'
                                }`}
                            style={{ width: `${syncState.progress}%` }}
                        ></div>
                    </div>

                    <div className="flex justify-between text-xs text-slate-400 mb-6">
                        <span>{syncState.progress}%</span>
                        <span>{syncState.status === 'in_progress' ? 'Processing...' : syncState.status}</span>
                    </div>

                    {/* Status Message */}
                    <div className={`p-4 rounded-md flex items-start space-x-3 mb-6 ${syncState.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                        syncState.status === 'success' ? 'bg-green-500/10 text-green-400' :
                            'bg-blue-500/10 text-blue-400'
                        }`}>
                        {syncState.status === 'in_progress' && <Loader2 className="w-5 h-5 animate-spin mt-0.5" />}
                        {syncState.status === 'success' && <CheckCircle className="w-5 h-5 mt-0.5" />}
                        {syncState.status === 'failed' && <XCircle className="w-5 h-5 mt-0.5" />}
                        {syncState.status === 'pending' && <AlertTriangle className="w-5 h-5 mt-0.5" />}

                        <div className="flex-1">
                            <p className="font-medium text-sm">{syncState.message}</p>
                            {syncState.stats && (
                                <p className="text-xs mt-1 opacity-80">
                                    Items Processed: {syncState.stats.item_count}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                            disabled={syncState.status === 'in_progress'}
                        >
                            {syncState.status === 'in_progress' ? 'Running in background...' : 'Close'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SyncProgressModal;
