'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth as authApi } from '@dmt/api';
import { Shield, Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const uid = searchParams.get('uid');
    const token = searchParams.get('token');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (!uid || !token) {
            setError("Invalid or missing password reset link. Please request a new link from your administrator.");
        }
    }, [uid, token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!uid || !token) {
            setError("Invalid reset link parameters.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (formData.password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        setIsLoading(true);

        try {
            await authApi.resetPasswordConfirm({
                uid,
                token,
                new_password: formData.password
            });
            setSuccess(true);

            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push('/auth/login');
            }, 3000);

        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to reset password. The link may have expired.');
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
                    <h1 className="text-2xl font-bold text-white mb-2">Set New Password</h1>
                    <p className="text-slate-400">Choose a strong password for your account</p>
                </div>

                {/* Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
                    {success ? (
                        <div className="text-center space-y-4 py-4">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 text-green-500 mb-2">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-medium text-white">Password Updated!</h3>
                            <p className="text-slate-400 text-sm">
                                Your password has been successfully reset. Redirecting you to login...
                            </p>
                            <div className="pt-4">
                                <Link
                                    href="/auth/login"
                                    className="inline-flex items-center justify-center w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-medium py-2.5 rounded-lg transition-all"
                                >
                                    Log In Now
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-400">{error}</p>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-300">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type="password"
                                        required
                                        disabled={!uid || !token || success}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all outline-none disabled:opacity-50"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-300">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type="password"
                                        required
                                        disabled={!uid || !token || success}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all outline-none disabled:opacity-50"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !uid || !token || !formData.password || formData.password !== formData.confirmPassword || success}
                                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    'Set new password'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
