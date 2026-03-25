'use client';
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Settings, Shield, HardDrive, RefreshCcw, Save, Moon, Sun, AlertTriangle, Archive } from 'lucide-react';
import { settings as apiSettings, tenants as apiTenants, SystemSettings, RetentionPolicy } from '@dmt/api';
import { toast } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import { useCurrentTenant } from '../context/TenantContext';

export default function SettingsPage() {
    const { currentTenantId, currentTenant } = useCurrentTenant();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [archiving, setArchiving] = useState(false);

    // Settings state
    const [systemSettings, setSystemSettings] = useState<SystemSettings>({});

    const [retentionPolicy, setRetentionPolicy] = useState<RetentionPolicy>({
        work_items_months: 12,
        ai_insights_months: 6,
        pull_requests_months: 12,
    });

    const { theme, setTheme } = useTheme();

    useEffect(() => {
        loadSettings();
    }, [currentTenantId]);

    const loadSettings = async () => {
        setLoading(true);
        try {
            // Load system settings (always)
            const sysSettings = await apiSettings.getSystemSettings();
            setSystemSettings(sysSettings);

            // Load retention policy ONLY if we have a specific tenant
            if (currentTenantId) {
                const policy = await apiSettings.getRetentionPolicy(currentTenantId);
                setRetentionPolicy(policy);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };


    const handleThemeChange = (newTheme: 'dark' | 'light') => {
        setTheme(newTheme);
        toast.success(`Theme switched to ${newTheme}`);
    };

    const handleSettingChange = (name: string, value: any) => {
        setSystemSettings(prev => ({ ...prev, [name]: value }));
        setHasUnsavedChanges(true);
    };

    const handleRetentionChange = (name: string, value: number) => {
        setRetentionPolicy(prev => ({ ...prev, [name]: value }));
        setHasUnsavedChanges(true);
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            // Save system settings
            await apiSettings.updateSystemSettings(systemSettings);

            // Save retention policy ONLY if tenantId exists
            if (currentTenantId) {
                await apiSettings.updateRetentionPolicy(currentTenantId, retentionPolicy);
            }

            setHasUnsavedChanges(false);
            toast.success('Settings saved successfully');
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleArchiveData = async () => {
        if (!currentTenantId) return;
        if (!window.confirm(`Are you sure you want to archive old data for ${currentTenant?.name || 'this tenant'}? This process runs in the background.`)) return;

        setArchiving(true);
        try {
            await apiTenants.archiveData(currentTenantId);
            toast.success('Data archival started successfully');
        } catch (error) {
            console.error('Failed to archive data:', error);
            toast.error('Failed to start data archival');
        } finally {
            setArchiving(false);
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

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
                        <p className="text-muted-foreground">Configure platform-wide settings and retention policies.</p>

                    </div>
                    {hasUnsavedChanges && (
                        <div className="flex items-center gap-2 bg-warning/10 text-warning px-3 py-1 rounded-full text-xs font-medium border border-warning/20">
                            <AlertTriangle size={14} />
                            Unsaved Changes
                        </div>
                    )}
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* General Settings */}
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <Settings className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-semibold text-foreground">General</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-3">Theme</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleThemeChange('dark')}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition ${theme === 'dark' ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/50 border-border text-muted-foreground hover:border-muted-foreground/30'}`}
                                    >
                                        <Moon size={18} />
                                        <span>Dark Mode</span>
                                    </button>
                                    <button
                                        onClick={() => handleThemeChange('light')}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition ${theme === 'light' ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/50 border-border text-muted-foreground hover:border-muted-foreground/30'}`}
                                    >
                                        <Sun size={18} />
                                        <span>Light Mode</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Data Retention Settings - Conditionally Rendered */}
                    {currentTenantId ? (
                        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <HardDrive className="w-5 h-5 text-primary" />
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">Data Retention Policy</h2>
                                    <p className="text-xs text-muted-foreground">Configuring for: <span className="font-medium text-foreground">{currentTenant?.name}</span></p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { id: 'work_items_months', label: 'Work Items' },
                                    { id: 'pull_requests_months', label: 'Pull Requests' },
                                    { id: 'ai_insights_months', label: 'AI Insights' },
                                ].map((policy) => {
                                    const val = retentionPolicy[policy.id as keyof RetentionPolicy] as number;
                                    const showWarning = val < 3;
                                    return (
                                        <div key={policy.id} className="space-y-2">
                                            <label className="block text-sm font-medium text-muted-foreground">{policy.label} Retention</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="60"
                                                    value={val}
                                                    onChange={(e) => handleRetentionChange(policy.id, parseInt(e.target.value) || 0)}
                                                    className={`w-full px-3 py-2 bg-muted/50 border rounded-lg text-foreground focus:outline-none transition ${showWarning ? 'border-warning/50 focus:border-warning' : 'border-border focus:border-primary'}`}
                                                />
                                                <span className="absolute right-3 top-2 text-xs text-muted-foreground">Months</span>
                                            </div>
                                            {showWarning && (
                                                <p className="text-[10px] text-warning flex items-center gap-1 mt-1">
                                                    <AlertTriangle size={10} />
                                                    Recommended: 3+ months
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-lg">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Data older than the specified duration will be automatically archived or purged according to the system's background worker processes. Changes may take up to 24 hours to take effect globally.
                                </p>
                            </div>

                            {/* Archive Action */}
                            <div className="mt-6 pt-6 border-t border-border">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-medium text-foreground">Manual Archival</h3>
                                        <p className="text-xs text-muted-foreground mt-1">Trigger immediate archival for {currentTenant?.name}.</p>
                                    </div>
                                    <button
                                        onClick={handleArchiveData}
                                        disabled={archiving || !currentTenantId}
                                        className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium transition border border-border flex items-center gap-2"
                                    >
                                        {archiving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                                        <span>Archive Data Now</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Global View Placeholder
                        <div className="lg:col-span-2 bg-muted/30 border border-border border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                                <HardDrive className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">Select a Tenant</h3>
                            <p className="text-muted-foreground max-w-md">
                                Data Retention Policies are configured per-tenant. Please select a specific tenant from the top navigation bar to configure its retention policy and archival settings.
                            </p>
                        </div>
                    )}
                </div>

                {/* Save Button */}
                <div className="fixed bottom-8 right-8 z-10">
                    <button
                        onClick={saveSettings}
                        disabled={saving || !hasUnsavedChanges}
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition shadow-lg ${hasUnsavedChanges ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20' : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'}`}
                    >
                        {saving ? (
                            <RefreshCcw className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}
