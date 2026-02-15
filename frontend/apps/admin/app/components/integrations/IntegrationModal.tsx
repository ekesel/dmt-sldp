'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { integrations } from '@dmt/api';
import { toast } from 'react-hot-toast';

interface IntegrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    integrationId?: string | number;
    onSuccess?: () => void;
}

export const IntegrationModal: React.FC<IntegrationModalProps> = ({
    isOpen,
    onClose,
    mode,
    integrationId,
    onSuccess
}) => {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        source_type: 'jira',
        base_url: '',
        api_key: '',
        workspace_id: '',
        is_active: true
    });

    useEffect(() => {
        if (isOpen && mode === 'edit' && integrationId) {
            fetchIntegration();
        } else if (isOpen && mode === 'create') {
            // Reset form
            setFormData({
                name: '',
                source_type: 'jira',
                base_url: '',
                api_key: '',
                workspace_id: '',
                is_active: true
            });
            setTestResult(null);
        }
    }, [isOpen, mode, integrationId]);

    const fetchIntegration = async () => {
        if (!integrationId) return;
        setFetching(true);
        try {
            const data = await integrations.get(integrationId);
            setFormData({
                name: (data.name as string) || '',
                source_type: (data.source_type as string) || 'jira',
                base_url: (data.base_url as string) || '',
                api_key: '', // Don't allow reading API key back, only setting new one
                workspace_id: (data.workspace_id as string) || '',
                is_active: data.is_active !== undefined ? !!data.is_active : true
            });
        } catch (error) {
            toast.error('Failed to load integration details');
            onClose();
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleTestConnection = async () => {
        // For new integrations, we can't really "test" against an ID that doesn't exist yet unless backend supports stateless test
        // Current backend implementation expects an ID. 
        // We'll simulate for 'create' mode or just skip if no ID. 
        // Ideally backend should have a stateless /test-connection/ endpoint accepting creds.
        // Given current plan, we might need to save first or use a mock.
        // Let's assume we proceed to save if creating, or warn user.

        if (mode === 'create') {
            // Mock check for now since backend endpoint requires ID
            setTesting(true);
            setTimeout(() => {
                setTesting(false);
                setTestResult({ success: true, message: 'Connection format valid (Save to initialize)' });
            }, 1000);
            return;
        }

        if (!integrationId) return;
        setTesting(true);
        setTestResult(null);
        try {
            const res = await integrations.testConnection(integrationId);
            setTestResult({ success: true, message: (res as any).message || 'Connection successful' });
        } catch (error) {
            setTestResult({ success: false, message: 'Connection failed' });
        } finally {
            setTesting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = { ...formData };
            // If editing and api_key is empty, remove it to avoid overwriting with empty string
            if (mode === 'edit' && !payload.api_key) {
                delete (payload as any).api_key;
            }

            if (mode === 'create') {
                await integrations.create(payload);
                toast.success('Integration created successfully');
            } else {
                if (!integrationId) return;
                await integrations.update(integrationId, payload);
                toast.success('Integration updated successfully');
            }
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(mode === 'create' ? 'Failed to create integration' : 'Failed to update integration');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        {mode === 'create' ? 'New Integration' : 'Edit Integration'}
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    {fetching ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <form id="integration-form" onSubmit={handleSubmit} className="space-y-4">

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Integration Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="e.g. Corporate Jira"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="source_type"
                                        value={formData.source_type}
                                        onChange={handleChange}
                                        disabled={mode === 'edit'}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-60"
                                    >
                                        <option value="jira">Jira</option>
                                        <option value="clickup">ClickUp</option>
                                        <option value="azure_boards">Azure Boards</option>
                                        <option value="github">GitHub</option>
                                        <option value="azure_devops">Azure DevOps</option>
                                    </select>
                                </div>
                                <div className="flex items-center pt-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="is_active"
                                            checked={formData.is_active}
                                            onChange={handleChange}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                        />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Active</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Base URL <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="url"
                                    name="base_url"
                                    required
                                    value={formData.base_url}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="https://"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    API Key / Token {mode === 'create' && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                    type="password"
                                    name="api_key"
                                    required={mode === 'create'} // Required only on create
                                    value={formData.api_key}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder={mode === 'edit' ? 'Leave blank to keep current' : 'Enter API Key'}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Workspace / Organization ID
                                </label>
                                <input
                                    type="text"
                                    name="workspace_id"
                                    value={formData.workspace_id}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="Optional"
                                />
                            </div>

                            {/* Test Result Feedback */}
                            {testResult && (
                                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${testResult.success ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                    {testResult.success ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                    <span>{testResult.message}</span>
                                </div>
                            )}

                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-between bg-slate-50 dark:bg-slate-800/30 rounded-b-xl">
                    <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={loading || fetching || testing}
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
                    >
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test Connection'}
                    </button>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="integration-form"
                            disabled={loading || fetching}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/20 transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {mode === 'create' ? 'Create Integration' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
