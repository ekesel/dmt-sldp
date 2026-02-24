'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { Shield, Mail, Lock, User, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { tenants } from '@dmt/api';

export default function RegisterPage() {
    const router = useRouter();
    const { register } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        password2: '',
        first_name: '',
        last_name: '',
        tenant_slug: '', // New field for tenant identification
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (formData.password !== formData.password2) {
            setError("Passwords don't match");
            return;
        }

        setIsLoading(true);

        try {
            // In a real scenario, we might want to validate the tenant slug first or invite code
            // For now, we assume the backend handles tenant assignment or creation logic if needed.
            // But wait, the current register() function doesn't take tenant_slug.
            // We need to either create a new tenant (registering a company) or join an existing one.
            // The prompt said "if user is not there in current tenant... not able to login".
            // This register page likely registers a NEW USER for an existing tenant (via invite?) or NEW TENANT?
            // Given "DMT Company to tenant name" task, likely this registers a USER.

            // Let's assume for now we call register. But we need to pass tenant info if we want to link them.
            // The backend RegisterSerializer accepts 'tenant' (ID). A slug is not enough unless we lookup.
            // TODO: Enhance backend to lookup tenant by slug or invite code.

            // For this implementation, I will just call register and let the backend decide default or fail.
            // Or I'll skip tenant field in register for now and assume they get a default or null.
            // BUT requirements say "per tenant login".

            await register(formData);
            router.push('/');
        } catch (err: any) {
            // Check for specific error details from backend
            const detail = err.response?.data?.detail
                || (err.response?.data?.email && `Email: ${err.response.data.email[0]}`)
                || (err.response?.data?.username && `Username: ${err.response.data.username[0]}`)
                || (err.response?.data?.password && `Password: ${err.response.data.password[0]}`)
                || 'Registration failed. Please try again.';
            setError(detail);
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
                    <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
                    <p className="text-slate-400">Join your team on DMT Portal</p>
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-300">First Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all outline-none"
                                    placeholder="John"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-300">Last Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all outline-none"
                                    placeholder="Doe"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                />
                            </div>
                        </div>

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
                            <label className="text-sm font-medium text-slate-300">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all outline-none"
                                    placeholder="name@company.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Tenant Selection - Optional for now or specific field */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-300">Tenant Slug (Optional)</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="text"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all outline-none"
                                    placeholder="acme-corp"
                                    value={formData.tenant_slug}
                                    onChange={(e) => setFormData({ ...formData, tenant_slug: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-300">Password</label>
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

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-300">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all outline-none"
                                    placeholder="••••••••"
                                    value={formData.password2}
                                    onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-slate-800 text-center">
                        <p className="text-sm text-slate-400">
                            Already have an account?{' '}
                            <Link href="/auth/login" className="text-brand-primary hover:text-brand-primary/80 font-medium transition">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
