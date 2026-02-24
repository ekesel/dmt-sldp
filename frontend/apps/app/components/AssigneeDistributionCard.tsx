'use client';
import React from 'react';
import { Users, Clock, CheckCircle2, Loader2, UserCheck } from 'lucide-react';
import { AssigneeEntry } from '../hooks/useDashboardData';

interface Props {
    assignees: AssigneeEntry[];
    loading?: boolean;
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// Deterministic pastel color from name string
function avatarColor(name: string): string {
    const colors = [
        '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
        '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

export function AssigneeDistributionCard({ assignees, loading }: Props) {
    if (loading) {
        return (
            <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6 flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
            </div>
        );
    }

    if (!assignees || assignees.length === 0) return null;

    // Ensure unique items by email to prevent duplicate key errors in UI
    const seenEmails = new Set<string>();
    const uniqueAssignees = assignees.filter((a) => {
        if (!a.email || seenEmails.has(a.email)) return false;
        seenEmails.add(a.email);
        return true;
    });

    if (uniqueAssignees.length === 0) return null;

    const maxTotal = Math.max(...uniqueAssignees.map((a) => a.total), 1);

    return (
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            {/* Header */}
            <div className="flex items-center gap-2 mb-5">
                <Users className="text-brand-primary w-5 h-5" />
                <div className="flex items-baseline gap-2">
                    <h2 className="text-xl font-bold text-white">Team Workload</h2>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Last 5 sprints</span>
                </div>
                <span className="ml-auto text-xs text-slate-400">{uniqueAssignees.length} member{uniqueAssignees.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-4">
                {uniqueAssignees.map((person) => {
                    const color = avatarColor(person.name);
                    const barWidth = Math.round((person.total / maxTotal) * 100);
                    const inProgressPct = person.total > 0 ? Math.round((person.in_progress / person.total) * 100) : 0;

                    return (
                        <div key={person.email} className="group">
                            <div className="flex items-center gap-3 mb-1.5">
                                {/* Avatar */}
                                <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md"
                                    style={{ backgroundColor: color }}
                                >
                                    {getInitials(person.name)}
                                </div>

                                {/* Name + badges */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-sm font-medium text-white truncate">{person.name}</span>
                                        {person.is_portal_user && (
                                            <span title="Can log in to portal">
                                                <UserCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-500 truncate">{person.email}</span>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                                    <span className="flex items-center gap-1 text-amber-400" title="In progress">
                                        <Loader2 className="w-3 h-3" />
                                        {person.in_progress}
                                    </span>
                                    <span className="flex items-center gap-1 text-emerald-400" title="Completed">
                                        <CheckCircle2 className="w-3 h-3" />
                                        {person.completed}
                                    </span>
                                    {person.avg_cycle_time_days !== null && (
                                        <span className="flex items-center gap-1 text-slate-400" title="Avg cycle time">
                                            <Clock className="w-3 h-3" />
                                            {person.avg_cycle_time_days}d
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Workload bar */}
                            <div className="ml-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${barWidth}%`,
                                        background: `linear-gradient(90deg, ${color}99, ${color})`,
                                    }}
                                />
                            </div>

                            {/* In-progress sub-bar overlay */}
                            {person.in_progress > 0 && (
                                <div className="ml-12 mt-0.5 h-0.5 bg-amber-400/30 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-amber-400"
                                        style={{ width: `${inProgressPct}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-slate-700/50 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 text-amber-400" /> In Progress</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Completed</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Avg Cycle</span>
                <span className="flex items-center gap-1 ml-auto"><UserCheck className="w-3 h-3 text-emerald-400" /> Portal access</span>
            </div>
        </div>
    );
}
