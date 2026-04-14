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
            icon: <User className="w-4 h-4 text-primary" />,
            label: 'Username',
            value: user?.username,
        },
        {
            icon: <Mail className="w-4 h-4 text-primary" />,
            label: 'Email',
            value: user?.email,
        },
        {
            icon: <Building2 className="w-4 h-4 text-primary" />,
            label: 'Organisation',
            value: user?.tenant_name || '—',
        },
        {
            icon: <Key className="w-4 h-4 text-primary" />,
            label: 'Role',
            value: user?.is_superuser
                ? 'Super Admin'
                : user?.is_staff
                    ? 'Staff'
                    : user?.is_manager
                        ? 'Manager'
                        : 'Company User',
        },
    ];

    const badges = [
        user?.is_platform_admin && { label: 'Platform Admin', color: 'bg-accent/70 text-accent-foreground border-accent/60' },
        user?.is_superuser && { label: 'Super Admin', color: 'bg-warning/70 text-warning-foreground border-warning/60' },
        user?.is_staff && { label: 'Staff', color: 'bg-primary/70 text-primary-foreground border-primary/60' },
        user?.is_manager && { label: 'Manager', color: 'bg-primary/70 text-primary-foreground border-primary/60' },
        user?.custom_title && { label: user.custom_title, color: 'bg-accent/70 text-accent border-accent/60' },
    ].filter(Boolean) as { label: string; color: string }[];

    return (
        <div className="min-h-screen bg-background p-6 md:p-10">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header card */}
                <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl p-8 shadow-2xl">
                    {/* Decorative gradient blob */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative flex items-center gap-6">
                        {/* Avatar */}
                        <button
                            type="button"
                            className="flex-shrink-0 w-24 h-24 rounded-2xl relative group cursor-pointer overflow-hidden shadow-xl shadow-primary/30"
                            onClick={() => fileInputRef.current?.click()}
                            aria-label="Upload avatar"
                        >
                            {previewUrl ? (
                                <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                                    <span className="text-3xl font-bold text-primary-foreground">{initials}</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Upload className="w-6 h-6 text-primary-foreground" />
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </button>

                        {/* Name + badges */}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-bold text-foreground truncate">{fullName}</h1>
                            <p className="text-muted-foreground text-sm mt-0.5">{user?.email}</p>
                            <p className="text-xs text-primary/80 font-bold uppercase tracking-widest mt-1">
                                {user?.custom_title || 'Engineering Team'}
                            </p>

                            {badges.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {badges.map((b) => (
                                        <span
                                            key={b.label}
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${b.color}`}
                                        >
                                            <BadgeCheck className="w-3 h-3 font-bold " />
                                            {b.label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Details card */}
                <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-xl shadow-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Account Details</h2>
                    </div>

                    <ul className="divide-y divide-border">
                        {infoItems.map((item) => (
                            <li key={item.label} className="flex items-center justify-between px-6 py-4 hover:bg-muted/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    {item.icon}
                                    <span className="text-sm text-muted-foreground">{item.label}</span>
                                </div>
                                <span className="text-sm font-medium text-foreground text-right max-w-xs truncate">
                                    {item.value || '—'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="text-[10px] text-muted-foreground text-center uppercase tracking-[0.2em] font-bold">
                    Profile pictures fallback to Gravatar based on your email
                </p>

            </div>
        </div>
    );
}
