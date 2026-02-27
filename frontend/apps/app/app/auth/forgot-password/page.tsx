'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth as authApi } from '@dmt/api';
import { Shield, Mail, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);
    const [email, setEmail] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await authApi.passwordResetRequest(email);
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'An error occurred. Please try again.');
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
                    <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
                    <p className="text-slate-400">Enter your email to request a password reset</p>
                </div>

                {/* Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
                    {success ? (
                        <div className="text-center space-y-4 py-4">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 text-green-500 mb-2">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-medium text-white">Request Sent</h3>
                            <p className="text-slate-400 text-sm">
                                If an active account exists with this email, your administrators have been notified.
                                Please check with your tenant admin for your password reset link.
                            </p>
                            <div className="pt-4">
                                <Link
                                    href="/auth/login"
                                    className="inline-flex items-center justify-center w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-lg transition-all"
                                >
                                    Return to Login
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
                                <label className="text-sm font-medium text-slate-300">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all outline-none"
                                        placeholder="john@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !email}
                                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Sending Request...
                                    </>
                                ) : (
                                    'Request Reset Link'
                                )}
                            </button>
                        </form>
                    )}

                    {!success && (
                        <div className="mt-6 pt-6 border-t border-slate-800 text-center">
                            <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition">
                                <ArrowLeft className="w-4 h-4" />
                                Back to login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
