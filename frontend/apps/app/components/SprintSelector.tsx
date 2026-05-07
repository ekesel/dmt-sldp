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

export const SprintSelector = React.memo(({ projectId, selectedSprintId, onSelect }: SprintSelectorProps) => {
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
        return <div className="animate-pulse w-48 h-10 bg-muted rounded-lg" />;
    }

    // All Projects mode: show a read-only chip with tooltip
    if (isAllProjects) {
        const latestSprint = sprintList[0];
        return (
            <div className="relative group flex items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 text-muted-foreground border border-border/50 cursor-not-allowed select-none w-48">
                    <GitBranch size={14} className="text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-sm font-medium">
                        {latestSprint ? latestSprint.name : 'No sprints'}
                    </span>
                    <Info size={12} className="text-muted-foreground ml-auto flex-shrink-0" />
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-0 hidden group-hover:flex items-start z-50 pointer-events-none">
                    <div className="bg-popover border border-border text-popover-foreground text-xs font-medium px-3 py-2 rounded-lg shadow-xl whitespace-nowrap max-w-xs">
                        <span className="text-primary font-bold">Latest sprint selected automatically</span>
                        <br />
                        Select a project to choose a specific sprint.
                    </div>
                    {/* Arrow */}
                    <div className="absolute left-4 bottom-0 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover" />
                </div>
            </div>
        );
    }

    // Project selected mode: full interactive dropdown
    if (sprintList.length === 0) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/40 text-muted-foreground border border-border/50 w-48 text-sm font-medium">
                <GitBranch size={14} className="text-muted-foreground" />
                <span>No sprints</span>
            </div>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card text-foreground hover:bg-accent transition-all font-medium border border-border w-48 justify-between"
            >
                <div className="flex items-center gap-2 truncate">
                    <GitBranch size={14} className="text-primary flex-shrink-0" />
                    <span className="truncate text-sm">
                        {selectedSprint ? selectedSprint.name : 'Select sprint'}
                    </span>
                </div>
                <ChevronDown size={14} className={`transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-60 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 max-h-60 overflow-y-auto">
                    {sprintList.map(sprint => (
                        <button
                            key={sprint.id}
                            onClick={() => {
                                onSelect(sprint.id);
                                setIsOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-accent flex items-center justify-between gap-2 transition-colors ${selectedSprintId === sprint.id ? 'text-primary bg-accent/50' : 'text-muted-foreground'
                                }`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sprint.status === 'active' ? 'bg-accent' : 'bg-muted-foreground'
                                    }`} />
                                <span className="truncate">{sprint.name}</span>
                            </div>
                            {sprint.status === 'active' && (
                                <span className="text-[9px] font-black uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded flex-shrink-0">
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
});

SprintSelector.displayName = 'SprintSelector';
