'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Settings, Bell, Shield, Lock, Mail } from 'lucide-react';

export default function SettingsPage() {
    const [notificationSettings, setNotificationSettings] = useState({
        emailAlerts: true,
        systemAlerts: true,
        weeklyDigest: false,
    });

    const [securitySettings, setSecuritySettings] = useState({
        twoFactor: true,
        ipWhitelist: true,
        sessionTimeout: '30',
    });

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                    <p className="text-slate-400">Configure platform settings and preferences.</p>
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Notification Settings */}
                    <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Bell className="w-5 h-5 text-blue-400" />
                            <h2 className="text-lg font-semibold text-white">Notifications</h2>
                        </div>
                        <div className="space-y-4">
                            {[
                                { id: 'emailAlerts', label: 'Email Alerts' },
                                { id: 'systemAlerts', label: 'System Alerts' },
                                { id: 'weeklyDigest', label: 'Weekly Digest' },
                            ].map((setting) => (
                                <label key={setting.id} className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notificationSettings[setting.id as keyof typeof notificationSettings]}
                                        onChange={(e) => setNotificationSettings({
                                            ...notificationSettings,
                                            [setting.id]: e.target.checked
                                        })}
                                        className="w-4 h-4 accent-blue-500 rounded"
                                    />
                                    <span className="text-slate-300">{setting.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* General Settings */}
                    <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Settings className="w-5 h-5 text-purple-400" />
                            <h2 className="text-lg font-semibold text-white">General</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Theme</label>
                                <select className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500">
                                    <option>Dark</option>
                                    <option>Light</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Language</label>
                                <select className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500">
                                    <option>English</option>
                                    <option>Spanish</option>
                                    <option>French</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Security Settings */}
                    <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Shield className="w-5 h-5 text-green-400" />
                            <h2 className="text-lg font-semibold text-white">Security</h2>
                        </div>
                        <div className="space-y-4">
                            {[
                                { id: 'twoFactor', label: '2FA Enabled' },
                                { id: 'ipWhitelist', label: 'IP Whitelist' },
                            ].map((setting) => (
                                <label key={setting.id} className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={securitySettings[setting.id as keyof typeof securitySettings] === true}
                                        onChange={(e) => setSecuritySettings({
                                            ...securitySettings,
                                            [setting.id]: e.target.checked
                                        })}
                                        className="w-4 h-4 accent-green-500 rounded"
                                    />
                                    <span className="text-slate-300">{setting.label}</span>
                                </label>
                            ))}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Session Timeout</label>
                                <input 
                                    type="number" 
                                    value={securitySettings.sessionTimeout}
                                    onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: e.target.value})}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">Minutes</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* API Settings */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Lock className="w-5 h-5 text-orange-400" />
                        <h2 className="text-lg font-semibold text-white">API Keys</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="bg-slate-800/50 rounded-lg p-4 flex items-center justify-between">
                            <div>
                                <p className="text-white font-medium">Production Key</p>
                                <p className="text-slate-500 text-sm mt-1">sk_live_••••••••••••</p>
                            </div>
                            <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition">
                                Regenerate
                            </button>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-4 flex items-center justify-between">
                            <div>
                                <p className="text-white font-medium">Development Key</p>
                                <p className="text-slate-500 text-sm mt-1">sk_test_••••••••••••</p>
                            </div>
                            <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition">
                                Regenerate
                            </button>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex gap-4">
                    <button className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition">
                        Save Changes
                    </button>
                    <button className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition">
                        Cancel
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}
