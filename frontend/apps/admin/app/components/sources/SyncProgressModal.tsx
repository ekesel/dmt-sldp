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

    useEffect(() => {
        if (!isOpen) {
            setSyncState({ progress: 0, status: 'pending', message: 'Initializing...' });
            return;
        }

        // Connect to WebSocket
        const token = typeof window !== 'undefined' 
            ? (localStorage.getItem('dmt-access-token') || localStorage.getItem('access_token')) 
            : null;

        let wsHost = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_WS_HOST || window.location.hostname) : 'localhost';
        const portValue = process.env.NEXT_PUBLIC_BACKEND_PORT;
        const isLocalhost = wsHost === 'localhost' || wsHost === '127.0.0.1';

        if (isLocalhost && !process.env.NEXT_PUBLIC_WS_HOST) {
            wsHost = 'api.elevate.samta.ai';
        } else {
            const portSuffix = portValue ? `:${portValue}` : (isLocalhost ? ':8000' : '');
            wsHost = `${wsHost}${portSuffix}`;
        }
        const envWsUrl = process.env.NEXT_PUBLIC_WS_URL;

        if (envWsUrl) {
            try {
                if (envWsUrl.includes('://')) {
                    const urlObj = new URL(envWsUrl);
                    wsHost = urlObj.host;
                } else {
                    wsHost = envWsUrl;
                }
            } catch (e) {
                console.warn('Failed to parse NEXT_PUBLIC_WS_URL', e);
            }
        }

        const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const WS_URL = `${protocol}//${wsHost}/ws/telemetry`;

        const dmtTenant = typeof window !== 'undefined' ? localStorage.getItem('dmt-tenant') : null;
        const resolvedTenantId = dmtTenant || tenantId;

        console.log(`[SyncProgressModal] Initializing WebSocket with token...`);
        const urlWithToken = token ? `${WS_URL}/${resolvedTenantId}/?token=${token}` : `${WS_URL}/${resolvedTenantId}/`;

        if (!token) {
            console.warn(`[SyncProgressModal] No auth token found, connecting to WS without token: ${WS_URL}/${resolvedTenantId}/`);
        } else {
            console.log(`[SyncProgressModal] Connecting to WS: ${WS_URL}/${resolvedTenantId}/?token=***${token.slice(-6)}`);
        }
        
        const ws = new WebSocket(urlWithToken);

        let isIntentionallyClosed = false;

        ws.onopen = () => {
            console.log('Connected to Telemetry WS');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'sync_progress' && data.source_id === sourceId) {
                    setSyncState({
                        progress: data.progress,
                        status: data.status,
                        message: data.message,
                        stats: data.stats
                    });

                    if (data.status === 'success') {
                        toast.success('Sync Completed!');
                    } else if (data.status === 'failed') {
                        toast.error('Sync Failed');
                    }
                }
            } catch (err) {
                console.error('Failed to parse WS message', err);
            }
        };

        ws.onerror = (error) => {
            if (!isIntentionallyClosed) {
                console.error('WebSocket Error', error);
            }
        };

        ws.onclose = () => {
            console.log('Telemetry WS Closed');
        };

        return () => {
            ws.close();
        };
    }, [isOpen, sourceId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-popover border border-border rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-2">Syncing {sourceName}</h3>
                    <p className="text-slate-400 text-sm mb-6">Please wait while we fetch data from the source.</p>

                    {/* Progress Bar */}
                    <div className="w-full bg-muted rounded-full h-2.5 mb-2">
                        <div
                            className={`h-2.5 rounded-full transition-all duration-300 ${syncState.status === 'failed' ? 'bg-destructive' :
                                syncState.status === 'success' ? 'bg-success' : 'bg-primary'
                                }`}
                            style={{ width: `${syncState.progress}%` }}
                        ></div>
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground mb-6">
                        <span>{syncState.progress}%</span>
                        <span>{syncState.status === 'in_progress' ? 'Processing...' : syncState.status}</span>
                    </div>

                    {/* Status Message */}
                    <div className={`p-4 rounded-md flex items-start space-x-3 mb-6 ${syncState.status === 'failed' ? 'bg-destructive/10 text-destructive' :
                        syncState.status === 'success' ? 'bg-success/10 text-success' :
                            'bg-primary/10 text-primary'
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
                            className="px-4 py-2 text-sm font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border rounded-md transition-colors"
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
