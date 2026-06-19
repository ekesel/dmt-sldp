'use client';

import React, { useRef } from 'react';
import { getFileUrl } from '@dmt/api';
import { FileText, Download, Upload, Trash2, ArrowLeft, Plus, ShieldAlert, FileCheck, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { policiesQueryOptions } from './query-options';
import { getUploadMutationOptions, getUpdateMutationOptions, getDeleteMutationOptions } from './mutation-options';
import { getFileViewerUrl } from '@/lib/utils';

interface PolicyData {
    id: number;
    policy_file: string;
}

export default function PoliciesPage() {
    const router = useRouter();
    const { isManager } = usePermissions();
    const queryClient = useQueryClient();
    
    // Hidden file inputs
    const createFileInputRef = useRef<HTMLInputElement>(null);
    const updateFileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

    // Fetch Policies using React Query
    const { data: policies = [], isLoading: loading } = useQuery(policiesQueryOptions);

    const uploadMutation = useMutation(getUploadMutationOptions(queryClient));

    const updateMutation = useMutation(getUpdateMutationOptions(queryClient));

    const deleteMutation = useMutation(getDeleteMutationOptions(queryClient));

    // Extract filename from URL
    const getFileName = (url: string) => {
        if (!url) return 'Policy_Document.pdf';
        const parts = url.split('/');
        return decodeURIComponent(parts[parts.length - 1]);
    };



    // Handle Uploading a new policy
    const handleUploadClick = () => {
        createFileInputRef.current?.click();
    };

    const handleCreateFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading('Uploading new policy...');
        try {
            const formData = new FormData();
            formData.append('policy_file', file);
            await uploadMutation.mutateAsync(formData);
            toast.success('Policy uploaded successfully!', { id: toastId });
        } catch (err: any) {
            console.error('Upload failed:', err);
            let errorMessage = 'Failed to upload policy.';
            if (err?.status === 413 || err?.message?.includes('413') || err?.message?.toLowerCase().includes('too large')) {
                errorMessage = 'File is too large. Please upload a smaller file.';
            } else if (err?.message && err.message !== 'Unknown API error') {
                errorMessage = err.message;
            }
            toast.error(errorMessage, { id: toastId });
        } finally {
            if (createFileInputRef.current) createFileInputRef.current.value = '';
        }
    };

    // Handle Updating an existing policy
    const handleUpdateClick = (id: number) => {
        updateFileInputRefs.current[id]?.click();
    };

    const handleUpdateFileChange = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading('Updating policy document...');
        try {
            const formData = new FormData();
            formData.append('policy_file', file);
            await updateMutation.mutateAsync({ id, formData });
            toast.success('Policy updated successfully!', { id: toastId });
        } catch (err: any) {
            console.error('Update failed:', err);
            let errorMessage = 'Failed to update policy.';
            if (err?.status === 413 || err?.message?.includes('413') || err?.message?.toLowerCase().includes('too large')) {
                errorMessage = 'File is too large. Please upload a smaller file.';
            } else if (err?.message && err.message !== 'Unknown API error') {
                errorMessage = err.message;
            }
            toast.error(errorMessage, { id: toastId });
        } finally {
            if (updateFileInputRefs.current[id]) {
                updateFileInputRefs.current[id]!.value = '';
            }
        }
    };

    // Handle Deleting a policy
    const handleDeleteClick = async (id: number) => {
        if (!confirm('Are you sure you want to delete this policy document?')) return;

        const toastId = toast.loading('Deleting policy document...');
        try {
            await deleteMutation.mutateAsync(id);
            toast.success('Policy deleted successfully!', { id: toastId });
        } catch (err) {
            console.error('Delete failed:', err);
            toast.error('Failed to delete policy.', { id: toastId });
        }
    };

    // Handle Direct Download using proxy to prevent tab changes
    const handleDownloadClick = (url: string, filename: string, e: React.MouseEvent) => {
        e.preventDefault();
        const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
        // Navigating to the proxy URL will trigger a download without changing the page,
        // because the proxy sets the Content-Disposition: attachment header.
        window.location.href = proxyUrl;
    };

    return (
        <main className="bg-background text-foreground min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 font-sans">
            <Toaster position="top-center" reverseOrder={false} />
            <div className="max-w-5xl mx-auto space-y-8">
                
                {/* Header section matching reference image layout */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        {/* Go Back button */}
                        <button
                            onClick={() => router.push('/home')}
                            className="mt-1 p-2 rounded-full hover:bg-muted text-foreground transition-colors border border-border bg-card shadow-sm flex items-center justify-center cursor-pointer shrink-0"
                            aria-label="Go back to Home"
                        >
                            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                        
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                {/* Custom Icon */}
                                <FileCheck className="w-7 h-7 text-primary" strokeWidth={2.5} />
                                <h1 className="text-[1.75rem] font-[900] text-accent tracking-tight leading-none">
                                    Company Policies
                                </h1>
                            </div>
                            <p className="text-muted-foreground text-[0.875rem] font-medium leading-normal">
                                View and Download official policy documents of organization.
                            </p>
                        </div>
                    </div>

                    {/* Upload button on the right - restricted to MANAGER only */}
                    {isManager && (
                        <button
                            onClick={handleUploadClick}
                            disabled={uploadMutation.isPending}
                            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-[0.875rem] font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                            <Plus className="w-5 h-5" strokeWidth={3} />
                            Upload New Policy
                        </button>
                    )}
                    
                    {/* Hidden inputs for uploading */}
                    <input
                        type="file"
                        ref={createFileInputRef}
                        onChange={handleCreateFileChange}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        className="hidden"
                    />
                </div>

                {/* Policies List container */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                        <p className="text-muted-foreground font-semibold text-sm mt-3">Loading policies...</p>
                    </div>
                ) : policies.length > 0 ? (
                    <div className="space-y-6">
                        {policies.map((policy) => {
                            const fileName = getFileName(policy.policy_file);
                            return (
                                <div
                                    key={policy.id}
                                    className="relative bg-card text-card-foreground rounded-2xl border border-border hover:border-primary/45 p-6 flex flex-col gap-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.05)] transition-all duration-300 border-l-4 border-l-primary"
                                >
                                    {/* Top right actions (Download & Delete) */}
                                    <div className="absolute top-5 right-5 flex items-center gap-2">
                                        <a
                                            href={getFileUrl(policy.policy_file)}
                                            onClick={(e) => handleDownloadClick(getFileUrl(policy.policy_file), getFileName(policy.policy_file), e)}
                                            download={getFileName(policy.policy_file)}
                                            className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                            title="Download policy"
                                        >
                                            <Download className="w-5 h-5" />
                                        </a>
                                        {isManager && (
                                            <button
                                                onClick={() => handleDeleteClick(policy.id)}
                                                className="p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                                title="Delete policy"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Main Card Content */}
                                    <div className="flex gap-4 items-start pr-8">
                                        {/* Light blue icon box */}
                                        <div className="p-3.5 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
                                            <FileText className="w-7 h-7" strokeWidth={2.2} />
                                        </div>
                                        
                                        <div className="space-y-1.5 min-w-0">
                                            <h3 className="text-[1.125rem] font-[900] text-accent truncate pr-2">
                                                {fileName.replace(/\.[^/.]+$/, "")}
                                            </h3>
                                            <p className="text-[0.875rem] text-muted-foreground font-medium leading-relaxed">
                                                Official policy document. Click below to view or download the PDF document.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Bottom row actions (Download PDF & Update PDF side by side) */}
                                    <div className="flex flex-col sm:flex-row gap-3 mt-1">
                                        <a
                                            href={getFileViewerUrl(getFileUrl(policy.policy_file))}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[0.875rem] font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm cursor-pointer active:scale-95"
                                        >
                                            <Eye className="w-4.5 h-4.5" strokeWidth={2.5} />
                                            View Document
                                        </a>
                                        
                                        {/* Update Button - restricted to MANAGER only */}
                                        {isManager && (
                                            <button
                                                onClick={() => handleUpdateClick(policy.id)}
                                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[0.875rem] font-bold bg-accent hover:bg-accent/90 text-accent-foreground transition-all shadow-sm cursor-pointer active:scale-95"
                                            >
                                                <Upload className="w-4.5 h-4.5" strokeWidth={2.5} />
                                                Update PDF
                                            </button>
                                        )}

                                        {/* Hidden inputs for updating */}
                                        <input
                                            type="file"
                                            ref={(el) => { updateFileInputRefs.current[policy.id] = el; }}
                                            onChange={(e) => handleUpdateFileChange(policy.id, e)}
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                            className="hidden"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center p-12 bg-card text-card-foreground rounded-2xl border border-border shadow-sm min-h-[22rem]">
                        <div className="p-4 bg-muted rounded-full text-muted-foreground mb-4 border border-border">
                            <ShieldAlert className="w-12 h-12" />
                        </div>
                        <h3 className="text-[1.125rem] font-bold text-foreground">No Policies Uploaded</h3>
                        <p className="text-muted-foreground text-[0.875rem] max-w-sm mt-2 font-medium leading-normal">
                            {isManager 
                                ? 'Get started by uploading your first official company policy document of organization!' 
                                : 'There are currently no official company policy documents uploaded by management.'
                            }
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
