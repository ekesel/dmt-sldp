'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthContext';
import { ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';

/**
 * Admin portal login page with responsive layout, validation, and credentials submission.
 */
export default function LoginPage() {
    const router = useRouter();
    const { login, isLoading, error, clearError, isAuthenticated } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, router]);

    useEffect(() => {
        if (error) {
            setLocalError(error);
        }
    }, [error]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setLocalError('');

        const trimmedUsername = username.trim();
        if (!trimmedUsername) {
            setLocalError('Field cannot be empty');
            setUsername('');
            return;
        }

        if (!password) {
            setLocalError('Please enter your password');
            return;
        }

        if (username !== trimmedUsername) {
            setUsername(trimmedUsername);
        }

        try {
            await login(trimmedUsername, password, 'admin');
            router.push('/');
        } catch (err) {
            // Error is already set by useAuth hook
        }
    };

    return (
        <div className="min-h-screen min-h-[100dvh] w-full bg-background flex items-center justify-center px-4 py-6 sm:py-10 overflow-y-auto">
            <div className="w-full max-w-sm sm:max-w-md my-auto">
                {/* Header Section */}
                <div className="text-center mb-6 sm:mb-8 md:mb-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4 sm:mb-6">
                        <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-3">Admin Portal</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">Platform Administration & Tenant Management</p>
                </div>

                {/* Login Card */}
                <div className="bg-card border border-border rounded-2xl p-5 sm:p-7 md:p-8 backdrop-blur-xl shadow-2xl space-y-5 sm:space-y-6">
                    {/* Error Message */}
                    {localError && (
                        <div className="flex gap-3 p-3.5 sm:p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-destructive">{localError}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                        {/* Username Field */}
                        <div className="space-y-1.5 sm:space-y-2">
                            <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-muted-foreground">Email or Username</label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => {
                                    setUsername(e.target.value);
                                    if (localError) setLocalError('');
                                }}
                                onBlur={() => {
                                    const trimmed = username.trim();
                                    if (username && username !== trimmed) {
                                        setUsername(trimmed);
                                    }
                                }}
                                placeholder="Enter your email or username"
                                autoComplete="username"
                                className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition duration-200 text-base sm:text-sm min-h-[42px]"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-1.5 sm:space-y-2">
                            <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-muted-foreground">Password</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition duration-200 pr-12 text-base sm:text-sm min-h-[42px]"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition rounded-lg focus:outline-none"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" aria-hidden="true" />
                                    ) : (
                                        <Eye className="w-5 h-5" aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 sm:py-3 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold rounded-lg transition duration-300 shadow-lg shadow-primary/20 hover:shadow-primary/30 mt-4 sm:mt-6 min-h-[44px] cursor-pointer"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                    Logging in...
                                </span>
                            ) : (
                                'Login'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-muted-foreground/50 mt-6 sm:mt-10">
                    © 2026 Elevate. All rights reserved.
                </p>
            </div>
        </div>
    );
}
