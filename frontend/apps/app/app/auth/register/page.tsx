'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { Shield, Mail, Lock, User, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { tenants } from '@dmt/api';
import { PasswordInput } from '@dmt/ui';
import { validateResetEmail } from '../forgot-password/page';

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

        const emailValidation = validateResetEmail(formData.email);
        if (!emailValidation.isValid) {
            setError(emailValidation.error || 'Invalid credentials provided or not accepted.');
            return;
        }

        if (formData.password !== formData.password2) {
            setError("Passwords don't match");
            return;
        }

        setIsLoading(true);

        try {
            await register(formData);
            router.push('/');
        } catch (err: any) {
            // Check for specific error details from backend
            const detail =
                (typeof err.response?.data === 'string' && err.response.data)
                || err.response?.data?.error
                || err.response?.data?.detail
                || err.response?.data?.message
                || err.data?.error
                || err.data?.detail
                || err.data?.message
                || (err.response?.data?.email && `Email: ${Array.isArray(err.response.data.email) ? err.response.data.email[0] : err.response.data.email}`)
                || (err.response?.data?.username && `Username: ${Array.isArray(err.response.data.username) ? err.response.data.username[0] : err.response.data.username}`)
                || (err.response?.data?.password && `Password: ${Array.isArray(err.response.data.password) ? err.response.data.password[0] : err.response.data.password}`)
                || (err.message && !err.message.includes('Request failed') ? err.message : null)
                || 'Registration failed. Please try again.';
            setError(detail);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20 text-primary mb-4">
                        <Shield className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Create Account</h1>
                    <p className="text-muted-foreground">Join your team on the Elevate Portal</p>
                </div>

                {/* Card */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl backdrop-blur-xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-destructive">{error}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label htmlFor="first_name" className="text-sm font-medium text-muted-foreground">First Name</label>
                                <input
                                    id="first_name"
                                    type="text"
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                    placeholder="John"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="last_name" className="text-sm font-medium text-muted-foreground">Last Name</label>
                                <input
                                    id="last_name"
                                    type="text"
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                    placeholder="Doe"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="username" className="text-sm font-medium text-muted-foreground">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    id="username"
                                    type="text"
                                    required
                                    className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                    placeholder="johndoe"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="email" className="text-sm font-medium text-muted-foreground">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                    placeholder="name@company.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Tenant Selection - Optional for now or specific field */}
                        <div className="space-y-1.5">
                            <label htmlFor="tenant_slug" className="text-sm font-medium text-muted-foreground">Tenant Slug (Optional)</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    id="tenant_slug"
                                    type="text"
                                    className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                    placeholder="acme-corp"
                                    value={formData.tenant_slug}
                                    onChange={(e) => setFormData({ ...formData, tenant_slug: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="password" className="text-sm font-medium text-muted-foreground">Password</label>
                            <PasswordInput
                                id="password"
                                required
                                icon={<Lock className="w-5 h-5" />}
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="password2" className="text-sm font-medium text-muted-foreground">Confirm Password</label>
                            <PasswordInput
                                id="password2"
                                required
                                icon={<Lock className="w-5 h-5" />}
                                placeholder="••••••••"
                                value={formData.password2}
                                onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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

                    <div className="mt-6 pt-6 border-t border-border text-center">
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link href="/auth/login" className="text-primary hover:text-primary/80 font-medium transition">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
