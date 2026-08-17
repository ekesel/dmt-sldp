import React from 'react';
import { ChevronDown, Folder } from 'lucide-react';
import { useProjects, Project } from '../hooks/useProjects';

interface ProjectSelectorProps {
    selectedProjectId: number | null;
    onSelect: (projectId: number | null) => void;
}

export const ProjectSelector = React.memo(({ selectedProjectId, onSelect }: ProjectSelectorProps) => {
    const { projects, loading, error } = useProjects();
    const [isOpen, setIsOpen] = React.useState(false);

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    if (loading) return <div className="animate-pulse w-60 h-12 bg-muted rounded-lg"></div>;
    if (error) return <div className="text-destructive text-xs">Error loading projects</div>;

    return (
        <div className="relative">
            <button
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
                <div className="absolute top-full mt-2 w-64 bg-popover border border-border rounded-lg shadow-xl z-50 py-1">
                    <button
                        onClick={() => {
                            onSelect(null);
                            setIsOpen(false);
                        }}
                        className={`w-full px-5 py-2.5 text-left text-sm hover:bg-accent flex items-center gap-2.5 ${!selectedProjectId ? 'text-primary bg-accent/50' : 'text-muted-foreground'}`}
                    >
                        <Folder size={14} />
                        All Projects
                    </button>
                    {projects.map(project => (
                        <button
                            key={project.id}
                            onClick={() => {
                                onSelect(project.id);
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

            {/* Backdrop to close */}
            {isOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
            )}
        </div>
    );
});

ProjectSelector.displayName = 'ProjectSelector';
