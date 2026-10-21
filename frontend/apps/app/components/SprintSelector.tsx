
import React, { useEffect, useState, useRef } from 'react';
import { ChevronDown, GitBranch, Check } from 'lucide-react';
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
    selectedSprintId?: number | null;
    onSelect?: (sprintId: number | null, sprint?: Sprint | null) => void;
    multiSelect?: boolean;
    selectedSprintIds?: number[];
    onMultiSelect?: (sprintIds: number[], sprints: Sprint[]) => void;
    className?: string;
    autoSelectLatest?: boolean;
    allowAll?: boolean;
    allLabel?: string;
    popoverAlign?: 'left' | 'right';
}

export const SprintSelector = React.memo(({
    projectId,
    selectedSprintId = null,
    onSelect,
    multiSelect = false,
    selectedSprintIds = [],
    onMultiSelect,
    className,
    autoSelectLatest = true,
    allowAll = false,
    allLabel = 'All Sprints',
    popoverAlign = 'right'
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
                        onSelect?.(data[0].id, data[0]);
                        onMultiSelect?.([data[0].id], [data[0]]);
                    } else {
                        onSelect?.(null, null);
                        onMultiSelect?.([], []);
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

    // When sprintList loads in multiSelect mode and selectedSprintIds exists, resolve sprint objects for parent
    const lastResolvedIdsRef = useRef<string>('');
    useEffect(() => {
        if (multiSelect && selectedSprintIds && selectedSprintIds.length > 0 && sprintList.length > 0 && onMultiSelect) {
            const idsKey = selectedSprintIds.slice().sort().join(',');
            if (lastResolvedIdsRef.current !== idsKey) {
                lastResolvedIdsRef.current = idsKey;
                const matched = sprintList.filter(s => selectedSprintIds.some(id => String(id) === String(s.id)));
                if (matched.length > 0) {
                    onMultiSelect(selectedSprintIds, matched);
                }
            }
        }
    }, [multiSelect, selectedSprintIds, sprintList, onMultiSelect]);

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

    const activeSelectedIds = multiSelect
        ? (selectedSprintIds || [])
        : (selectedSprintId !== null && selectedSprintId !== undefined ? [selectedSprintId] : []);

    const selectedSprints = sprintList.filter(s => activeSelectedIds.some(id => String(id) === String(s.id)));
    const singleSelectedSprint = selectedSprints[0] || sprintList.find(s => String(s.id) === String(selectedSprintId));

    let displayText = '';
    if (multiSelect) {
        if (activeSelectedIds.length === 0) {
            displayText = allowAll ? allLabel : 'Select sprints';
        } else if (activeSelectedIds.length === 1) {
            displayText = singleSelectedSprint ? singleSelectedSprint.name : `Sprint ${activeSelectedIds[0]}`;
        } else {
            displayText = `${activeSelectedIds.length} Sprints Selected`;
        }
    } else {
        displayText = singleSelectedSprint
            ? singleSelectedSprint.name
            : selectedSprintId
                ? `Sprint ${selectedSprintId}`
                : allowAll
                    ? allLabel
                    : 'Select sprint';
    }

    return (
        <div ref={dropdownRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn("flex items-center gap-2 rounded-lg bg-card text-foreground hover:bg-accent transition-all font-medium border border-border w-48 justify-between px-4 py-2 h-10 cursor-pointer", className)}
            >
                <div className="flex items-center gap-2 truncate min-w-0">
                    <GitBranch size={14} className={cn("flex-shrink-0", activeSelectedIds.length > 0 ? "text-primary" : "text-muted-foreground")} />
                    <span className="truncate text-sm font-medium">
                        {displayText}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {multiSelect && activeSelectedIds.length > 1 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground leading-none">
                            {activeSelectedIds.length}
                        </span>
                    )}
                    <ChevronDown size={14} className={`transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {isOpen && (
                <div className={cn(
                    "absolute top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-popover border border-border rounded-xl shadow-2xl z-50 py-1 overflow-hidden backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150",
                    popoverAlign === 'left' ? 'left-0' : 'right-0'
                )}>
                    {multiSelect ? (
                        <>
                            {/* Multi-select Header: All Sprints option */}
                            <div className="px-2 py-1.5 border-b border-border/60 flex items-center justify-between text-xs">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onMultiSelect?.([], []);
                                        onSelect?.(null, null);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer w-full text-left",
                                        activeSelectedIds.length === 0
                                            ? "text-primary font-bold bg-primary/10"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                >
                                    <div className={cn(
                                        "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                                        activeSelectedIds.length === 0
                                            ? "bg-primary border-primary text-primary-foreground"
                                            : "border-muted-foreground/40 bg-card"
                                    )}>
                                        {activeSelectedIds.length === 0 && <Check size={11} strokeWidth={3} />}
                                    </div>
                                    <span className="font-semibold">{allLabel}</span>
                                    {activeSelectedIds.length === 0 && (
                                        <span className="ml-auto text-[0.5625rem] font-black uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                                            Active
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* Sprints List with Checkboxes */}
                            <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
                                {sprintList.map(sprint => {
                                    const isChecked = activeSelectedIds.some(id => String(id) === String(sprint.id));
                                    return (
                                        <button
                                            type="button"
                                            key={sprint.id}
                                            onClick={() => {
                                                let newIds: number[];
                                                if (isChecked) {
                                                    newIds = activeSelectedIds.filter(id => String(id) !== String(sprint.id));
                                                } else {
                                                    newIds = [...activeSelectedIds, sprint.id];
                                                }
                                                const newSprints = sprintList.filter(s => newIds.some(id => String(id) === String(s.id)));
                                                onMultiSelect?.(newIds, newSprints);
                                                onSelect?.(newIds.length === 1 ? newIds[0] : null, newSprints[0] || null);
                                            }}
                                            className={cn(
                                                "w-full px-2.5 py-2 rounded-lg text-left text-sm flex items-center justify-between gap-2.5 transition-colors cursor-pointer group",
                                                isChecked
                                                    ? "bg-primary/10 text-foreground font-semibold"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={cn(
                                                    "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                                                    isChecked
                                                        ? "bg-primary border-primary text-primary-foreground"
                                                        : "border-muted-foreground/40 bg-card group-hover:border-primary/50"
                                                )}>
                                                    {isChecked && <Check size={11} strokeWidth={3} />}
                                                </div>
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sprint.status === 'active' ? 'bg-accent' : 'bg-muted-foreground/40'}`} />
                                                <span className="truncate">{sprint.name}</span>
                                            </div>
                                            {sprint.status === 'active' && (
                                                <span className="text-[0.5625rem] font-black uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded shrink-0">
                                                    Active
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Multi-select Footer: Count & Done button */}
                            <div className="px-3 py-2 border-t border-border/60 flex items-center justify-between text-xs bg-muted/20">
                                <span className="text-muted-foreground text-[11px]">
                                    {activeSelectedIds.length === 0
                                        ? 'All sprints'
                                        : `${activeSelectedIds.length} of ${sprintList.length} selected`}
                                </span>
                                <div className="flex items-center gap-2">
                                    {activeSelectedIds.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onMultiSelect?.([], []);
                                                onSelect?.(null, null);
                                            }}
                                            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-xs"
                                        >
                                            Clear
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors cursor-pointer"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="max-h-60 overflow-y-auto py-1">
                            {allowAll && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onSelect?.(null, null);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-accent flex items-center justify-between gap-2 transition-colors cursor-pointer ${!selectedSprintId ? 'text-primary bg-accent/50 font-semibold' : 'text-muted-foreground'}`}
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
                                        onSelect?.(sprint.id, sprint);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-accent flex items-center justify-between gap-2 transition-colors cursor-pointer ${String(selectedSprintId) === String(sprint.id) ? 'text-primary bg-accent/50 font-semibold' : 'text-muted-foreground'}`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sprint.status === 'active' ? 'bg-accent' : 'bg-muted-foreground'}`} />
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
            )}
        </div>
    );
});

SprintSelector.displayName = 'SprintSelector';
