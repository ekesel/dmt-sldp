'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '@dmt/api';

interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_platform_admin: boolean;
    is_staff: boolean;
    is_superuser: boolean;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (username: string, password: string, portal?: string) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
}

interface RegisterData {
    username: string;
    email: string;
    password: string;
    password2: string;
    first_name?: string;
    last_name?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize auth state from localStorage
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

    const register = async (data: RegisterData) => {
        setError(null);
        setIsLoading(true);
        try {
            const response = await auth.register(data);
            // After registration, user needs to login
            setError(null);
        } catch (err: any) {
            const errorMessage = err.response?.data?.username?.[0] || err.response?.data?.email?.[0] || 'Registration failed';
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
            // Ignore errors on logout
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
