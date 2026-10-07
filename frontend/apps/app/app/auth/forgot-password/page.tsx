'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth as authApi } from '@dmt/api';
import { Shield, Mail, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const validateResetEmail = (emailStr: string): { isValid: boolean; error?: string } => {
    const trimmed = emailStr.trim();
    if (!trimmed) {
        return { isValid: false, error: 'Email address is required.' };
    }

    if (!trimmed.includes('@')) {
        return { isValid: false, error: 'Please include an "@" symbol in the email address.' };
    }

    const parts = trimmed.split('@');
    if (parts.length !== 2) {
        return { isValid: false, error: 'Email address contains invalid "@" formatting.' };
    }

    const [prefix, domain] = parts;

    // 1. Prefix cannot be empty
    if (!prefix) {
        return { isValid: false, error: 'Email prefix (before @) cannot be empty.' };
    }

    // 2. Reject numeric-only strings in local-part prefix
    if (/^\d+$/.test(prefix)) {
        return { isValid: false, error: 'Email prefix cannot be numeric-only. It must contain letters.' };
    }

    // 3. Reject leading or trailing special characters in prefix
    if (/^[._%+-]|[._%+-]$/.test(prefix)) {
        return { isValid: false, error: 'Email prefix cannot start or end with special characters.' };
    }

    // 4. Reject consecutive special characters
    if (/[._%+-]{2,}/.test(prefix)) {
        return { isValid: false, error: 'Email prefix cannot contain consecutive special characters.' };
    }

    // 5. Enforce standard prefix character pattern (alphanumeric and valid symbols, requiring letters)
    const validPrefixRegex = /^(?=.*[a-zA-Z])[a-zA-Z0-9]+([._%+-][a-zA-Z0-9]+)*$/;
    if (!validPrefixRegex.test(prefix)) {
        return { isValid: false, error: 'Email prefix contains invalid special characters or standalone symbols.' };
    }

    // 6. Domain structural validation
    if (!domain) {
        return { isValid: false, error: 'Domain name is required (e.g., company.com).' };
    }

    if (domain.includes('..') || domain.startsWith('.') || domain.endsWith('.') || domain.startsWith('-') || domain.endsWith('-')) {
        return { isValid: false, error: 'Domain name contains invalid structure or consecutive dots.' };
    }

    const domainParts = domain.split('.');
    if (domainParts.length < 2) {
        return { isValid: false, error: 'Domain must include a valid top-level domain extension (e.g., .com, .org).' };
    }

    const tld = domainParts[domainParts.length - 1];
    // TLD must be strictly letters and at least 2 characters (e.g., .com, .org, .io)
    const validTldRegex = /^[a-zA-Z]{2,24}$/;
    if (!validTldRegex.test(tld)) {
        return { isValid: false, error: 'Top-level domain extension must contain only letters (min 2 characters, e.g., .com).' };
    }

    // Host labels (subdomains and primary domain before TLD)
    const hostLabels = domainParts.slice(0, domainParts.length - 1);
    for (const label of hostLabels) {
        if (!label) {
            return { isValid: false, error: 'Domain name contains empty labels or invalid dots.' };
        }
        if (label.length < 2) {
            return { isValid: false, error: `Domain host "${label}" is too short. Each host label must be at least 2 characters.` };
        }
        if (label.startsWith('-') || label.endsWith('-')) {
            return { isValid: false, error: 'Domain labels cannot start or end with a hyphen.' };
        }
        if (!/^[a-zA-Z0-9-]+$/.test(label)) {
            return { isValid: false, error: `Domain host "${label}" contains invalid characters.` };
        }
    }

    // Primary host (label directly before TLD) must not be numeric-only and must contain letters
    const primaryHost = hostLabels[hostLabels.length - 1];
    if (/^\d+$/.test(primaryHost) || !/[a-zA-Z]/.test(primaryHost)) {
        return { isValid: false, error: 'Domain host name cannot be numeric-only. It must contain letters.' };
    }

    // Full domain structural format cross-check
    const validDomainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,24}$/;
    if (!validDomainRegex.test(domain)) {
        return { isValid: false, error: 'Please enter a structurally legitimate domain name (e.g., company.com).' };
    }

    return { isValid: true };
};

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);
    const [email, setEmail] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const validation = validateResetEmail(email);
        if (!validation.isValid) {
            const errorMsg = validation.error || 'Invalid email format.';
            setError(errorMsg);
            toast.error(errorMsg);
            return;
        }

        setIsLoading(true);

        try {
            await authApi.passwordResetRequest(email.trim());
            setSuccess(true);
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Email address not found in identity server database.';
            setError(errorMsg);
            toast.error(errorMsg);
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
                    <h1 className="text-2xl font-bold text-foreground mb-2">Reset Password</h1>
                    <p className="text-muted-foreground">Enter your email to request a password reset</p>
                </div>

                {/* Card */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl backdrop-blur-xl">
                    {success ? (
                        <div className="text-center space-y-4 py-4">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/20 text-accent mb-2">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-medium text-foreground">Request Sent</h3>
                            <p className="text-muted-foreground text-sm">
                                If an active account exists with this email, your administrators have been notified.
                                Please check with your tenant admin for your password reset link.
                            </p>
                            <div className="pt-4">
                                <Link
                                    href="/auth/login"
                                    className="inline-flex items-center justify-center w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-2.5 rounded-lg transition-all"
                                >
                                    Return to Login
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-destructive">{error}</p>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label htmlFor="email" className="text-sm font-medium text-muted-foreground">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                        placeholder="john@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !email}
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <div className="mt-6 pt-6 border-t border-border text-center">
                            <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
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
