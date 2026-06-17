'use client';

import React, { useEffect, useState, useRef } from 'react';
import { dashboard, getFileUrl } from '@dmt/api';
import { Rocket, Download, Upload, Trash2, ArrowLeft, Plus, ShieldAlert, FileText, X, AlertCircle, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOnboardingQuery } from './query-options';
import { useUploadOnboarding, useUpdateOnboarding, useDeleteOnboarding } from './mutation-options';
import toast, { Toaster } from 'react-hot-toast';
import { usePermissions } from '@/hooks/usePermissions';

export default function OnboardingPage() {
    const router = useRouter();
    const { isManager } = usePermissions();
    
    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'create' | 'update'>('create');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [titleInput, setTitleInput] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Queries & Mutations
    const { data: guides = [], isLoading: loading, isError } = useOnboardingQuery();
    const uploadMutation = useUploadOnboarding();
    const updateMutation = useUpdateOnboarding();
    const deleteMutation = useDeleteOnboarding();

    useEffect(() => {
        if (isError) {
            toast.error('Failed to load onboarding resources');
        }
    }, [isError]);

    // Extract filename from URL
    const getFileName = (url: string) => {
        if (!url) return 'Onboarding_Guide.pdf';
        const parts = url.split('/');
        return decodeURIComponent(parts[parts.length - 1]);
    };

    // Helper to format URL for Office Viewer if it's a Word/Excel/PPT file
    const getFileViewerUrl = (url: string) => {
        const baseUrl = url.split(/[?#]/)[0];
        const lowerUrl = baseUrl.toLowerCase();
        if (lowerUrl.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/)) {
            return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
        }
        return url;
    };

    // Handle Direct Download using proxy to prevent tab changes
    const handleDownloadClick = (url: string, filename: string, e: React.MouseEvent) => {
        e.preventDefault();
        const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
        window.location.href = proxyUrl;
    };

    // Open Modal for Upload (Create)
    const openCreateModal = () => {
        setModalType('create');
        setTitleInput('');
        setSelectedFile(null);
        setEditingId(null);
        setModalOpen(true);
    };

    // Open Modal for Update
    const openUpdateModal = (id: number, currentTitle?: string) => {
        setModalType('update');
        setTitleInput(currentTitle || '');
        setSelectedFile(null);
        setEditingId(id);
        setModalOpen(true);
    };

    // Handle form submit inside modal
    const handleModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!titleInput.trim()) {
            toast.error('Please enter a title');
            return;
        }

        if (modalType === 'create' && !selectedFile) {
            toast.error('Please select a file to upload');
            return;
        }

        setSubmitting(true);
        const toastId = toast.loading(
            modalType === 'create' 
                ? 'Uploading onboarding playbook...' 
                : 'Saving onboarding playbook changes...'
        );

        try {
            const formData = new FormData();
            formData.append('title', titleInput.trim());
            if (selectedFile) {
                formData.append('onboarding_file', selectedFile);
            }

            if (modalType === 'create') {
                await uploadMutation.mutateAsync(formData);
                toast.success('Onboarding document uploaded successfully!', { id: toastId });
            } else if (modalType === 'update' && editingId !== null) {
                await updateMutation.mutateAsync({ id: editingId, formData });
                toast.success('Onboarding document updated successfully!', { id: toastId });
            }

            setModalOpen(false);
        } catch (err: any) {
            console.error('Form submission failed:', err);
            let errorMessage = modalType === 'create'
                ? 'Failed to upload onboarding document.'
                : 'Failed to update onboarding document.';
            if (err?.status === 413 || err?.message?.includes('413') || err?.message?.toLowerCase().includes('too large')) {
                errorMessage = 'File is too large. Please upload a smaller file.';
            } else if (err?.message && err.message !== 'Unknown API error') {
                errorMessage = err.message;
            }
            toast.error(errorMessage, { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Deleting an onboarding document
    const handleDeleteClick = async (id: number) => {
        if (!confirm('Are you sure you want to delete this onboarding guide?')) return;

        const toastId = toast.loading('Deleting onboarding guide...');
        try {
            await deleteMutation.mutateAsync(id);
            toast.success('Onboarding guide deleted successfully!', { id: toastId });
        } catch (err) {
            console.error('Delete failed:', err);
            toast.error('Failed to delete onboarding guide.', { id: toastId });
        }
    };

    return (
        <main className="bg-background text-foreground min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 font-sans relative">
            <Toaster position="top-center" reverseOrder={false} />
            <div className="max-w-5xl mx-auto space-y-8">
                
                {/* Header section matching Policies custom theme */}
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
                                <Rocket className="w-7 h-7 text-primary" strokeWidth={2.5} />
                                <h1 className="text-[1.75rem] font-[900] text-accent tracking-tight leading-none">
                                    Employee Onboarding
                                </h1>
                            </div>
                            <p className="text-muted-foreground text-[0.875rem] font-medium leading-normal">
                                Welcome to the team! View and download official welcome playbooks, handbooks, and setup blueprints.
                            </p>
                        </div>
                    </div>

                    {/* Upload button on the right - restricted to MANAGER only */}
                    {isManager && (
                        <button
                            onClick={openCreateModal}
                            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-[0.875rem] font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer shadow-md hover:shadow-lg shrink-0"
                        >
                            <Plus className="w-5 h-5" strokeWidth={3} />
                            Upload New Guide
                        </button>
                    )}
                </div>

                {/* Guides List container */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                        <p className="text-muted-foreground font-semibold text-sm mt-3">Loading onboarding resources...</p>
                    </div>
                ) : guides.length > 0 ? (
                    <div className="space-y-6">
                        {guides.map((guide) => (
                            <div
                                key={guide.id}
                                className="relative bg-card text-card-foreground rounded-2xl border border-border hover:border-primary/45 p-6 flex flex-col gap-6 shadow-[0_0.25rem_0.75rem_rgba(0,0,0,0.03)] hover:shadow-[0_0.375rem_1rem_rgba(0,0,0,0.05)] transition-all duration-300 border-l-4 border-l-primary"
                            >
                                {/* Top right actions (Download & Delete) */}
                                <div className="absolute top-5 right-5 flex items-center gap-2">
                                    <a
                                        href={getFileUrl(guide.onboarding_file)}
                                        onClick={(e) => handleDownloadClick(getFileUrl(guide.onboarding_file), getFileName(guide.onboarding_file), e)}
                                        download={getFileName(guide.onboarding_file)}
                                        className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                        title="Download guide"
                                    >
                                        <Download className="w-5 h-5" />
                                    </a>
                                    {isManager && (
                                        <button
                                            onClick={() => handleDeleteClick(guide.id)}
                                            className="p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                            title="Delete guide"
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
                                            {guide.title}
                                        </h3>
                                        <p className="text-[0.875rem] text-muted-foreground font-medium leading-relaxed">
                                            Official employee onboarding document. Click below to view or download the PDF document.
                                        </p>
                                    </div>
                                </div>

                                {/* Bottom row actions (Download PDF & Update PDF side by side) */}
                                <div className="flex flex-col sm:flex-row gap-3 mt-1">
                                    <a
                                        href={getFileViewerUrl(getFileUrl(guide.onboarding_file))}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[0.875rem] font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm cursor-pointer active:scale-95"
                                    >
                                        <Eye className="w-4.5 h-4.5" strokeWidth={2.5} />
                                        view document
                                    </a>
                                    
                                    {/* Update Button - restricted to MANAGER only */}
                                    {isManager && (
                                        <button
                                            onClick={() => openUpdateModal(guide.id, guide.title)}
                                            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[0.875rem] font-bold bg-accent hover:bg-accent/90 text-accent-foreground transition-all shadow-sm cursor-pointer active:scale-95"
                                        >
                                            <Upload className="w-4.5 h-4.5" strokeWidth={2.5} />
                                            Update PDF / Title
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center p-12 bg-card text-card-foreground rounded-2xl border border-border shadow-sm min-h-[22rem]">
                        <div className="p-4 bg-muted rounded-full text-muted-foreground mb-4 border border-border">
                            <ShieldAlert className="w-12 h-12" />
                        </div>
                        <h3 className="text-[1.125rem] font-bold text-foreground">No Guides Uploaded</h3>
                        <p className="text-muted-foreground text-[0.875rem] max-w-sm mt-2 font-medium leading-normal">
                            {isManager 
                                ? 'Get started by uploading your first official welcome playbook or setup guide!'
                                : 'There are currently no onboarding welcome guides uploaded by management.'
                            }
                        </p>
                    </div>
                )}
            </div>

            {/* PREMIUM MODAL POPUP FOR CREATING & UPDATING */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300">
                    <div className="bg-card rounded-[1.5rem] border border-border shadow-2xl w-full max-w-md overflow-hidden transform transition-all flex flex-col p-6 gap-5 relative animate-in fade-in zoom-in-95 duration-200">
                        
                        {/* Header Row */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-[1.25rem] font-[900] text-accent flex items-center gap-2">
                                <Rocket className="w-5.5 h-5.5 text-primary" />
                                {modalType === 'create' ? 'Upload Onboarding Guide' : 'Update Onboarding Guide'}
                            </h2>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                                title="Close modal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleModalSubmit} className="space-y-4">
                            {/* Input: Title */}
                            <div className="space-y-1.5">
                                <label className="text-[0.75rem] font-bold uppercase tracking-wider text-muted-foreground">
                                    Document Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Welcome Kit & Handbooks"
                                    value={titleInput}
                                    onChange={(e) => setTitleInput(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-semibold transition-all shadow-inner"
                                />
                            </div>

                            {/* Input: File */}
                            <div className="space-y-1.5">
                                <label className="text-[0.75rem] font-bold uppercase tracking-wider text-muted-foreground">
                                    File Attachment {modalType === 'update' && '(Optional)'}
                                </label>
                                
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    role="button"
                                    tabIndex={0}
                                    aria-label="Choose a document file to upload"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            fileInputRef.current?.click();
                                        }
                                    }}
                                    className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-primary/[0.02] flex flex-col items-center justify-center gap-2 group"
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                        className="hidden"
                                    />
                                    <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform duration-200">
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <p className="text-xs font-semibold text-foreground truncate max-w-full px-2">
                                        {selectedFile ? selectedFile.name : 'Click to select or drop document here'}
                                    </p>
                                    <p className="text-[0.6875rem] text-muted-foreground font-medium">
                                        Supports PDF, Word, Excel, PowerPoint
                                    </p>
                                </div>
                            </div>

                            {/* Warning notification block for update option */}
                            {modalType === 'update' && !selectedFile && (
                                <div className="flex gap-2 p-3.5 bg-accent/30 border border-accent/20 rounded-xl text-[0.75rem] font-medium text-accent-foreground items-start">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
                                    <span>If you do not select a new file, the currently uploaded file will remain unchanged and only the title will be updated.</span>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 pt-3 border-t border-border/80">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-sm font-bold transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                >
                                    {submitting && <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />}
                                    {modalType === 'create' ? 'Upload Guide' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
