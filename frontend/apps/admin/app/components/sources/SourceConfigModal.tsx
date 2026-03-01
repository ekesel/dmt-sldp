'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Badge } from '../UIComponents';
import { sources as sourcesApi } from '@dmt/api';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SourceConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    source?: any;
    onSuccess: () => void;
}

const SOURCE_TYPES = [
    { value: 'jira', label: 'Jira' },
    { value: 'clickup', label: 'ClickUp' },
    { value: 'azure_devops', label: 'Azure DevOps' },
    { value: 'github', label: 'GitHub' },
];

export function SourceConfigModal({ isOpen, onClose, projectId, source, onSuccess }: SourceConfigModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        source_type: '',
        base_url: '',
        api_key: '',
        username: '',
        active_folder_id: '',
        active_folder_name: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
    const [isLoadingFolders, setIsLoadingFolders] = useState(false);

    useEffect(() => {
        if (source) {
            setFormData({
                name: source.name,
                source_type: source.source_type,
                base_url: source.base_url || '',
                api_key: '', // Don't show existing API key
                username: source.username || '',
                active_folder_id: source.config_json?.active_folder_id || '',
                active_folder_name: source.config_json?.active_folder_name || '',
            });

            // Fetch available folders for this source
            const fetchFolders = async () => {
                setIsLoadingFolders(true);
                try {
                    const response = await (sourcesApi as any).remoteFolders(source.id);
                    if (response.status === 'success' && response.folders) {
                        setFolders(response.folders);
                    }
                } catch (error) {
                    console.error("Failed to load generic folders:", error);
                } finally {
                    setIsLoadingFolders(false);
                }
            };
            fetchFolders();
        } else {
            setFormData({ name: '', source_type: '', base_url: '', api_key: '', username: '', active_folder_id: '', active_folder_name: '' });
            setFolders([]);
        }
    }, [source, isOpen]);

    const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        const selectedFolder = folders.find(f => f.id === selectedId);
        setFormData(prev => ({
            ...prev,
            active_folder_id: selectedId,
            active_folder_name: selectedFolder ? selectedFolder.name : ''
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = {
                ...formData,
                project: projectId,
                config_json: {
                    ...(source?.config_json || {}),
                    active_folder_id: formData.active_folder_id,
                    active_folder_name: formData.active_folder_name
                }
            };

            // Remove flat mapped items so they aren't rejected by strict serializers if they aren't models fields
            delete (payload as any).active_folder_id;
            delete (payload as any).active_folder_name;

            if (source && !formData.api_key) {
                delete (payload as any).api_key;
            }

            if (source) {
                await (sourcesApi as any).update(source.id, payload);
                toast.success("Source updated successfully");
            } else {
                await (sourcesApi as any).create(payload);
                toast.success("Source created successfully");
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to save source configuration");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={source ? 'Edit Source' : 'Add Source'}
            description="Configure a new data source for this project."
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Name</label>
                    <input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                        placeholder="e.g. Corporate Jira"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Source Type</label>
                    <select
                        value={formData.source_type}
                        onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                        disabled={!!source}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                        required
                    >
                        <option value="">Select type</option>
                        {SOURCE_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Base URL</label>
                    <input
                        value={formData.base_url}
                        onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                        placeholder="https://your-domain.atlassian.net"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Username / Email (Optional)</label>
                    <input
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                        placeholder="user@example.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">API Token / Key</label>
                    <input
                        type="password"
                        value={formData.api_key}
                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                        placeholder={source ? "Leave blank to keep unchanged" : "Enter API Token"}
                        required={!source}
                    />
                </div>

                {source && (formData.source_type === 'clickup' || formData.source_type.includes('azure')) && (
                    <div className="pt-2 border-t border-slate-700/50">
                        <label className="block text-sm font-medium text-slate-400 mb-1.5 flex items-center gap-2">
                            Active Sync Folder (Target Scope)
                            {isLoadingFolders && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
                        </label>
                        <select
                            value={formData.active_folder_id}
                            onChange={handleFolderChange}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                            disabled={isLoadingFolders}
                        >
                            <option value="">Sync All Scope (No Filter)</option>
                            {folders.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">If selected, metrics will be restricted purely to this folder or team.</p>
                    </div>
                )}

                <div className="pt-4 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {source ? 'Save Changes' : 'Add Source'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
