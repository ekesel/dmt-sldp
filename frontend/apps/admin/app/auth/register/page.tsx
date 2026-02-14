'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { ShieldCheck, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter();
    const { register, isLoading, error, clearError, isAuthenticated } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        password2: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showPassword2, setShowPassword2] = useState(false);
    const [localError, setLocalError] = useState('');
    const [success, setSuccess] = useState(false);

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

    const validateForm = () => {
        if (!formData.username || !formData.email || !formData.password || !formData.password2) {
            setLocalError('Please fill in all required fields');
            return false;
        }

        if (formData.password.length < 8) {
            setLocalError('Password must be at least 8 characters long');
            return false;
        }

        if (formData.password !== formData.password2) {
            setLocalError('Passwords do not match');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setLocalError('Please enter a valid email address');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setLocalError('');
        setSuccess(false);

        if (!validateForm()) {
            return;
        }

        try {
            await register(formData);
            setSuccess(true);
            setTimeout(() => {
                router.push('/auth/login?registered=true');
            }, 2000);
        } catch (err) {
            // Error is already set by useAuth hook
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                {/* Header Section */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 mb-6">
                        <ShieldCheck className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-3">Create Account</h1>
                    <p className="text-slate-400 text-lg">Join the DMT-SLDP Admin Portal</p>
                </div>

                {/* Registration Card */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
                    {success ? (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center gap-3 p-6 bg-green-500/10 border border-green-500/30 rounded-lg">
                                <CheckCircle className="w-8 h-8 text-green-400" />
                                <p className="text-sm text-green-300 text-center font-medium">
                                    Account created successfully!
                                </p>
                                <p className="text-xs text-green-300/70 text-center">
                                    Redirecting to login...
                                </p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Error Message */}
                            {localError && (
                                <div className="flex gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-300">{localError}</p>
                                </div>
                            )}

                            {/* Username Field */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-2.5">Username *</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Choose a unique username"
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Email Field */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-2.5">Email *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter your email"
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Name Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2.5">First Name</label>
                                    <input
                                        type="text"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        placeholder="John"
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2.5">Last Name</label>
                                    <input
                                        type="text"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        placeholder="Doe"
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-2.5">Password *</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Create a strong password"
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition pr-12"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1.5">At least 8 characters</p>
                            </div>

                            {/* Confirm Password Field */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-2.5">Confirm Password *</label>
                                <div className="relative">
                                    <input
                                        type={showPassword2 ? 'text' : 'password'}
                                        name="password2"
                                        value={formData.password2}
                                        onChange={handleChange}
                                        placeholder="Re-enter your password"
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition pr-12"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword2(!showPassword2)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition"
                                    >
                                        {showPassword2 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Register Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition duration-300 shadow-lg hover:shadow-blue-500/25 mt-6"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creating Account...
                                    </span>
                                ) : (
                                    'Create Account'
                                )}
                            </button>
                        </form>
                    )}

                    {/* Divider */}
                    {!success && (
                        <>
                            <div className="relative mt-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-800" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-slate-900/80 text-slate-500">Already have an account?</span>
                                </div>
                            </div>

                            {/* Login Link */}
                            <Link
                                href="/auth/login"
                                className="block mt-6 w-full py-3 px-4 border border-slate-700 hover:border-slate-600 text-slate-300 font-semibold rounded-lg transition text-center hover:bg-slate-800/50"
                            >
                                Login
                            </Link>
                        </>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-slate-600 mt-8">
                    © 2026 DMT-SLDP. All rights reserved.
                </p>
            </div>
        </div>
    );
}
