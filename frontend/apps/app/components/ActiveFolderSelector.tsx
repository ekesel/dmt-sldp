import React, { useState, useEffect } from 'react';
import { Filter, Loader2, Target } from 'lucide-react';
import { sources as sourcesApi } from '@dmt/api';
import { toast } from 'react-hot-toast';
import { usePermissions } from '../hooks/usePermissions';

interface ActiveFolderSelectorProps {
    projectId: number | null;
    onFolderChanged: () => void; // Trigger a refresh of the dashboard
}

export const ActiveFolderSelector: React.FC<ActiveFolderSelectorProps> = ({ projectId, onFolderChanged }) => {
    const [source, setSource] = useState<any>(null);
    const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
    const [isLoadingFolders, setIsLoadingFolders] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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
                const sourcesList = await (sourcesApi as any).list(projectId);
                // We only support this on ClickUp or Azure DevOps, grab the first active one
                const targetSource = sourcesList.find((s: any) =>
                    s.is_active && (s.source_type === 'clickup' || s.source_type.includes('azure'))
                );

                if (targetSource) {
                    setSource(targetSource);
                    // Fetch remote folders
                    const response = await (sourcesApi as any).remoteFolders(targetSource.id);
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
            await (sourcesApi as any).update(source.id, {
                config_json: {
                    ...(source.config_json || {}),
                    active_folder_id: folderId,
                    active_folder_name: folderName
                }
            });
            toast.success(`Active scope updated. Recalculating metrics...`);

            // Re-fetch source to update UI state locally
            const updatedSourcesList = await (sourcesApi as any).list(projectId);
            const updatedTargetSource = updatedSourcesList.find((s: any) => s.id === source.id);
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
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoadingFolders || isSaving}
                className="flex items-center gap-3 bg-slate-900 border border-white/10 hover:border-brand-primary/40 p-2 pr-4 rounded-2xl shadow-2xl transition-all duration-300 w-full min-w-[240px] text-left"
                title="Select a specific Team or Folder to scope all metrics"
            >
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 shrink-0">
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Target size={18} className={currentFolderId ? 'text-green-400' : 'text-brand-primary'} />}
                </div>
                <div className="flex flex-col flex-1 truncate">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 leading-none mb-1">Scope</span>
                    <span className="font-bold text-sm text-white truncate leading-none">
                        {isLoadingFolders ? 'Loading...' : (currentFolderName || 'All Folders (Whole Project)')}
                    </span>
                </div>
                <Filter size={16} className="text-slate-400 shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-full min-w-[240px] z-50 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1.5 space-y-0.5 max-h-64 overflow-y-auto">
                        <button
                            onClick={() => handleSelectFolder('', '')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${!currentFolderId
                                ? 'bg-brand-primary/15 text-white'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-200 ${!currentFolderId ? 'bg-brand-primary shadow-[0_0_6px_var(--color-brand-primary)]' : 'bg-slate-700 group-hover:bg-slate-400'
                                }`} />
                            <span className="font-semibold text-sm truncate">All Folders (Whole Project)</span>
                        </button>

                        {folders.map(f => {
                            const isActive = currentFolderId === f.id;
                            return (
                                <button
                                    key={f.id}
                                    onClick={() => handleSelectFolder(f.id, f.name)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${isActive
                                        ? 'bg-brand-primary/15 text-white'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-200 ${isActive ? 'bg-brand-primary shadow-[0_0_6px_var(--color-brand-primary)]' : 'bg-slate-700 group-hover:bg-slate-400'
                                        }`} />
                                    <span className="font-semibold text-sm truncate">{f.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Backdrop to close */}
            {isOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
            )}
        </div>
    );
};
