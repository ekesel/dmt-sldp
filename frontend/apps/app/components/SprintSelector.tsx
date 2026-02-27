"use client";
import React, { useEffect, useState } from 'react';
import { ChevronDown, GitBranch, Info } from 'lucide-react';
import { sprints } from '@dmt/api';

interface Sprint {
    id: number;
    name: string;
    start_date: string | null;
    end_date: string | null;
    status: string;
}

interface SprintSelectorProps {
    projectId: number | null;           // null = all projects
    selectedSprintId: number | null;
    onSelect: (sprintId: number | null) => void;
}

export const SprintSelector: React.FC<SprintSelectorProps> = ({ projectId, selectedSprintId, onSelect }) => {
    const [sprintList, setSprintList] = useState<Sprint[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    // Re-fetch sprints whenever the project changes
    useEffect(() => {
        setLoading(true);
        sprints.list(projectId)
            .then(data => {
                setSprintList(data);
                // Auto-select latest sprint (first in list) whenever project changes
                if (data.length > 0) {
                    onSelect(data[0].id);
                } else {
                    onSelect(null);
                }
            })
            .catch(() => setSprintList([]))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const selectedSprint = sprintList.find(s => s.id === selectedSprintId);
    const isAllProjects = projectId === null;

    if (loading) {
        return <div className="animate-pulse w-48 h-10 bg-slate-800 rounded-lg" />;
    }

    // All Projects mode: show a read-only chip with tooltip
    if (isAllProjects) {
        const latestSprint = sprintList[0];
        return (
            <div className="relative group flex items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed select-none w-48">
                    <GitBranch size={14} className="text-slate-600 flex-shrink-0" />
                    <span className="truncate text-sm font-medium">
                        {latestSprint ? latestSprint.name : 'No sprints'}
                    </span>
                    <Info size={12} className="text-slate-600 ml-auto flex-shrink-0" />
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-0 hidden group-hover:flex items-start z-50 pointer-events-none">
                    <div className="bg-slate-900 border border-white/10 text-slate-300 text-xs font-medium px-3 py-2 rounded-lg shadow-xl whitespace-nowrap max-w-xs">
                        <span className="text-brand-primary font-bold">Latest sprint selected automatically</span>
                        <br />
                        Select a project to choose a specific sprint.
                    </div>
                    {/* Arrow */}
                    <div className="absolute left-4 bottom-0 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
                </div>
            </div>
        );
    }

    // Project selected mode: full interactive dropdown
    if (sprintList.length === 0) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/40 text-slate-500 border border-slate-700/50 w-48 text-sm font-medium">
                <GitBranch size={14} className="text-slate-600" />
                <span>No sprints</span>
            </div>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all font-medium border border-slate-700 w-48 justify-between"
            >
                <div className="flex items-center gap-2 truncate">
                    <GitBranch size={14} className="text-brand-primary flex-shrink-0" />
                    <span className="truncate text-sm">
                        {selectedSprint ? selectedSprint.name : 'Select sprint'}
                    </span>
                </div>
                <ChevronDown size={14} className={`transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-60 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1 max-h-60 overflow-y-auto">
                    {sprintList.map(sprint => (
                        <button
                            key={sprint.id}
                            onClick={() => {
                                onSelect(sprint.id);
                                setIsOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-700 flex items-center justify-between gap-2 transition-colors ${selectedSprintId === sprint.id ? 'text-brand-primary bg-slate-700/50' : 'text-slate-300'
                                }`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sprint.status === 'active' ? 'bg-emerald-500' : 'bg-slate-500'
                                    }`} />
                                <span className="truncate">{sprint.name}</span>
                            </div>
                            {sprint.status === 'active' && (
                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
                                    Active
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Backdrop to close */}
            {isOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            )}
        </div>
    );
};
