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
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all font-medium border border-slate-700 w-auto justify-between max-w-[250px]"
                title="Select a specific Team or Folder to scope all metrics"
            >
                <div className="flex items-center gap-2 truncate">
                    {isSaving ? <Loader2 size={16} className="animate-spin text-brand-primary" /> : <Target size={16} className={currentFolderId ? 'text-green-400' : 'text-slate-400'} />}
                    <span className="truncate whitespace-nowrap">
                        {isLoadingFolders ? 'Loading...' : (currentFolderName || 'All Folders (Whole Project)')}
                    </span>
                </div>
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-72 max-h-96 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1 right-0 sm:left-0">
                    <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/50 mb-1">
                        Select Metric Scope
                    </div>

                    <button
                        onClick={() => handleSelectFolder('', '')}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-700 flex items-center gap-2 ${!currentFolderId ? 'text-brand-primary bg-slate-700/50' : 'text-slate-300'}`}
                    >
                        <Filter size={14} />
                        All Folders (Whole Project)
                    </button>

                    {folders.map(f => (
                        <button
                            key={f.id}
                            onClick={() => handleSelectFolder(f.id, f.name)}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-700 block truncate ${currentFolderId === f.id ? 'text-brand-primary bg-slate-700/50 pr-4' : 'text-slate-300'}`}
                        >
                            <span className="w-1 h-1 inline-block rounded-full bg-current opacity-50 mr-2 mb-[2px]"></span>
                            <span className="truncate inline-block align-bottom max-w-[230px]" title={f.name}>{f.name}</span>
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
