'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, FolderKanban, Settings, Loader2 } from 'lucide-react';
import { DashboardLayout } from '../../../components/DashboardLayout';
import { Badge } from '../../../components/UIComponents';
import { ProjectModal } from '../../../components/projects/ProjectModal';
import api from '@dmt/api';
import { toast } from 'react-hot-toast';

interface Project {
    id: string | number;
    name: string;
    key: string;
    description?: string;
    is_active: boolean;
}

export default function ProjectListPage() {
    const params = useParams();
    const router = useRouter();
    const tenantId = params.id as string;
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);

    useEffect(() => {
        fetchProjects();
    }, [tenantId]);

    const fetchProjects = async () => {
        try {
            setIsLoading(true);
            const data = await api.get('/admin/projects/', {
                params: { tenant_id: tenantId }
            });
            setProjects(data.data as Project[]);
        } catch (error) {
            toast.error("Failed to fetch projects");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedProject(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (project: Project) => {
        setSelectedProject(project);
        setIsModalOpen(true);
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-1">Projects</h1>
                        <p className="text-muted-foreground">Manage projects and their configurations for tenant {tenantId}</p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition shadow-lg shadow-primary/20"
                    >
                        <Plus className="w-4 h-4" /> New Project
                    </button>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <div className="bg-card/50 border border-border rounded-xl p-6 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-muted-foreground text-sm font-medium">Total Projects</h3>
                            <FolderKanban className="h-4 w-4 text-primary" />
                        </div>
                        <div className="text-2xl font-bold text-foreground">{projects.length}</div>
                    </div>
                </div>

                <div className="bg-card/50 border border-border rounded-xl overflow-hidden backdrop-blur-sm">
                    <div className="px-6 py-4 border-b border-border">
                        <h2 className="text-lg font-semibold text-foreground">All Projects</h2>
                        <p className="text-sm text-muted-foreground">List of all projects associated with this tenant.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Key</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {projects.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                            No projects found. Create one to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    projects.map((project) => (
                                        <tr key={project.id} className="hover:bg-accent/30 transition">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-foreground font-medium cursor-pointer hover:underline" onClick={() => handleEdit(project)}>
                                                        {project.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">{project.description}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground border border-border">
                                                    {project.key}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge
                                                    label={project.is_active ? 'Active' : 'Archived'}
                                                    variant={project.is_active ? 'success' : 'default'}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(project)}
                                                        className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded transition"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => router.push(`/projects/${project.id}/sources`)}
                                                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted border border-border text-foreground hover:bg-secondary rounded transition"
                                                    >
                                                        <Settings className="w-4 h-4 text-muted-foreground" />
                                                        Sources
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <ProjectModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    tenantId={tenantId}
                    project={selectedProject}
                    onSuccess={fetchProjects}
                />
            </div>
        </DashboardLayout>
    );
}
