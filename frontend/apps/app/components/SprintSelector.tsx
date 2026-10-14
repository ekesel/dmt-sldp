
import React, { useEffect, useState, useRef } from 'react';
import { ChevronDown, GitBranch } from 'lucide-react';
import { sprints } from '@dmt/api';
import { cn } from '@dmt/ui';

export interface Sprint {
    id: number;
    name: string;
    start_date: string | null;
    end_date: string | null;
    status: string;
}

export interface SprintSelectorProps {
    projectId: number | null;           // null = all projects
    selectedSprintId: number | null;
    onSelect: (sprintId: number | null, sprint?: Sprint | null) => void;
    className?: string;
    autoSelectLatest?: boolean;
    allowAll?: boolean;
    allLabel?: string;
}

export const SprintSelector = React.memo(({
    projectId,
    selectedSprintId,
    onSelect,
    className,
    autoSelectLatest = true,
    allowAll = false,
    allLabel = 'All Sprints'
}: SprintSelectorProps) => {
    const [sprintList, setSprintList] = useState<Sprint[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    // Re-fetch sprints whenever the project changes
    useEffect(() => {
        setSprintList([]);
        setIsOpen(false);
        if (projectId === null || projectId === undefined) {
            setLoading(false);
            return;
        }

        let isMounted = true;
        setLoading(true);
        
        sprints.list(projectId)
            .then(data => {
                if (!isMounted) return;
                setSprintList(data);
                // Auto-select latest sprint (first in list) whenever project changes
                if (autoSelectLatest) {
                    if (data.length > 0) {
                        onSelect(data[0].id, data[0]);
                    } else {
                        onSelect(null, null);
                    }
                }
            })
            .catch(() => {
                if (!isMounted) return;
                setSprintList([]);
            })
            .finally(() => {
                if (!isMounted) return;
                setLoading(false);
            });
            
        return () => {
            isMounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, autoSelectLatest]);

    const selectedSprint = sprintList.find(s => String(s.id) === String(selectedSprintId));
    const isAllProjects = projectId === null || projectId === undefined;

    // Hide sprint filter when all projects is selected
    if (isAllProjects) {
        return null;
    }

    if (loading) {
        return <div className={cn("animate-pulse bg-muted rounded-lg w-48 h-10", className)} />;
    }

    // Project selected mode: full interactive dropdown
    if (sprintList.length === 0) {
        return (
            <div className={cn("flex items-center gap-2 rounded-lg bg-muted/40 text-muted-foreground border border-border/50 w-48 text-sm font-medium px-4 py-2 h-10", className)}>
                <GitBranch size={14} className="text-muted-foreground" />
                <span>No sprints</span>
            </div>
        );
    }

    const displayText = selectedSprint
        ? selectedSprint.name
        : selectedSprintId
        ? `Sprint ${selectedSprintId}`
        : allowAll
        ? allLabel
        : 'Select sprint';

    return (
        <div ref={dropdownRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn("flex items-center gap-2 rounded-lg bg-card text-foreground hover:bg-accent transition-all font-medium border border-border w-48 justify-between px-4 py-2 h-10", className)}
            >
                <div className="flex items-center gap-2 truncate">
                    <GitBranch size={14} className={cn("flex-shrink-0", selectedSprint ? "text-primary" : "text-muted-foreground")} />
                    <span className="truncate text-sm">
                        {displayText}
                    </span>
                </div>
                <ChevronDown size={14} className={`transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-64 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 max-h-60 overflow-y-auto">
                    {allowAll && (
                        <button
                            type="button"
                            onClick={() => {
                                onSelect(null, null);
                                setIsOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-accent flex items-center justify-between gap-2 transition-colors ${!selectedSprintId ? 'text-primary bg-accent/50 font-semibold' : 'text-muted-foreground'}`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <GitBranch size={14} className="flex-shrink-0" />
                                <span className="truncate">{allLabel}</span>
                            </div>
                        </button>
                    )}
                    {sprintList.map(sprint => (
                        <button
                            type="button"
                            key={sprint.id}
                            onClick={() => {
                                onSelect(sprint.id, sprint);
                                setIsOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-accent flex items-center justify-between gap-2 transition-colors ${String(selectedSprintId) === String(sprint.id) ? 'text-primary bg-accent/50 font-semibold' : 'text-muted-foreground'
                                }`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sprint.status === 'active' ? 'bg-accent' : 'bg-muted-foreground'
                                    }`} />
                                <span className="truncate">{sprint.name}</span>
                            </div>
                            {sprint.status === 'active' && (
                                <span className="text-[0.5625rem] font-black uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded flex-shrink-0">
                                    Active
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
});

SprintSelector.displayName = 'SprintSelector';
