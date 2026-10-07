'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@dmt/api';
import { useAuth } from '../context/AuthContext';

export interface Project {
    id: number;
    name: string;
    key: string;
    description?: string;
}

export function useProjects() {
    const { token } = useAuth();

    const { data: projects = [], isLoading: loading, error } = useQuery<Project[], Error>({
        queryKey: ['admin-projects-list'],
        queryFn: async () => {
            const response = await api.get<Project[]>('/admin/projects/');
            return response.data || [];
        },
        enabled: Boolean(token),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    return {
        projects,
        loading,
        error: error ? error.message || 'Failed to load projects' : null
    };
}
