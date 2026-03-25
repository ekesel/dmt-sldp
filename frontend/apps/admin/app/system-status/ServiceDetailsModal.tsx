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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-popover w-full max-w-2xl rounded-xl shadow-2xl border border-border overflow-hidden transform transition-all">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Server className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground capitalize">
                                {serviceName?.replace('_', ' ')}
                            </h2>
                            <p className="text-sm text-muted-foreground">Service Inspector</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    ) : details ? (
                        <div className="space-y-6">
                            {/* Status Banner */}
                            <div className={`flex items-center justify-between p-4 rounded-lg border ${details.status === 'up'
                                ? 'bg-success/10 border-success/20'
                                : 'bg-destructive/10 border-destructive/20'
                                }`}>
                                <div className="flex items-center gap-3">
                                    {details.status === 'up' ? (
                                        <CheckCircle className="w-5 h-5 text-success" />
                                    ) : (
                                        <AlertTriangle className="w-5 h-5 text-destructive" />
                                    )}
                                    <span className={`font-semibold ${details.status === 'up' ? 'text-success' : 'text-destructive'
                                        }`}>
                                        Status: {details.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="text-sm text-muted-foreground">
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
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <FileText size={16} /> Recent Logs
                                </h3>
                                <div className="bg-slate-950 border border-border rounded-lg p-4 font-mono text-sm overflow-x-auto shadow-inner">
                                    {details.logs.map((log, idx) => (
                                        <div key={idx} className="mb-1 last:mb-0">
                                            <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                            <span className={`mx-2 font-bold ${log.level === 'INFO' ? 'text-primary' :
                                                log.level === 'WARNING' ? 'text-warning' : 'text-destructive'
                                                }`}>[{log.level}]</span>
                                            <span className="text-slate-200">{log.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            Failed to load details.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border bg-muted/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
                    >
                        Close
                    </button>
                    {(details?.status === 'up' || details?.status === 'down') && (
                        <button
                            onClick={handleRestart}
                            disabled={restarting}
                            className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-destructive/20"
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
    <div className="bg-muted/50 p-3 rounded-lg border border-border">
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
        <div className="font-semibold text-foreground truncate" title={value}>{value}</div>
    </div>
);
