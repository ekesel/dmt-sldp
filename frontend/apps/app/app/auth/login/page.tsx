'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { Shield, Mail, Lock, Loader2, AlertCircle, User } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { login, isLoading: isAuthLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await login(formData.username, formData.password, 'company'); // Pass portal='company'
            router.push('/');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Invalid credentials. Please make sure you are accessing the correct portal.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-primary/20 text-brand-primary mb-4">
                        <Shield className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
                    <p className="text-slate-400">Sign in to your company portal</p>
                </div>

                {/* Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-300">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all outline-none"
                                    placeholder="johndoe"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-300">Password</label>
                                <Link href="/auth/forgot-password" className="text-xs text-brand-primary hover:text-brand-primary/80 transition">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all outline-none"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-slate-800 text-center">
                        <p className="text-sm text-slate-400">
                            Don't have an account?{' '}
                            <Link href="/auth/register" className="text-brand-primary hover:text-brand-primary/80 font-medium transition">
                                Create account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
