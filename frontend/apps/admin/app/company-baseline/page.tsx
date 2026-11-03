'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { companyBaseline } from '@dmt/api';
import { useAuth } from '../auth/AuthContext';
import {
    Save,
    RefreshCcw,
    Building2,
    AlertTriangle,
    Sliders,
    Scale,
    Shield,
    Lock,
    Calendar,
    Users,
    Trash2,
    History,
    ChevronDown,
    ChevronUp,
    Info,
    CheckCircle2,
    Sparkles,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface SeniorityWeights {
    junior: number;
    mid: number;
    senior: number;
}

export interface PerSprintLimits {
    under: number;
    over: number;
}

export interface WorkloadSettings {
    seniority_weights?: SeniorityWeights;
    per_sprint_limits?: PerSprintLimits;
    sprint_window?: number;
    use_allocation?: boolean;
    min_allocation?: number;
    count_subtasks?: boolean;
    use_percentile?: boolean;
    overload_percentile?: number;
    underutil_percentile?: number;
    small_team_min?: number;
    [key: string]: any;
}

export interface WorkloadSettingsHistoryItem {
    effective_from: string;
    settings: {
        seniority_weights?: SeniorityWeights;
        per_sprint_limits?: PerSprintLimits;
        [key: string]: any;
    };
}

export interface CompanyBaselineData {
    name?: string;
    description?: string;
    last_updated?: string;
    kpis: {
        item_volume?: {
            total: number;
            completed: number;
        };
        velocity?: number;
        compliance_rate?: number;
        cycle_time?: number;
        defect_density?: number;
        pr_review_speed?: number;
        ai_usage?: number;
        [key: string]: number | { total: number; completed: number } | undefined;
    };
    workload_settings?: WorkloadSettings;
    workload_settings_history?: WorkloadSettingsHistoryItem[];
}

const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function CompanyBaselinePage() {
    const { user } = useAuth();
    const isSuperAdmin = !!user?.is_superuser;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [baseline, setBaseline] = useState<CompanyBaselineData | null>(null);
    const [effectiveFrom, setEffectiveFrom] = useState<string>(getTodayStr());
    const [showHistory, setShowHistory] = useState<boolean>(false);
    const [deletingDate, setDeletingDate] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const response = await companyBaseline.getBaseline();
            if (response && response.data) {
                const data: CompanyBaselineData = response.data;
                // Ensure workload_settings has sensible fallback defaults if missing
                if (!data.workload_settings) {
                    data.workload_settings = {
                        seniority_weights: { junior: 0.7, mid: 1.0, senior: 1.3 },
                        per_sprint_limits: { under: 3, over: 6 },
                    };
                } else {
                    data.workload_settings = {
                        ...data.workload_settings,
                        seniority_weights: {
                            junior: data.workload_settings.seniority_weights?.junior ?? 0.7,
                            mid: data.workload_settings.seniority_weights?.mid ?? 1.0,
                            senior: data.workload_settings.seniority_weights?.senior ?? 1.3,
                        },
                        per_sprint_limits: {
                            under: data.workload_settings.per_sprint_limits?.under ?? 3,
                            over: data.workload_settings.per_sprint_limits?.over ?? 6,
                        },
                    };
                }
                setBaseline(data);
            } else {
                toast.error('Failed to load company baseline data');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error loading baseline');
        } finally {
            setLoading(false);
        }
    };

    const handleKpiChange = (key: string, value: string | number) => {
        setBaseline((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                kpis: {
                    ...prev.kpis,
                    [key]: typeof value === 'string' ? parseFloat(value) || 0 : value,
                },
            };
        });
        setHasUnsavedChanges(true);
    };

    const handleItemVolumeChange = (field: 'total' | 'completed', value: string | number) => {
        setBaseline((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                kpis: {
                    ...prev.kpis,
                    item_volume: {
                        ...(prev.kpis.item_volume || { total: 0, completed: 0 }),
                        [field]: typeof value === 'string' ? parseInt(value) || 0 : value,
                    },
                },
            };
        });
        setHasUnsavedChanges(true);
    };

    const handleSeniorityWeightChange = (level: 'junior' | 'mid' | 'senior', value: string) => {
        const num = parseFloat(value);
        setBaseline((prev) => {
            if (!prev) return prev;
            const currentWs = prev.workload_settings || {
                seniority_weights: { junior: 0.7, mid: 1.0, senior: 1.3 },
                per_sprint_limits: { under: 3, over: 6 },
            };
            const currentWeights = currentWs.seniority_weights || { junior: 0.7, mid: 1.0, senior: 1.3 };
            return {
                ...prev,
                workload_settings: {
                    ...currentWs,
                    seniority_weights: {
                        ...currentWeights,
                        [level]: isNaN(num) ? ('' as any) : num,
                    },
                },
            };
        });
        setHasUnsavedChanges(true);
    };

    const handleSprintLimitChange = (field: 'under' | 'over', value: string) => {
        const num = parseFloat(value);
        setBaseline((prev) => {
            if (!prev) return prev;
            const currentWs = prev.workload_settings || {
                seniority_weights: { junior: 0.7, mid: 1.0, senior: 1.3 },
                per_sprint_limits: { under: 3, over: 6 },
            };
            const currentLimits = currentWs.per_sprint_limits || { under: 3, over: 6 };
            return {
                ...prev,
                workload_settings: {
                    ...currentWs,
                    per_sprint_limits: {
                        ...currentLimits,
                        [field]: isNaN(num) ? ('' as any) : num,
                    },
                },
            };
        });
        setHasUnsavedChanges(true);
    };

    const saveChanges = async () => {
        if (!baseline) return;

        // Superadmin workload settings validation
        if (isSuperAdmin) {
            const junior = Number(baseline.workload_settings?.seniority_weights?.junior ?? 0.7);
            const mid = Number(baseline.workload_settings?.seniority_weights?.mid ?? 1.0);
            const senior = Number(baseline.workload_settings?.seniority_weights?.senior ?? 1.3);
            const under = Number(baseline.workload_settings?.per_sprint_limits?.under ?? 3);
            const over = Number(baseline.workload_settings?.per_sprint_limits?.over ?? 6);

            if (isNaN(junior) || junior < 0.1 || junior > 100) {
                toast.error('Junior weight must be a number between 0.1 and 100');
                return;
            }
            if (isNaN(mid) || mid < 0.1 || mid > 100) {
                toast.error('Mid Senior weight must be a number between 0.1 and 100');
                return;
            }
            if (isNaN(senior) || senior < 0.1 || senior > 100) {
                toast.error('Senior weight must be a number between 0.1 and 100');
                return;
            }
            if (isNaN(under) || under < 0 || under > 100) {
                toast.error('Minimum sprint tasks must be between 0 and 100');
                return;
            }
            if (isNaN(over) || over < 0 || over > 100) {
                toast.error('Maximum sprint tasks must be between 0 and 100');
                return;
            }
            if (under >= over) {
                toast.error('Minimum sprint tasks must be strictly below maximum sprint tasks (Min < Max)');
                return;
            }
            if (!effectiveFrom || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
                toast.error('Effective from date must be in YYYY-MM-DD format');
                return;
            }
        }

        setSaving(true);
        try {
            const payload: any = {
                kpis: baseline.kpis,
            };

            // Workload settings drive developer status and can only be saved by superadmins
            if (isSuperAdmin) {
                payload.workload_settings = {
                    seniority_weights: {
                        junior: Number(baseline.workload_settings?.seniority_weights?.junior ?? 0.7),
                        mid: Number(baseline.workload_settings?.seniority_weights?.mid ?? 1.0),
                        senior: Number(baseline.workload_settings?.seniority_weights?.senior ?? 1.3),
                    },
                    per_sprint_limits: {
                        under: Number(baseline.workload_settings?.per_sprint_limits?.under ?? 3),
                        over: Number(baseline.workload_settings?.per_sprint_limits?.over ?? 6),
                    },
                };
                if (effectiveFrom) {
                    payload.workload_settings_effective_from = effectiveFrom;
                }
            }

            const res = await companyBaseline.updateBaseline(payload);
            if (res && (res.status_code === 200 || res.status_code === 201)) {
                toast.success('Company baseline updated successfully');
                setHasUnsavedChanges(false);
                if (res.data) {
                    const data: CompanyBaselineData = res.data;
                    if (!data.workload_settings) {
                        data.workload_settings = {
                            seniority_weights: { junior: 0.7, mid: 1.0, senior: 1.3 },
                            per_sprint_limits: { under: 3, over: 6 },
                        };
                    }
                    setBaseline(data);
                }
            } else {
                toast.error(res?.message || 'Failed to update');
            }
        } catch (error: any) {
            console.error(error);
            const errData = error?.response?.data;
            if (errData?.status_code === 403) {
                toast.error(errData.message || 'Only superadmins can change workload settings.');
            } else if (errData?.data?.non_field_errors) {
                const msg = Array.isArray(errData.data.non_field_errors)
                    ? errData.data.non_field_errors.join(' ')
                    : errData.data.non_field_errors;
                toast.error(msg);
            } else if (errData?.data?.effective_from) {
                const msg = Array.isArray(errData.data.effective_from)
                    ? errData.data.effective_from.join(' ')
                    : errData.data.effective_from;
                toast.error(`Effective date: ${msg}`);
            } else if (errData?.data && typeof errData.data === 'object') {
                const firstKey = Object.keys(errData.data)[0];
                const firstErr = errData.data[firstKey];
                const msg = Array.isArray(firstErr) ? firstErr.join(' ') : String(firstErr);
                toast.error(`${firstKey}: ${msg}`);
            } else {
                toast.error(errData?.message || error?.message || 'Error saving baseline');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteVersion = async (dateStr: string) => {
        if (!isSuperAdmin) {
            toast.error('Only superadmins can delete workload settings versions.');
            return;
        }
        if (!confirm(`Are you sure you want to delete workload settings saved for ${dateStr}?`)) {
            return;
        }
        setDeletingDate(dateStr);
        try {
            const res = await companyBaseline.deleteWorkloadSettingsVersion(dateStr);
            if (res && res.status_code === 200) {
                toast.success(`Settings version for ${dateStr} deleted`);
                if (res.data) {
                    setBaseline(res.data);
                } else {
                    loadData();
                }
            } else {
                toast.error(res?.message || 'Failed to delete settings version');
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Error deleting settings version');
        } finally {
            setDeletingDate(null);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <RefreshCcw className="w-8 h-8 text-primary animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    if (!baseline) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
                    Could not load baseline data.
                </div>
            </DashboardLayout>
        );
    }

    const currentJunior = baseline.workload_settings?.seniority_weights?.junior ?? 0.7;
    const currentMid = baseline.workload_settings?.seniority_weights?.mid ?? 1.0;
    const currentSenior = baseline.workload_settings?.seniority_weights?.senior ?? 1.3;
    const currentUnder = baseline.workload_settings?.per_sprint_limits?.under ?? 3;
    const currentOver = baseline.workload_settings?.per_sprint_limits?.over ?? 6;

    const isLimitInvalid = Number(currentUnder) >= Number(currentOver);

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-24 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 text-primary">
                                <Building2 className="w-7 h-7" />
                            </div>
                            Company Baseline
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Manage organisation-wide performance targets, developer capacity weights, and sprint compliance thresholds.
                        </p>
                    </div>
                    {hasUnsavedChanges && (
                        <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-amber-500/20 shadow-sm animate-pulse">
                            <AlertTriangle size={14} />
                            Unsaved Changes
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {/* Section 1: Developer Capacity & Workload Baseline */}
                    <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
                        {/* Decorative background subtle glow */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
                                    <Scale className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
                                        Developer Capacity & Workload Baseline
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Configure seniority multipliers and sprint task thresholds for capacity-based workload compliance.
                                    </p>
                                </div>
                            </div>
                            <div>
                                {isSuperAdmin ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                        <Shield size={13} /> Superadmin Access
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        <Lock size={13} /> View Only (Superadmin Required)
                                    </span>
                                )}
                            </div>
                        </div>

                        {!isSuperAdmin && (
                            <div className="mt-6 flex items-center gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-xs">
                                <Lock size={16} className="shrink-0" />
                                <span>
                                    Workload and capacity compliance settings can only be modified by Super Administrators. You can view current values, but inputs are locked.
                                </span>
                            </div>
                        )}

                        {/* Formula explainer box */}
                        <div className="mt-6 bg-muted/40 border border-border/80 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                                    <Info size={14} /> Capacity & Compliance Formula
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    <span className="font-semibold text-foreground">Capacity</span> = Seniority Weight × Project Allocation % &nbsp;•&nbsp;
                                    <span className="font-semibold text-foreground">Ideal Range</span> = (Min to Max Tasks) × Capacity
                                </p>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-muted-foreground bg-card/60 px-3.5 py-2 rounded-lg border border-border">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Underutilised (&lt; Min)
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Balanced (Ideal)
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Overloaded (&gt; Max)
                                </span>
                            </div>
                        </div>

                        {/* Seniority Weights Section (3 fields: Junior, Mid Senior, Senior) */}
                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                                        <Users size={16} className="text-primary" /> Seniority Level Weights
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Relative capacity multiplier assigned to each developer seniority tier (must be between 0.1 and 100).
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Junior */}
                                <div className="bg-card/60 border border-border rounded-xl p-5 hover:border-border/80 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-foreground">Junior</label>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                            Junior Tier
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Capacity multiplier for Junior engineers (Default: 0.7).
                                    </p>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0.1"
                                            max="100"
                                            disabled={!isSuperAdmin}
                                            value={currentJunior}
                                            onChange={(e) => handleSeniorityWeightChange('junior', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed transition font-mono text-sm"
                                            placeholder="0.7"
                                        />
                                    </div>
                                </div>

                                {/* Mid Senior */}
                                <div className="bg-card/60 border border-border rounded-xl p-5 hover:border-border/80 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-foreground">Mid Senior</label>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                            Mid Tier
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Capacity multiplier for Mid / Mid-Senior engineers (Default: 1.0).
                                    </p>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0.1"
                                            max="100"
                                            disabled={!isSuperAdmin}
                                            value={currentMid}
                                            onChange={(e) => handleSeniorityWeightChange('mid', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed transition font-mono text-sm"
                                            placeholder="1.0"
                                        />
                                    </div>
                                </div>

                                {/* Senior */}
                                <div className="bg-card/60 border border-border rounded-xl p-5 hover:border-border/80 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-foreground">Senior</label>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
                                            Senior Tier
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Capacity multiplier for Senior / Lead engineers (Default: 1.3).
                                    </p>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0.1"
                                            max="100"
                                            disabled={!isSuperAdmin}
                                            value={currentSenior}
                                            onChange={(e) => handleSeniorityWeightChange('senior', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed transition font-mono text-sm"
                                            placeholder="1.3"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sprint Task Limits for Compliance Section (2 fields: Minimum and Maximum) */}
                        <div className="mt-8 pt-6 border-t border-border">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Sliders size={16} className="text-primary" /> Sprint Task Limits (Compliance)
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Expected task/item count range for a 100% capacity developer in one sprint.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Minimum Sprint Tasks */}
                                <div className="bg-card/60 border border-border rounded-xl p-5 hover:border-border/80 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-foreground">Minimum Sprint Tasks</label>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                            Min (Underutilised Threshold)
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Fewer tasks than this × capacity is classified as <span className="text-blue-500 font-medium">Underutilised</span>
                                    </p>
                                    <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        max="100"
                                        disabled={!isSuperAdmin}
                                        value={currentUnder}
                                        onChange={(e) => handleSprintLimitChange('under', e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed transition font-mono text-sm"
                                        placeholder="3"
                                    />
                                </div>

                                {/* Maximum Sprint Tasks */}
                                <div className="bg-card/60 border border-border rounded-xl p-5 hover:border-border/80 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-foreground">Maximum Sprint Tasks</label>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                            Max (Overloaded Threshold)
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        More tasks than this × capacity is classified as <span className="text-rose-500 font-medium">Overloaded</span>
                                    </p>
                                    <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        max="100"
                                        disabled={!isSuperAdmin}
                                        value={currentOver}
                                        onChange={(e) => handleSprintLimitChange('over', e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed transition font-mono text-sm"
                                        placeholder="6"
                                    />
                                </div>

                                {isLimitInvalid && (
                                    <div className="md:col-span-2 flex items-center gap-2 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-medium">
                                        <AlertTriangle size={16} className="shrink-0" />
                                        <span>
                                            Validation error: Minimum sprint tasks ({currentUnder}) must be strictly less than maximum sprint tasks ({currentOver}).
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Effective Date & Live Preview Card */}
                        <div className="mt-8 pt-6 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Effective From Date */}
                            <div className="bg-card/60 border border-border rounded-xl p-5">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                        <Calendar size={15} className="text-primary" /> Effective From Date
                                    </label>
                                    <button
                                        type="button"
                                        disabled={!isSuperAdmin}
                                        onClick={() => {
                                            setEffectiveFrom(getTodayStr());
                                            setHasUnsavedChanges(true);
                                        }}
                                        className="text-xs text-primary hover:underline font-medium disabled:opacity-50"
                                    >
                                        Set to Today
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground mb-3">
                                    Sprints starting on or after this date will apply these settings. Past sprints remain unchanged.
                                </p>
                                <input
                                    type="date"
                                    disabled={!isSuperAdmin}
                                    value={effectiveFrom}
                                    onChange={(e) => {
                                        setEffectiveFrom(e.target.value);
                                        setHasUnsavedChanges(true);
                                    }}
                                    className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed transition text-sm"
                                />
                            </div>

                            {/* Live Range Preview */}
                            <div className="bg-gradient-to-br from-primary/5 via-card to-card border border-primary/20 rounded-xl p-5 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                                        <Sparkles size={14} /> Live Ideal Task Range (at 100% Allocation)
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Calculated sprint task ranges with current inputs:
                                    </p>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-card/80 p-2.5 rounded-lg border border-border">
                                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Junior</p>
                                        <p className="text-sm font-bold text-foreground mt-0.5">
                                            {(Number(currentUnder) * Number(currentJunior)).toFixed(1)} – {(Number(currentOver) * Number(currentJunior)).toFixed(1)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">tasks/sprint</p>
                                    </div>
                                    <div className="bg-card/80 p-2.5 rounded-lg border border-border">
                                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Mid Senior</p>
                                        <p className="text-sm font-bold text-foreground mt-0.5">
                                            {(Number(currentUnder) * Number(currentMid)).toFixed(1)} – {(Number(currentOver) * Number(currentMid)).toFixed(1)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">tasks/sprint</p>
                                    </div>
                                    <div className="bg-card/80 p-2.5 rounded-lg border border-border">
                                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Senior</p>
                                        <p className="text-sm font-bold text-foreground mt-0.5">
                                            {(Number(currentUnder) * Number(currentSenior)).toFixed(1)} – {(Number(currentOver) * Number(currentSenior)).toFixed(1)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">tasks/sprint</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Version History Collapsible */}
                        {baseline.workload_settings_history && baseline.workload_settings_history.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="flex items-center justify-between w-full text-left text-sm font-semibold text-foreground hover:text-primary transition"
                                >
                                    <span className="flex items-center gap-2">
                                        <History size={16} className="text-primary" />
                                        Workload Settings Version History ({baseline.workload_settings_history.length})
                                    </span>
                                    {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>

                                {showHistory && (
                                    <div className="mt-4 space-y-3">
                                        <div className="overflow-x-auto rounded-xl border border-border bg-card/40">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-muted/50 text-muted-foreground border-b border-border uppercase font-semibold">
                                                    <tr>
                                                        <th className="px-4 py-3">Effective From</th>
                                                        <th className="px-4 py-3">Seniority Weights (Jr / Mid / Sr)</th>
                                                        <th className="px-4 py-3">Task Limits (Min / Max)</th>
                                                        {isSuperAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {baseline.workload_settings_history.map((hist, idx) => {
                                                        const s = hist.settings || {};
                                                        const w: Partial<SeniorityWeights> = s.seniority_weights || {};
                                                        const l: Partial<PerSprintLimits> = s.per_sprint_limits || {};
                                                        return (
                                                            <tr key={idx} className="hover:bg-muted/20 transition">
                                                                <td className="px-4 py-3 font-medium text-foreground font-mono">
                                                                    {hist.effective_from}
                                                                </td>
                                                                <td className="px-4 py-3 text-muted-foreground font-mono">
                                                                    {w.junior ?? 0.7} / {w.mid ?? 1.0} / {w.senior ?? 1.3}
                                                                </td>
                                                                <td className="px-4 py-3 text-muted-foreground font-mono">
                                                                    {l.under ?? 3} – {l.over ?? 6} tasks
                                                                </td>
                                                                {isSuperAdmin && (
                                                                    <td className="px-4 py-3 text-right">
                                                                        <button
                                                                            type="button"
                                                                            disabled={deletingDate === hist.effective_from}
                                                                            onClick={() => handleDeleteVersion(hist.effective_from)}
                                                                            className="inline-flex items-center gap-1 text-destructive hover:underline disabled:opacity-50"
                                                                            title="Delete this settings version"
                                                                        >
                                                                            {deletingDate === hist.effective_from ? (
                                                                                <RefreshCcw size={12} className="animate-spin" />
                                                                            ) : (
                                                                                <Trash2 size={13} />
                                                                            )}
                                                                            <span>Delete</span>
                                                                        </button>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Section 2: Key Performance Indicators */}
                    <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
                        <div className="flex items-center gap-3 pb-6 border-b border-border mb-6">
                            <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Key Performance Indicators</h2>
                                <p className="text-xs text-muted-foreground">
                                    Target metrics used across sprint performance comparisons and executive dashboards.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Velocity (Points)</label>
                                <p className="text-xs text-muted-foreground mb-2">Target story points completed per sprint.</p>
                                <input
                                    type="number"
                                    value={baseline.kpis?.velocity || 0}
                                    onChange={(e) => handleKpiChange('velocity', e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Compliance Rate (%)</label>
                                <p className="text-xs text-muted-foreground mb-2">Target security/coding standard compliance.</p>
                                <input
                                    type="number"
                                    value={baseline.kpis?.compliance_rate || 0}
                                    onChange={(e) => handleKpiChange('compliance_rate', e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Cycle Time (Days)</label>
                                <p className="text-xs text-muted-foreground mb-2">Average time from start to completion.</p>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={baseline.kpis?.cycle_time || 0}
                                    onChange={(e) => handleKpiChange('cycle_time', e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Defect Density</label>
                                <p className="text-xs text-muted-foreground mb-2">Bugs per deployment/release.</p>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={baseline.kpis?.defect_density || 0}
                                    onChange={(e) => handleKpiChange('defect_density', e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">PR Review Speed (Hours)</label>
                                <p className="text-xs text-muted-foreground mb-2">Average time to review a pull request.</p>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={baseline.kpis?.pr_review_speed || 0}
                                    onChange={(e) => handleKpiChange('pr_review_speed', e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">AI Usage (%)</label>
                                <p className="text-xs text-muted-foreground mb-2">Target AI code generation/assistance rate.</p>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={baseline.kpis?.ai_usage || 0}
                                    onChange={(e) => handleKpiChange('ai_usage', e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition font-mono text-sm"
                                />
                            </div>

                            <div className="md:col-span-2 border-t border-border pt-6 mt-2">
                                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Item Volume Targets</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Total Items</label>
                                        <input
                                            type="number"
                                            value={baseline.kpis?.item_volume?.total || 0}
                                            onChange={(e) => handleItemVolumeChange('total', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition font-mono text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Completed Items</label>
                                        <input
                                            type="number"
                                            value={baseline.kpis?.item_volume?.completed || 0}
                                            onChange={(e) => handleItemVolumeChange('completed', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition font-mono text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating Save Button */}
                <div className="fixed bottom-8 right-8 z-20">
                    <button
                        onClick={saveChanges}
                        disabled={saving || !hasUnsavedChanges || isLimitInvalid}
                        className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-semibold transition-all shadow-xl ${
                            hasUnsavedChanges && !isLimitInvalid
                                ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25 hover:scale-105 active:scale-95'
                                : 'bg-muted text-muted-foreground cursor-not-allowed border border-border shadow-none'
                        }`}
                    >
                        {saving ? (
                            <RefreshCcw className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        <span>{saving ? 'Saving Baseline...' : 'Save Baseline'}</span>
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}
