'use client';

import React from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../auth/AuthContext';
import { User, Mail, Shield, BadgeCheck, FileText } from 'lucide-react';

export default function ProfilePage() {
    const { user } = useAuth();

    if (!user) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">My Profile</h1>
                        <p className="text-muted-foreground">View and manage your account details.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Profile Card */}
                    <div className="md:col-span-1 border border-border bg-card/50 rounded-xl p-6 flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
                            <span className="text-primary-foreground font-bold text-3xl">
                                {(user.first_name?.[0] || user.username?.[0] || 'A').toUpperCase()}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-card-foreground">
                            {user.first_name} {user.last_name}
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">@{user.username}</p>

                        <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium border border-primary/20">
                            <Shield size={14} />
                            {user.is_superuser ? 'Super Admin' : user.is_platform_admin ? 'Platform Admin' : 'Admin'}
                        </div>
                    </div>

                    {/* Details Card */}
                    <div className="md:col-span-2 border border-border bg-card/50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-card-foreground mb-6 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-accent" />
                            Account Details
                        </h3>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <User className="w-3 h-3" /> First Name
                                    </label>
                                    <p className="text-sm font-medium text-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border">
                                        {user.first_name || 'N/A'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <User className="w-3 h-3" /> Last Name
                                    </label>
                                    <p className="text-sm font-medium text-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border">
                                        {user.last_name || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> Email Address
                                </label>
                                <p className="text-sm font-medium text-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border">
                                    {user.email || 'N/A'}
                                </p>
                            </div>

                            <div className="pt-6 border-t border-border">
                                <h4 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                                    <BadgeCheck className="w-4 h-4 text-success" />
                                    Roles & Permissions
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {user.is_superuser && (
                                        <span className="px-2.5 py-1 bg-secondary text-secondary-foreground rounded text-xs border border-border">
                                            Superuser
                                        </span>
                                    )}
                                    {user.is_platform_admin && (
                                        <span className="px-2.5 py-1 bg-secondary text-secondary-foreground rounded text-xs border border-border">
                                            Platform Admin
                                        </span>
                                    )}
                                    {user.is_staff && (
                                        <span className="px-2.5 py-1 bg-secondary text-secondary-foreground rounded text-xs border border-border">
                                            Staff Access
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
