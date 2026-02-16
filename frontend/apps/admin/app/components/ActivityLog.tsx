import React, { useEffect, useState } from 'react';
import { activityLog, AuditLogEntry } from '@dmt/api';
import {
    PlusCircle,
    RefreshCw,
    Trash2,
    AlertCircle,
    Clock,
    Database,
    ChevronRight,
    ShieldCheck,
    LogOut,
    Settings
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ActionIcon = ({ action }: { action: string }) => {
    switch (action) {
        case 'create': return <PlusCircle size={16} className="text-green-400" />;
        case 'update': return <RefreshCw size={16} className="text-blue-400" />;
        case 'delete': return <Trash2 size={16} className="text-red-400" />;
        case 'login': return <ShieldCheck size={16} className="text-emerald-400" />;
        case 'logout': return <LogOut size={16} className="text-slate-400" />;
        case 'trigger_sync': return <RefreshCw size={16} className="text-purple-400 animate-spin-slow" />;
        case 'sync_success': return <RefreshCw size={16} className="text-green-500" />;
        case 'sync_failed': return <AlertCircle size={16} className="text-orange-500" />;
        case 'archive_data': return <Settings size={16} className="text-amber-400" />;
        default: return <RefreshCw size={16} className="text-slate-400" />;
    }
};

export const ActivityLogItem: React.FC<{ entry: AuditLogEntry; compact?: boolean }> = ({ entry, compact }) => (
    <div className={`flex items-start gap-4 p-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${compact ? 'py-3' : ''}`}>
        <div className={`p-2 rounded-lg bg-slate-800 ${compact ? 'p-1.5' : ''}`}>
            <ActionIcon action={entry.action} />
        </div>

        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-white truncate">
                    <span className="text-blue-400 font-semibold">{entry.actor_name}</span>
                    <span className="text-slate-400 mx-1">
                        {entry.action === 'create' ? 'created' :
                            entry.action === 'update' ? 'updated' :
                                entry.action === 'delete' ? 'deleted' :
                                    entry.action === 'login' ? 'logged in' :
                                        entry.action === 'logout' ? 'logged out' :
                                            entry.action === 'trigger_sync' ? 'triggered sync for' :
                                                entry.action === 'sync_success' ? 'successfully synced' :
                                                    entry.action === 'sync_failed' ? 'failed to sync' :
                                                        entry.action}
                    </span>
                    <span className="text-slate-200">{entry.entity_type}</span>
                    {entry.entity_id && entry.entity_id !== '0' && (
                        <span className="text-slate-500 text-xs ml-1">#{entry.entity_id}</span>
                    )}
                </p>
                <span className="text-[10px] text-slate-500 whitespace-nowrap flex items-center gap-1">
                    <Clock size={10} />
                    {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                </span>
            </div>

            {!compact && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Database size={12} />
                    <span>{entry.tenant_name || 'System'}</span>
                    {entry.new_values && (
                        <>
                            <span className="mx-1">•</span>
                            <span className="truncate max-w-[300px] font-mono opacity-80">
                                {JSON.stringify(entry.new_values).substring(0, 80)}...
                            </span>
                        </>
                    )}
                </div>
            )}
        </div>
    </div>
);

export const ActivityLog: React.FC<{
    limit?: number;
    tenantId?: number;
    compact?: boolean;
    className?: string;
    title?: string;
}> = ({ limit, tenantId, compact, className = '', title }) => {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                setLoading(true);
                const response = await activityLog.list({ limit, tenant: tenantId });
                // Handle both paginated and non-paginated responses
                if (Array.isArray(response)) {
                    setLogs(response);
                } else if (response && response.results) {
                    setLogs(response.results);
                } else {
                    setLogs([]);
                }
            } catch (err) {
                setError('Failed to load activity logs');
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [limit, tenantId]);

    if (loading && (!logs || logs.length === 0)) {
        return (
            <div className={`bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden p-1 ${className}`}>
                {[...Array(limit || 5)].map((_, i) => (
                    <div key={i} className="h-16 bg-slate-800/20 m-2 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className={`p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm ${className}`}>
                {error}
            </div>
        );
    }

    return (
        <div className={`bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-lg ${className}`}>
            {title && (
                <div className="p-4 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Real-time Feed</span>
                </div>
            )}

            <div className="divide-y divide-slate-800/50">
                {logs.length === 0 ? (
                    <div className="text-slate-500 text-center py-12 text-sm italic">
                        No recent activity recorded.
                    </div>
                ) : (
                    logs.map((log) => (
                        <ActivityLogItem key={log.id} entry={log} compact={compact} />
                    ))
                )}
            </div>

            {!compact && logs.length > 0 && (
                <a
                    href="/admin/activity"
                    className="group flex items-center justify-center gap-2 p-3 text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all border-t border-slate-800"
                >
                    View detailed audit trail
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </a>
            )}
        </div>
    );
};
