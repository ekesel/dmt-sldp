import { useState, useEffect } from 'react';
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
                const response = await fetch('/api/admin/projects/', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch projects');
                }

                const data = await response.json();
                setProjects(data);
                setError(null);
            } catch (err) {
                console.error(err);
                setError('Failed to load projects');
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, [token]);

    return { projects, loading, error };
}
