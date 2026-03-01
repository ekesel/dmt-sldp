'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '@dmt/api';

interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name?: string;
    tenant_slug?: string;
    is_platform_admin: boolean;
    is_staff: boolean;
    is_superuser: boolean;
    tenant_name?: string;
    custom_title?: string;
    avatar_url?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (username: string, password: string, portal?: string) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
    token: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('dmt-access-token');
            if (token) {
                try {
                    const userData = await auth.getProfile() as any;
                    setUser(userData);
                    if (userData?.tenant_slug) {
                        localStorage.setItem('dmt-tenant', userData.tenant_slug);
                    }
                } catch (err) {
                    localStorage.removeItem('dmt-access-token');
                    localStorage.removeItem('dmt-refresh-token');
                    localStorage.removeItem('dmt-tenant');
                    setUser(null);
                }
            }
            setIsLoading(false);
        };
        initAuth();
    }, []);

    const login = async (username: string, password: string, portal?: string) => {
        setError(null);
        setIsLoading(true);
        try {
            const response = await auth.login(username, password, portal);
            localStorage.setItem('dmt-access-token', response.access);
            localStorage.setItem('dmt-refresh-token', response.refresh);
            if (response.user?.tenant_slug) {
                localStorage.setItem('dmt-tenant', response.user.tenant_slug);
            }
            setUser(response.user);
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || 'Login failed. Please check your credentials.';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (data: any) => {
        setError(null);
        setIsLoading(true);
        try {
            await auth.register(data);
            setError(null);
        } catch (err: any) {
            const errorMessage = err.response?.data?.username?.[0] || 'Registration failed';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            await auth.logout();
        } catch (err) {
            // Ignore errors
        } finally {
            localStorage.removeItem('dmt-access-token');
            localStorage.removeItem('dmt-refresh-token');
            localStorage.removeItem('dmt-tenant');
            setUser(null);
            setIsLoading(false);
        }
    };

    const clearError = () => setError(null);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                error,
                login,
                register,
                logout,
                clearError,
                token: typeof window !== 'undefined' ? localStorage.getItem('dmt-access-token') : null,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
