import React, { useState, useEffect, useRef } from 'react';
import { Filter, Loader2, Target } from 'lucide-react';
import { sources as sourcesApi, Source } from '@dmt/api';
import { toast } from 'react-hot-toast';
import { usePermissions } from '../hooks/usePermissions';

interface RemoteFolder {
    id: string;
    name: string;
}

interface SourceConfig {
    active_folder_id?: string;
    active_folder_name?: string;
    [key: string]: unknown;
}

interface ActiveSource extends Source {
    is_active?: boolean;
    source_type?: string;
    config_json?: SourceConfig;
}

interface ActiveFolderSelectorProps {
    projectId: number | null;
    onFolderChanged: () => void; // Trigger a refresh of the dashboard
    className?: string;
    dropdownAlign?: 'left' | 'right' | 'auto';
}

/**
 * ActiveFolderSelector component allows users with appropriate permissions
 * to change the active folder/team scope for metrics across the dashboard.
 */
export const ActiveFolderSelector: React.FC<ActiveFolderSelectorProps> = ({
    projectId,
    onFolderChanged,
    className,
    dropdownAlign = 'auto',
}) => {
    const [source, setSource] = useState<ActiveSource | null>(null);
    const [folders, setFolders] = useState<RemoteFolder[]>([]);
    const [isLoadingFolders, setIsLoadingFolders] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
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

    const { isManager, isStaff, isSuperUser } = usePermissions();
    const canManageScope = isManager || isStaff || isSuperUser;

    useEffect(() => {
        if (!projectId) {
            setSource(null);
            setFolders([]);
            return;
        }

        const fetchSourceAndFolders = async () => {
            setIsLoadingFolders(true);
            try {
                // Fetch the source configurations for this project
                const sourcesList = await sourcesApi.list(projectId) as ActiveSource[];
                // We only support this on ClickUp or Azure DevOps, grab the first active one
                const targetSource = sourcesList.find((s) =>
                    Boolean(s.is_active && (s.source_type === 'clickup' || s.source_type?.includes('azure')))
                );

                if (targetSource) {
                    setSource(targetSource);
                    // Fetch remote folders
                    const response = await sourcesApi.remoteFolders(targetSource.id);
                    if (response.status === 'success' && response.folders) {
                        setFolders(response.folders);
                    }
                } else {
                    setSource(null);
                    setFolders([]);
                }
            } catch (error) {
                console.error("Failed to load source/folders:", error);
            } finally {
                setIsLoadingFolders(false);
            }
        };

        fetchSourceAndFolders();
    }, [projectId]);

    if (!projectId || !source || !canManageScope) return null;

    const currentFolderId = source.config_json?.active_folder_id;
    const currentFolderName = source.config_json?.active_folder_name;

    const handleSelectFolder = async (folderId: string, folderName: string) => {
        setIsOpen(false);
        setIsSaving(true);
        try {
            await sourcesApi.update(source.id, {
                config_json: {
                    ...(source.config_json || {}),
                    active_folder_id: folderId,
                    active_folder_name: folderName
                }
            });
            toast.success(`Active scope updated. Recalculating metrics...`);

            // Re-fetch source to update UI state locally
            const updatedSourcesList = await sourcesApi.list(projectId) as ActiveSource[];
            const updatedTargetSource = updatedSourcesList.find((s) => s.id === source.id);
            if (updatedTargetSource) {
                setSource(updatedTargetSource);
            }

            // Tell the dashboard to trigger a visual refresh after recalculation
            setTimeout(() => {
                onFolderChanged();
            }, 1000);

        } catch (err) {
            console.error(err);
            toast.error("Failed to update active folder scope.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div ref={dropdownRef} className={`relative w-full sm:w-auto ${className || ''}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoadingFolders || isSaving}
                className="flex items-center gap-2 sm:gap-3 bg-card border border-border hover:border-primary/40 p-2 pr-3 sm:pr-4 rounded-xl sm:rounded-2xl shadow-2xl transition-all duration-300 w-full sm:w-auto min-w-0 sm:min-w-[18rem] md:min-w-[19rem] xl:min-w-[21rem] text-left cursor-pointer"
                title={currentFolderName ? `Current Scope: ${currentFolderName}` : 'All Folders (Whole Project)'}
            >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} className={currentFolderId ? 'text-accent' : 'text-primary'} />}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[0.625rem] uppercase font-black tracking-widest text-muted-foreground leading-none mb-1">Scope</span>
                    <span
                        className="font-bold text-xs sm:text-sm text-foreground break-words leading-tight"
                        title={isLoadingFolders ? 'Loading...' : (currentFolderName || 'All Folders (Whole Project)')}
                    >
                        {isLoadingFolders ? 'Loading...' : (currentFolderName || 'All Folders (Whole Project)')}
                    </span>
                </div>
                <Filter size={15} className="text-muted-foreground shrink-0" />
            </button>

            {isOpen && (
                <div
                    className={`absolute mt-2 z-50 bg-popover/95 backdrop-blur-xl border border-border rounded-xl sm:rounded-2xl shadow-[0_1.25rem_3.75rem_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${
                        dropdownAlign === 'left'
                            ? 'left-0'
                            : dropdownAlign === 'right'
                            ? 'right-0'
                            : 'left-0 sm:left-auto sm:right-0 xl:right-0'
                    } w-full sm:w-80 md:w-96 xl:w-[26rem] max-w-[calc(100vw-1.5rem)]`}
                >
                    <div className="p-1.5 space-y-0.5 max-h-64 sm:max-h-80 overflow-y-auto">
                        <button
                            type="button"
                            onClick={() => handleSelectFolder('', '')}
                            className={`w-full flex items-start gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 group cursor-pointer ${
                                !currentFolderId
                                    ? 'bg-primary/15 text-foreground'
                                    : 'text-muted-foreground hover:bg-muted/10 hover:text-foreground'
                            }`}
                            title="All Folders (Whole Project)"
                        >
                            <div
                                className={`w-2 h-2 rounded-full shrink-0 mt-1.5 transition-all duration-200 ${
                                    !currentFolderId
                                        ? 'bg-primary shadow-[0_0_0.375rem_var(--color-primary)]'
                                        : 'bg-muted-foreground/50 group-hover:bg-muted-foreground'
                                }`}
                            />
                            <span className="font-semibold text-sm break-words leading-snug flex-1">
                                All Folders (Whole Project)
                            </span>
                        </button>

                        {folders.map(f => {
                            const isActive = currentFolderId === f.id;
                            return (
                                <button
                                    type="button"
                                    key={f.id}
                                    onClick={() => handleSelectFolder(f.id, f.name)}
                                    className={`w-full flex items-start gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 group cursor-pointer ${
                                        isActive
                                            ? 'bg-primary/15 text-foreground'
                                            : 'text-muted-foreground hover:bg-muted/10 hover:text-foreground'
                                    }`}
                                    title={f.name}
                                >
                                    <div
                                        className={`w-2 h-2 rounded-full shrink-0 mt-1.5 transition-all duration-200 ${
                                            isActive
                                                ? 'bg-primary shadow-[0_0_0.375rem_var(--color-primary)]'
                                                : 'bg-muted-foreground/50 group-hover:bg-muted-foreground'
                                        }`}
                                    />
                                    <span className="font-semibold text-sm break-words leading-snug flex-1">{f.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
