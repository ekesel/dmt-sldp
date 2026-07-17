'use client';
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { getBaseline, updateBaseline } from './actions';
import { Save, RefreshCcw, Building2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function CompanyBaselinePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [baseline, setBaseline] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getBaseline();
            if (data) {
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
        setBaseline((prev: any) => ({
            ...prev,
            kpis: {
                ...prev.kpis,
                [key]: typeof value === 'string' ? parseFloat(value) || 0 : value
            }
        }));
        setHasUnsavedChanges(true);
    };

    const handleItemVolumeChange = (field: 'total' | 'completed', value: string | number) => {
        setBaseline((prev: any) => ({
            ...prev,
            kpis: {
                ...prev.kpis,
                item_volume: {
                    ...prev.kpis.item_volume,
                    [field]: typeof value === 'string' ? parseInt(value) || 0 : value
                }
            }
        }));
        setHasUnsavedChanges(true);
    };

    const handleMetaChange = (key: string, value: string) => {
        setBaseline((prev: any) => ({
            ...prev,
            [key]: value
        }));
        setHasUnsavedChanges(true);
    };

    const saveChanges = async () => {
        if (!baseline) return;
        setSaving(true);
        try {
            const res = await updateBaseline(baseline);
            if (res.success) {
                toast.success('Company baseline updated successfully');
                setHasUnsavedChanges(false);
                // Reload to get the newly stamped last_updated date
                await loadData();
            } else {
                toast.error(res.error || 'Failed to update');
            }
        } catch (error) {
            toast.error('Error saving baseline');
        } finally {
            setSaving(false);
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

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                            <Building2 className="w-8 h-8 text-primary" />
                            Company Baseline
                        </h1>
                        <p className="text-muted-foreground">Manage organisation-wide performance targets used for sprint comparisons.</p>
                    </div>
                    {hasUnsavedChanges && (
                        <div className="flex items-center gap-2 bg-warning/10 text-warning px-3 py-1 rounded-full text-xs font-medium border border-warning/20">
                            <AlertTriangle size={14} />
                            Unsaved Changes
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* KPIs */}
                    <div>
                        <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
                            <h2 className="text-lg font-semibold text-foreground mb-6">Key Performance Indicators</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Velocity (Points)</label>
                                    <p className="text-xs text-muted-foreground mb-2">Target story points completed per sprint.</p>
                                    <input
                                        type="number"
                                        value={baseline.kpis?.velocity || 0}
                                        onChange={(e) => handleKpiChange('velocity', e.target.value)}
                                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Compliance Rate (%)</label>
                                    <p className="text-xs text-muted-foreground mb-2">Target security/coding standard compliance.</p>
                                    <input
                                        type="number"
                                        value={baseline.kpis?.compliance_rate || 0}
                                        onChange={(e) => handleKpiChange('compliance_rate', e.target.value)}
                                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition"
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
                                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition"
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
                                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition"
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
                                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition"
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
                                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition"
                                    />
                                </div>
                                
                                <div className="md:col-span-2 border-t border-border pt-6 mt-2">
                                    <h3 className="text-md font-semibold text-foreground mb-4">Item Volume Targets</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">Total Items</label>
                                            <input
                                                type="number"
                                                value={baseline.kpis?.item_volume?.total || 0}
                                                onChange={(e) => handleItemVolumeChange('total', e.target.value)}
                                                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">Completed Items</label>
                                            <input
                                                type="number"
                                                value={baseline.kpis?.item_volume?.completed || 0}
                                                onChange={(e) => handleItemVolumeChange('completed', e.target.value)}
                                                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="fixed bottom-8 right-8 z-10">
                    <button
                        onClick={saveChanges}
                        disabled={saving || !hasUnsavedChanges}
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition shadow-lg ${hasUnsavedChanges ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20' : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'}`}
                    >
                        {saving ? (
                            <RefreshCcw className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        <span>{saving ? 'Saving...' : 'Save Baseline'}</span>
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}
