'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../UIComponents';
import api from '@dmt/api';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
    project?: any; // If provided, edit mode
    onSuccess: () => void;
}

export function ProjectModal({ isOpen, onClose, tenantId, project, onSuccess }: ProjectModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        key: '',
        description: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (project) {
            setFormData({
                name: project.name,
                key: project.key,
                description: project.description || '',
            });
        } else {
            setFormData({ name: '', key: '', description: '' });
        }
    }, [project, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (project) {
                await api.patch(`/admin/projects/${project.id}/`, formData);
                toast.success("Project updated successfully");
            } else {
                await api.post('/admin/projects/', { ...formData, tenant: tenantId });
                toast.success("Project created successfully");
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to save project");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={project ? 'Edit Project' : 'Create Project'}
            description={project ? 'Update existing project details.' : 'Add a new project to this tenant.'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Name</label>
                    <input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                        placeholder="e.g. Mobile App"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Key</label>
                    <input
                        value={formData.key}
                        onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                        placeholder="e.g. MOB"
                        required
                        maxLength={10}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Description</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition h-24"
                        placeholder="Optional description..."
                    />
                </div>

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
                        {project ? 'Save Changes' : 'Create Project'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
