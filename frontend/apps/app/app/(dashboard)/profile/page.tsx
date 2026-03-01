'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { User, Mail, Shield, Building2, BadgeCheck, Key, Upload } from 'lucide-react';
import { auth } from '@dmt/api';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
    const { user } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(user?.avatar_url || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload
        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('profile_picture', file);

            await auth.updateProfile(formData);
            toast.success('Profile picture updated successfully!');

            // Refresh to update avatar in navbar etc.
            window.location.reload();
        } catch (error) {
            console.error('Failed to upload profile picture:', error);
            toast.error('Failed to upload profile picture.');
        } finally {
            setIsUploading(false);
        }
    };

    const initials = [user?.first_name, user?.last_name]
        .filter(Boolean)
        .map((n) => n![0].toUpperCase())
        .join('') || (user?.username?.[0]?.toUpperCase() ?? 'U');

    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Unknown';

    const infoItems = [
        {
            icon: <User className="w-4 h-4 text-brand-primary" />,
            label: 'Username',
            value: user?.username,
        },
        {
            icon: <Mail className="w-4 h-4 text-brand-primary" />,
            label: 'Email',
            value: user?.email,
        },
        {
            icon: <Building2 className="w-4 h-4 text-brand-primary" />,
            label: 'Organisation',
            value: user?.tenant_name || '—',
        },
        {
            icon: <Key className="w-4 h-4 text-brand-primary" />,
            label: 'Role',
            value: user?.is_superuser
                ? 'Super Admin'
                : user?.is_staff
                    ? 'Staff'
                    : 'Company User',
        },
    ];

    const badges = [
        user?.is_platform_admin && { label: 'Platform Admin', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
        user?.is_superuser && { label: 'Super Admin', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
        user?.is_staff && { label: 'Staff', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
        user?.custom_title && { label: user.custom_title, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    ].filter(Boolean) as { label: string; color: string }[];

    return (
        <div className="min-h-screen p-6 md:p-10">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header card */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl p-8 shadow-2xl">
                    {/* Decorative gradient blob */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative flex items-center gap-6">
                        {/* Avatar */}
                        <div
                            className="flex-shrink-0 w-24 h-24 rounded-2xl relative group cursor-pointer overflow-hidden shadow-xl shadow-brand-primary/30"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {previewUrl ? (
                                <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-brand-primary to-blue-600 flex items-center justify-center">
                                    <span className="text-3xl font-bold text-white">{initials}</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Upload className="w-6 h-6 text-white" />
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </div>

                        {/* Name + badges */}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-bold text-white truncate">{fullName}</h1>
                            <p className="text-slate-400 text-sm mt-0.5">{user?.email}</p>
                            <p className="text-xs text-brand-primary/80 font-bold uppercase tracking-widest mt-1">
                                {user?.custom_title || 'Engineering Team'}
                            </p>

                            {badges.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {badges.map((b) => (
                                        <span
                                            key={b.label}
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${b.color}`}
                                        >
                                            <BadgeCheck className="w-3 h-3" />
                                            {b.label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Details card */}
                <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 backdrop-blur-xl shadow-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-700/60 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-brand-primary" />
                        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Account Details</h2>
                    </div>

                    <ul className="divide-y divide-slate-700/50">
                        {infoItems.map((item) => (
                            <li key={item.label} className="flex items-center justify-between px-6 py-4 hover:bg-slate-700/20 transition-colors">
                                <div className="flex items-center gap-3">
                                    {item.icon}
                                    <span className="text-sm text-slate-400">{item.label}</span>
                                </div>
                                <span className="text-sm font-medium text-white text-right max-w-xs truncate">
                                    {item.value || '—'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="text-[10px] text-slate-500 text-center uppercase tracking-[0.2em] font-bold">
                    Profile pictures fallback to Gravatar based on your email
                </p>

            </div>
        </div>
    );
}
