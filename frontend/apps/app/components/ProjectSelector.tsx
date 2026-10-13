import React, { useEffect, useRef } from 'react';
import { ChevronDown, Folder } from 'lucide-react';
import { useProjects, Project } from '../hooks/useProjects';

export type { Project };

export interface ProjectSelectorProps {
    selectedProjectId: number | null;
    onSelect: (projectId: number | null, project?: Project | null) => void;
}

export const ProjectSelector = React.memo(({ selectedProjectId, onSelect }: ProjectSelectorProps) => {
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

    if (loading) return <div className="animate-pulse w-60 h-12 bg-muted rounded-lg"></div>;
    if (error) return <div className="text-destructive text-xs">Error loading projects</div>;

    return (
        <div ref={dropdownRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-5 py-3 rounded-lg bg-card text-foreground hover:bg-accent transition-all font-semibold border border-border w-60 h-12 justify-between text-sm"
            >
                <div className="flex items-center gap-2.5 truncate">
                    <Folder size={18} className="text-primary flex-shrink-0" />
                    <span className="truncate">{selectedProject ? selectedProject.name : 'All Projects'}</span>
                </div>
                <ChevronDown size={16} className={`transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-64 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
                    <button
                        type="button"
                        onClick={() => {
                            onSelect(null, null);
                            setIsOpen(false);
                        }}
                        className={`w-full px-5 py-2.5 text-left text-sm hover:bg-accent flex items-center gap-2.5 ${!selectedProjectId ? 'text-primary bg-accent/50' : 'text-muted-foreground'}`}
                    >
                        <Folder size={14} />
                        All Projects
                    </button>
                    {projects.map(project => (
                        <button
                            type="button"
                            key={project.id}
                            onClick={() => {
                                onSelect(project.id, project);
                                setIsOpen(false);
                            }}
                            className={`w-full px-5 py-2.5 text-left text-sm hover:bg-accent flex items-center gap-2.5 ${selectedProjectId === project.id ? 'text-primary bg-accent/50' : 'text-muted-foreground'}`}
                        >
                            <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
                            {project.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
});

ProjectSelector.displayName = 'ProjectSelector';
