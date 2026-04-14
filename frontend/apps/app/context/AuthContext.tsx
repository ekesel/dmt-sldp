'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, AuthRegisterPayload } from '@dmt/api';

/**
 * Interface representing a user within the authentication context.
 */
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
    is_manager: boolean;
    role?: string;
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
    register: (data: AuthRegisterPayload) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
    token: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Authentication provider component to wrap the application and provide auth state.
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('dmt-access-token');
            if (storedToken) {
                setToken(storedToken);
                try {
                    const userData = await auth.getProfile() as unknown as User;
                    setUser(userData);
                    if (userData?.tenant_slug) {
                        localStorage.setItem('dmt-tenant', userData.tenant_slug);
                    }
                } catch (err) {
                    localStorage.removeItem('dmt-access-token');
                    localStorage.removeItem('dmt-refresh-token');
                    localStorage.removeItem('dmt-tenant');
                    setUser(null);
                    setToken(null);
                }
            } else {
                setToken(null);
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
            setToken(response.access);
            if (response.user?.tenant_slug) {
                localStorage.setItem('dmt-tenant', response.user.tenant_slug);
            }
            setUser(response.user as unknown as User);
        } catch (err) {
            let errorMessage = 'Login failed. Please check your credentials.';
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { detail?: string } } };
                errorMessage = axiosErr.response?.data?.detail || errorMessage;
            }
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (data: AuthRegisterPayload) => {
        setError(null);
        setIsLoading(true);
        try {
            await auth.register(data);
            setError(null);
        } catch (err) {
            let errorMessage = 'Registration failed';
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { username?: string[] } } };
                errorMessage = axiosErr.response?.data?.username?.[0] || errorMessage;
            }
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
            setToken(null);
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
                token,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

/**
 * Hook to access the current authentication state and actions.
 * @throws Error if used outside of an AuthProvider.
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
