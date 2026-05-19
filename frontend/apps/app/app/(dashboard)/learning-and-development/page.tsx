'use client';

import React, { useEffect, useState, useRef } from 'react';
import { dashboard } from '@dmt/api';
import { GraduationCap, Download, Upload, Trash2, ArrowLeft, Plus, ShieldAlert, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { usePermissions } from '@/hooks/usePermissions';

interface LearningData {
    id: number;
    learning_and_development_file: string;
}

export default function LearningAndDevelopmentPage() {
    const router = useRouter();
    const { isManager } = usePermissions();
    const [courses, setCourses] = useState<LearningData[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Hidden file inputs
    const createFileInputRef = useRef<HTMLInputElement>(null);
    const updateFileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

    // Resolve absolute URL for the file to prevent routing to localhost frontend
    const getFileUrl = (path: string) => {
        if (!path) return '#';
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        
        let apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.elevate.samta.ai/api/';
        
        try {
            const urlObj = new URL(apiBase);
            
            if (typeof window !== 'undefined') {
                const hostname = window.location.hostname;
                const currentParts = hostname.split('.');
                const currentSubdomain = currentParts[0]; // e.g. "samta"
                
                // If it's a multi-tenant URL on the deployed server (e.g. *.elevate.samta.ai)
                if (urlObj.host.includes('elevate.samta.ai')) {
                    return `https://${currentSubdomain}.elevate.samta.ai${path}`;
                }
                
                // Local development
                const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
                if (isLocal) {
                    if (urlObj.host.includes('localhost') || urlObj.host.includes('127.0.0.1')) {
                        const backendPort = '8000';
                        return `${window.location.protocol}//${hostname}:${backendPort}${path}`;
                    } else {
                        // Hybrid: local frontend connected to deployed backend
                        return `https://${currentSubdomain}.elevate.samta.ai${path}`;
                    }
                }
                
                // Fallback to active window origin
                const cleanPort = window.location.port ? `:${window.location.port}` : '';
                return `${window.location.protocol}//${hostname}${cleanPort}${path}`;
            }
            
            const cleanHost = urlObj.host;
            return `${urlObj.protocol}//${cleanHost}${path}`;
        } catch (e) {
            return path;
        }
    };

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const data = await dashboard.getLearningAndDevelopment();
            if (data && Array.isArray(data)) {
                // Sort by ID descending so that the latest uploaded document appears at the top
                const sorted = [...data].sort((a, b) => b.id - a.id);
                setCourses(sorted);
            }
        } catch (err) {
            console.error('Failed to fetch learning materials:', err);
            toast.error('Failed to load learning resources');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    // Extract filename from URL
    const getFileName = (url: string) => {
        if (!url) return 'Training_Resource.pdf';
        const parts = url.split('/');
        return decodeURIComponent(parts[parts.length - 1]);
    };

    // Handle Uploading a new course resource
    const handleUploadClick = () => {
        createFileInputRef.current?.click();
    };

    const handleCreateFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const toastId = toast.loading('Uploading new resource...');
        try {
            const formData = new FormData();
            formData.append('learning_and_development_file', file);
            await dashboard.uploadLearningAndDevelopment(formData);
            toast.success('Resource uploaded successfully!', { id: toastId });
            fetchCourses();
        } catch (err) {
            console.error('Upload failed:', err);
            toast.error('Failed to upload resource.', { id: toastId });
        } finally {
            setUploading(false);
            if (createFileInputRef.current) createFileInputRef.current.value = '';
        }
    };

    // Handle Updating an existing course resource
    const handleUpdateClick = (id: number) => {
        updateFileInputRefs.current[id]?.click();
    };

    const handleUpdateFileChange = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading('Updating resource document...');
        try {
            const formData = new FormData();
            formData.append('learning_and_development_file', file);
            await dashboard.updateLearningAndDevelopment(id, formData);
            toast.success('Resource updated successfully!', { id: toastId });
            fetchCourses();
        } catch (err) {
            console.error('Update failed:', err);
            toast.error('Failed to update resource.', { id: toastId });
        } finally {
            if (updateFileInputRefs.current[id]) {
                updateFileInputRefs.current[id]!.value = '';
            }
        }
    };

    // Handle Deleting a resource
    const handleDeleteClick = async (id: number) => {
        if (!confirm('Are you sure you want to delete this resource?')) return;

        const toastId = toast.loading('Deleting resource...');
        try {
            await dashboard.deleteLearningAndDevelopment(id);
            toast.success('Resource deleted successfully!', { id: toastId });
            fetchCourses();
        } catch (err) {
            console.error('Delete failed:', err);
            toast.error('Failed to delete resource.', { id: toastId });
        }
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
                                <GraduationCap className="w-7 h-7 text-primary" strokeWidth={2.5} />
                                <h1 className="text-[1.75rem] font-[900] text-accent tracking-tight leading-none">
                                    Learning & Development
                                </h1>
                            </div>
                            <p className="text-muted-foreground text-[0.875rem] font-medium leading-normal">
                                View and download official training guides, technical specifications, and resources of organization.
                            </p>
                        </div>
                    </div>

                    {/* Upload button on the right - restricted to MANAGER only */}
                    {isManager && (
                        <button
                            onClick={handleUploadClick}
                            disabled={uploading}
                            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-[0.875rem] font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                            <Plus className="w-5 h-5" strokeWidth={3} />
                            Upload New Material
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

                {/* Courses List container */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                        <p className="text-muted-foreground font-semibold text-sm mt-3">Loading resources...</p>
                    </div>
                ) : courses.length > 0 ? (
                    <div className="space-y-6">
                        {courses.map((course) => {
                            const fileName = getFileName(course.learning_and_development_file);
                            return (
                                <div
                                    key={course.id}
                                    className="relative bg-card text-card-foreground rounded-2xl border border-border hover:border-primary/45 p-6 flex flex-col gap-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.05)] transition-all duration-300 border-l-4 border-l-primary"
                                >
                                    {/* Top right actions (Delete) - restricted to MANAGER only */}
                                    {isManager && (
                                        <button
                                            onClick={() => handleDeleteClick(course.id)}
                                            className="absolute top-5 right-5 p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                            title="Delete resource"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}

                                    {/* Main Card Content */}
                                    <div className="flex gap-4 items-start pr-8">
                                        {/* Light blue icon box */}
                                        <div className="p-3.5 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
                                            <FileText className="w-7 h-7" strokeWidth={2.2} />
                                        </div>
                                        
                                        <div className="space-y-1.5 min-w-0">
                                            <h3 className="text-[1.125rem] font-[900] text-accent truncate pr-2">
                                                {fileName}
                                            </h3>
                                            <p className="text-[0.875rem] text-muted-foreground font-medium leading-relaxed">
                                                Official training and guidelines document. Click below to view or download the PDF document.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Bottom row actions (Download PDF & Update PDF side by side) */}
                                    <div className="flex flex-col sm:flex-row gap-3 mt-1">
                                        <a
                                            href={getFileUrl(course.learning_and_development_file)}
                                            download
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[0.875rem] font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm cursor-pointer active:scale-95"
                                        >
                                            <Download className="w-4.5 h-4.5" strokeWidth={2.5} />
                                            view/download PDF
                                        </a>
                                        
                                        {/* Update Button - restricted to MANAGER only */}
                                        {isManager && (
                                            <button
                                                onClick={() => handleUpdateClick(course.id)}
                                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[0.875rem] font-bold bg-accent hover:bg-accent/90 text-accent-foreground transition-all shadow-sm cursor-pointer active:scale-95"
                                            >
                                                <Upload className="w-4.5 h-4.5" strokeWidth={2.5} />
                                                Update PDF
                                            </button>
                                        )}

                                        {/* Hidden inputs for updating */}
                                        <input
                                            type="file"
                                            ref={(el) => { updateFileInputRefs.current[course.id] = el; }}
                                            onChange={(e) => handleUpdateFileChange(course.id, e)}
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
                        <h3 className="text-[1.125rem] font-bold text-foreground">No Resources Uploaded</h3>
                        <p className="text-muted-foreground text-[0.875rem] max-w-sm mt-2 font-medium leading-normal">
                            {isManager 
                                ? 'Get started by uploading your first official training or tech guideline resource of organization!'
                                : 'There are currently no training or learning resources uploaded by management.'
                            }
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
