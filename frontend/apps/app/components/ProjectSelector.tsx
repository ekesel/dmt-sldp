import React from 'react';
import { ChevronDown, Folder } from 'lucide-react';
import { useProjects, Project } from '../hooks/useProjects';

interface ProjectSelectorProps {
    selectedProjectId: number | null;
    onSelect: (projectId: number | null) => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ selectedProjectId, onSelect }) => {
    const { projects, loading, error } = useProjects();
    const [isOpen, setIsOpen] = React.useState(false);

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    if (loading) return <div className="animate-pulse w-32 h-10 bg-slate-800 rounded-lg"></div>;
    if (error) return <div className="text-red-500 text-xs">Error loading projects</div>;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all font-medium border border-slate-700 w-48 justify-between"
            >
                <div className="flex items-center gap-2 truncate">
                    <Folder size={16} className="text-brand-primary" />
                    <span className="truncate">{selectedProject ? selectedProject.name : 'All Projects'}</span>
                </div>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                    <button
                        onClick={() => {
                            onSelect(null);
                            setIsOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-700 flex items-center gap-2 ${!selectedProjectId ? 'text-brand-primary bg-slate-700/50' : 'text-slate-300'}`}
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
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-700 flex items-center gap-2 ${selectedProjectId === project.id ? 'text-brand-primary bg-slate-700/50' : 'text-slate-300'}`}
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
};
