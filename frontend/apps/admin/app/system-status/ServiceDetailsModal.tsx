'use client';
import React, { useState, useEffect } from 'react';
import { X, Activity, RefreshCw, Server, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@dmt/api';

interface ServiceDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    serviceName: string;
}

interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
}

interface ServiceDetails {
    name: string;
    status: string;
    version: string;
    uptime: string;
    last_check: string;
    logs: LogEntry[];
    [key: string]: any; // Allow dynamic metrics
}

export const ServiceDetailsModal: React.FC<ServiceDetailsModalProps> = ({ isOpen, onClose, serviceName }) => {
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState<ServiceDetails | null>(null);
    const [restarting, setRestarting] = useState(false);

    useEffect(() => {
        console.log('ServiceDetailsModal mounted with:', { isOpen, serviceName });
        if (isOpen && serviceName) {
            fetchDetails();
        }
    }, [isOpen, serviceName]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            // Using the new endpoint we just created
            const response = await api.get<ServiceDetails>(`/admin/health/services/${serviceName}/`);
            setDetails(response.data);
        } catch (error) {
            console.error('Failed to fetch service details:', error);
            toast.error('Could not load service details');
        } finally {
            setLoading(false);
        }
    };

    const handleRestart = async () => {
        if (!confirm(`Are you sure you want to restart ${serviceName}? This may cause temporary downtime.`)) {
            return;
        }

        setRestarting(true);
        try {
            await api.post(`/admin/services/${serviceName}/restart/`);
            toast.success('Restart initiated successfully');
            onClose();
        } catch (error) {
            console.error('Failed to restart service:', error);
            toast.error('Failed to initiate restart');
        } finally {
            setRestarting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white capitalize">
                                {serviceName?.replace('_', ' ')}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Service Inspector</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded-full text-slate-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    ) : details ? (
                        <div className="space-y-6">
                            {/* Status Banner */}
                            <div className={`flex items-center justify-between p-4 rounded-lg border ${details.status === 'up'
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30'
                                }`}>
                                <div className="flex items-center gap-3">
                                    {details.status === 'up' ? (
                                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    ) : (
                                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    )}
                                    <span className={`font-semibold ${details.status === 'up' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                                        }`}>
                                        Status: {details.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                    Uptime: {details.uptime}
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <MetricCard label="Version" value={details.version} />
                                <MetricCard label="Last Check" value={new Date(details.last_check).toLocaleTimeString()} />

                                {/* Dynamic Metrics */}
                                {Object.entries(details).map(([key, value]) => {
                                    if (['name', 'status', 'version', 'uptime', 'last_check', 'logs'].includes(key)) return null;
                                    return (
                                        <MetricCard
                                            key={key}
                                            label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            value={String(value)}
                                        />
                                    );
                                })}
                            </div>

                            {/* Logs Section */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <FileText size={16} /> Recent Logs
                                </h3>
                                <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                                    {details.logs.map((log, idx) => (
                                        <div key={idx} className="mb-1 last:mb-0">
                                            <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                            <span className={`mx-2 font-bold ${log.level === 'INFO' ? 'text-blue-400' :
                                                log.level === 'WARNING' ? 'text-yellow-400' : 'text-red-400'
                                                }`}>[{log.level}]</span>
                                            <span className="text-slate-300">{log.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 py-8">
                            Failed to load details.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white font-medium transition-colors"
                    >
                        Close
                    </button>
                    {(details?.status === 'up' || details?.status === 'down') && (
                        <button
                            onClick={handleRestart}
                            disabled={restarting}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {restarting ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                            {restarting ? 'Restarting...' : 'Restart Service'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ label, value }: { label: string; value: string }) => (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{label}</div>
        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={value}>{value}</div>
    </div>
);
