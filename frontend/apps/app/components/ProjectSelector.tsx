import React, { useEffect, useRef } from 'react';
import { ChevronDown, Folder } from 'lucide-react';
import { useProjects, Project } from '../hooks/useProjects';
import { cn } from '@dmt/ui';

export type { Project };

export interface ProjectSelectorProps {
    selectedProjectId: number | null;
    onSelect: (projectId: number | null, project?: Project | null) => void;
    className?: string;
    buttonClassName?: string;
}

export const ProjectSelector = React.memo(({ selectedProjectId, onSelect, className, buttonClassName }: ProjectSelectorProps) => {
    const { projects, loading, error } = useProjects();
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedProject = projects.find(p => p.id === selectedProjectId);

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

    if (loading) return <div className={cn("animate-pulse w-full sm:w-60 h-10 bg-muted rounded-lg", className)}></div>;
    if (error) return <div className="text-destructive text-xs">Error loading projects</div>;

    return (
        <div ref={dropdownRef} className={cn("relative w-full sm:w-auto", className)}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-card text-foreground hover:bg-accent transition-all font-semibold border border-border w-full sm:w-60 min-h-[2.5rem] h-auto justify-between text-xs sm:text-sm cursor-pointer",
                    buttonClassName
                )}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Folder size={16} className="text-primary flex-shrink-0" />
                    <span className="break-words whitespace-normal text-left leading-snug">{selectedProject ? selectedProject.name : 'All Projects'}</span>
                </div>
                <ChevronDown size={14} className={`transition-transform duration-200 flex-shrink-0 ml-1.5 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-full sm:w-64 max-w-[calc(100vw-1.5rem)] left-0 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto chart-scrollbar">
                    <button
                        type="button"
                        onClick={() => {
                            onSelect(null, null);
                            setIsOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-xs sm:text-sm hover:bg-accent flex items-center gap-2.5 ${!selectedProjectId ? 'text-primary bg-accent/50' : 'text-muted-foreground'}`}
                    >
                        <Folder size={14} className="shrink-0" />
                        <span className="break-words whitespace-normal flex-1 leading-snug">All Projects</span>
                    </button>
                    {projects.map(project => (
                        <button
                            type="button"
                            key={project.id}
                            onClick={() => {
                                onSelect(project.id, project);
                                setIsOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-xs sm:text-sm hover:bg-accent flex items-start gap-2.5 ${selectedProjectId === project.id ? 'text-primary bg-accent/50' : 'text-muted-foreground'}`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 shrink-0 mt-1.5"></span>
                            <span className="break-words whitespace-normal flex-1 leading-snug">{project.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
});

ProjectSelector.displayName = 'ProjectSelector';
