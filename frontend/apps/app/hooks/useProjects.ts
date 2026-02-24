import { useState, useEffect } from 'react';
import api from '@dmt/api';
import { useAuth } from '../context/AuthContext';

export interface Project {
    id: number;
    name: string;
    key: string;
    description?: string;
}

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { token } = useAuth();

    useEffect(() => {
        const fetchProjects = async () => {
            if (!token) return;

            try {
                setLoading(true);
                // Use the api instance which handles Host headers/baseURL correctly
                const response = await api.get<Project[]>('/admin/projects/');
                setProjects(response.data);
                setError(null);
            } catch (err: any) {
                console.error('Project fetch error:', err);
                setError(err.message || 'Failed to load projects');
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, [token]);

    return { projects, loading, error };
}
