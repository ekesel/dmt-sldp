'use client';

import React from 'react';
import { X, ExternalLink, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '../UIComponents';

interface IntegrationDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    integration: any; // Using any for now, ideally strictly typed
}

export const IntegrationDetailsModal: React.FC<IntegrationDetailsModalProps> = ({
    isOpen,
    onClose,
    integration
}) => {
    if (!isOpen || !integration) return null;

    const StatusIcon = integration.is_active ? CheckCircle : XCircle;
    const statusColor = integration.is_active ? 'text-green-500' : 'text-slate-400';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 ${statusColor}`}>
                            <StatusIcon size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                                {integration.name}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                                {integration.source_type.replace('_', ' ')}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* Status Card */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</span>
                            <div className="mt-1">
                                <Badge
                                    label={integration.is_active ? 'Active' : 'Inactive'}
                                    variant={integration.is_active ? 'success' : 'neutral'}
                                />
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Sync</span>
                            <div className="mt-1 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <Calendar size={14} />
                                {integration.last_sync_at ? new Date(integration.last_sync_at).toLocaleString() : 'Never'}
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                Base URL
                            </label>
                            <a
                                href={integration.base_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-500 hover:underline flex items-center gap-1 text-sm break-all"
                            >
                                {integration.base_url}
                                <ExternalLink size={12} />
                            </a>
                        </div>

                        {integration.workspace_id && (
                            <div>
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    Workspace ID
                                </label>
                                <p className="text-sm text-slate-700 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block">
                                    {integration.workspace_id}
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                Created On
                            </label>
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                {new Date(integration.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    {/* Warning if inactive */}
                    {!integration.is_active && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg text-amber-800 dark:text-amber-400 text-sm">
                            <AlertCircle className="shrink-0 w-5 h-5" />
                            <p>This integration is currently inactive. No data synchronization will occur until it is reactivated.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 rounded-b-xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
