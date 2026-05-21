'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { dashboard, getFileUrl } from '@dmt/api';
import { CalendarHeart, ArrowLeft, Plus, ShieldAlert, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { usePermissions } from '@/hooks/usePermissions';

interface EngagementData {
    id: number;
    employee_engagement_calendar_file: string;
}

export default function EngagementCalendarPage() {
    const router = useRouter();
    const { isManager } = usePermissions();
    const [calendars, setCalendars] = useState<EngagementData[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Hidden file inputs
    const createFileInputRef = useRef<HTMLInputElement>(null);

    const fetchCalendars = useCallback(async () => {
        setLoading(true);
        try {
            const data = await dashboard.getEmployeeEngagements();
            if (data && Array.isArray(data)) {
                // Sort by ID descending so that the latest uploaded document appears at the top
                const sorted = [...data].sort((a, b) => b.id - a.id);
                setCalendars(sorted);
            }
        } catch (err) {
            console.error('Failed to fetch engagement calendar:', err);
            toast.error('Failed to load engagement calendar');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCalendars();
    }, [fetchCalendars]);

    // Extract filename from URL
    const getFileName = (url: string) => {
        if (!url) return 'Engagement_Calendar.pdf';
        const parts = url.split('/');
        return decodeURIComponent(parts[parts.length - 1]);
    };

    // Handle Uploading a new calendar
    const handleUploadClick = () => {
        createFileInputRef.current?.click();
    };

    const handleCreateFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const toastId = toast.loading('Uploading engagement calendar...');
        try {
            const formData = new FormData();
            formData.append('employee_engagement_calendar_file', file);
            await dashboard.uploadEmployeeEngagement(formData);
            toast.success('Engagement calendar uploaded successfully!', { id: toastId });
            fetchCalendars();
        } catch (err) {
            console.error('Upload failed:', err);
            toast.error('Failed to upload engagement calendar.', { id: toastId });
        } finally {
            setUploading(false);
            if (createFileInputRef.current) createFileInputRef.current.value = '';
        }
    };

    return (
        <main className="bg-background text-foreground min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 font-sans">
            <Toaster position="top-center" reverseOrder={false} />
            <div className="max-w-6xl mx-auto space-y-8">

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
                                <CalendarHeart className="w-7 h-7 text-primary" strokeWidth={2.5} />
                                <h1 className="text-[1.75rem] font-[900] text-accent tracking-tight leading-none">
                                    Engagement Calendar
                                </h1>
                            </div>
                            <p className="text-muted-foreground text-[0.875rem] font-medium leading-normal">
                                Stay updated with the latest employee engagement activities and events.
                            </p>
                        </div>
                    </div>

                    {/* Upload button on the right - restricted to MANAGER only */}
                    {isManager && (
                        <button
                            onClick={handleUploadClick}
                            disabled={uploading}
                            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-[0.875rem] font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shrink-0"
                        >
                            {uploading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Plus className="w-5 h-5" strokeWidth={3} />
                            )}
                            Upload New Calendar
                        </button>
                    )}

                    {/* Hidden inputs for uploading */}
                    <input
                        type="file"
                        ref={createFileInputRef}
                        onChange={handleCreateFileChange}
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                    />
                </div>

                {/* Calendar Viewer container */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                        <p className="text-muted-foreground font-semibold text-sm mt-3">Loading calendar...</p>
                    </div>
                ) : calendars.length > 0 ? (
                    <div className="space-y-6">
                        {calendars.map((calendar) => {
                            const fileName = getFileName(calendar.employee_engagement_calendar_file);
                            const fileUrl = getFileUrl(calendar.employee_engagement_calendar_file);
                            const isImage = fileUrl.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/) !== null;
                            return (
                                <div
                                    key={calendar.id}
                                    className="relative bg-card text-card-foreground rounded-2xl border border-border hover:border-primary/45 p-6 flex flex-col gap-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.05)] transition-all duration-300 border-l-4 border-l-primary"
                                >
                                    {/* Main Card Content */}
                                    <div className="flex gap-4 items-start pr-8">
                                        {/* Light blue icon box */}
                                        <div className="p-3.5 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
                                            <CalendarHeart className="w-7 h-7" strokeWidth={2.2} />
                                        </div>
                                        
                                        <div className="space-y-1.5 min-w-0 flex-1">
                                            <h3 className="text-[1.125rem] font-[900] text-accent truncate pr-2">
                                                {fileName}
                                            </h3>
                                            <p className="text-[0.875rem] text-muted-foreground font-medium leading-relaxed">
                                                Official employee engagement events and activities calendar. View the embedded document below or open it directly.
                                            </p>
                                        </div>
                                    </div>

                                    {/* PDF or Image Preview Frame */}
                                    {isImage ? (
                                        <div className="w-full flex items-center justify-center mt-2 overflow-hidden rounded-xl">
                                            <img
                                                src={fileUrl}
                                                className="w-full h-auto object-contain rounded-xl"
                                                alt="Engagement Calendar"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full overflow-hidden rounded-xl bg-muted border border-border/80 relative min-h-[400px] mt-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] flex items-center justify-center">
                                            <iframe
                                                src={`${fileUrl}#view=FitH&toolbar=0`}
                                                className="w-full h-[600px] md:h-[750px] border-0 rounded-xl"
                                                title="Engagement Calendar PDF Viewer"
                                            />
                                        </div>
                                    )}

                                    {/* Bottom row actions (Download PDF) */}
                                    <div className="flex flex-col sm:flex-row gap-3 mt-1">
                                        <a
                                            href={fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[0.875rem] font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm cursor-pointer active:scale-95"
                                        >
                                            <CalendarHeart className="w-4.5 h-4.5" strokeWidth={2.5} />
                                            View / Download Calendar PDF
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center p-12 bg-card text-card-foreground rounded-2xl border border-border shadow-sm min-h-[22rem]">
                        <div className="p-4 bg-primary/10 rounded-full text-primary mb-4 border border-primary/20 animate-pulse">
                            <CalendarHeart className="w-12 h-12" />
                        </div>
                        <h3 className="text-[1.125rem] font-bold text-foreground">No Engagement Calendar Uploaded</h3>
                        <p className="text-muted-foreground text-[0.875rem] max-w-sm mt-2 font-medium leading-normal">
                            {isManager
                                ? 'Get started by uploading the first official employee engagement activities & events calendar!'
                                : 'There are currently no employee engagement calendars uploaded by management.'
                            }
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
