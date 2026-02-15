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
                    <RefreshCcw className="w-8 h-8 text-blue-500 animate-spin" />
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
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Settings</h1>
                        <p className="text-slate-500 dark:text-slate-400">Configure platform-wide settings and retention policies.</p>
                    </div>
                    {hasUnsavedChanges && (
                        <div className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-xs font-medium border border-amber-500/20">
                            <AlertTriangle size={14} />
                            Unsaved Changes
                        </div>
                    )}
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* General Settings */}
                    <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm dark:shadow-none">
                        <div className="flex items-center gap-2 mb-6">
                            <Settings className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">General</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">Theme</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleThemeChange('dark')}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}
                                    >
                                        <Moon size={18} />
                                        <span>Dark Mode</span>
                                    </button>
                                    <button
                                        onClick={() => handleThemeChange('light')}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition ${theme === 'light' ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}
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
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm dark:shadow-none">
                            <div className="flex items-center gap-2 mb-6">
                                <HardDrive className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Data Retention Policy</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Configuring for: <span className="font-medium text-slate-700 dark:text-slate-300">{currentTenant?.name}</span></p>
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
                                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">{policy.label} Retention</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="60"
                                                    value={val}
                                                    onChange={(e) => handleRetentionChange(policy.id, parseInt(e.target.value) || 0)}
                                                    className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-white focus:outline-none transition ${showWarning ? 'border-amber-500/50 focus:border-amber-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'}`}
                                                />
                                                <span className="absolute right-3 top-2 text-xs text-slate-500">Months</span>
                                            </div>
                                            {showWarning && (
                                                <p className="text-[10px] text-amber-500 flex items-center gap-1 mt-1">
                                                    <AlertTriangle size={10} />
                                                    Recommended: 3+ months
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-lg">
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Data older than the specified duration will be automatically archived or purged according to the system's background worker processes. Changes may take up to 24 hours to take effect globally.
                                </p>
                            </div>

                            {/* Archive Action */}
                            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-medium text-slate-800 dark:text-white">Manual Archival</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Trigger immediate archival for {currentTenant?.name}.</p>
                                    </div>
                                    <button
                                        onClick={handleArchiveData}
                                        disabled={archiving || !currentTenantId}
                                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium transition border border-slate-200 dark:border-slate-700 flex items-center gap-2"
                                    >
                                        {archiving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                                        <span>Archive Data Now</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Global View Placeholder
                        <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <HardDrive className="w-6 h-6 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Select a Tenant</h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-md">
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
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition shadow-lg ${hasUnsavedChanges ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'}`}
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
