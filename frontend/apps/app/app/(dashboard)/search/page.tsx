'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { search, getFileUrl } from '@dmt/api';
import { ArrowLeft, Search as SearchIcon, FileText, Download, Eye } from 'lucide-react';
import { getFileViewerUrl } from '@/lib/utils';
import toast, { Toaster } from 'react-hot-toast';

interface SearchResultDoc {
    id: string;
    title?: string;
    file: string;
    type?: string;
}

function SearchResults() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get('q') || '';
    const limitParam = searchParams.get('limit');
    const parsedLimit = limitParam && !isNaN(parseInt(limitParam, 10)) ? parseInt(limitParam, 10) : undefined;
    const limit = parsedLimit !== undefined ? Math.min(parsedLimit, 1000) : undefined;
    
    const [filteredDocs, setFilteredDocs] = useState<SearchResultDoc[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let ignore = false;
        const fetchSearchResults = async () => {
            if (!query.trim()) {
                setFilteredDocs([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const response = await search.query(query, limit);
                if (!ignore) {
                    if (response && response.results) {
                        setFilteredDocs(response.results);
                    } else {
                        setFilteredDocs([]);
                    }
                }
            } catch (err) {
                if (!ignore) {
                    console.error('Failed to fetch search results:', err);
                    toast.error('Failed to fetch search results. Please try again.');
                    setFilteredDocs([]);
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };
        fetchSearchResults();
        return () => {
            ignore = true;
        };
    }, [query, limit]);

    const getFileName = (url: string) => {
        if (!url) return '';
        const cleanUrl = url.split(/[?#]/)[0];
        const parts = cleanUrl.split('/');
        return decodeURIComponent(parts[parts.length - 1]);
    };



    const handleDownloadClick = (url: string, filename: string, e: React.MouseEvent) => {
        e.preventDefault();
        const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
        window.location.href = proxyUrl;
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-muted text-foreground transition-colors border border-border bg-card shadow-sm flex items-center justify-center shrink-0"
                >
                    <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                </button>
                
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <SearchIcon className="w-7 h-7 text-primary" strokeWidth={2.5} />
                        <h1 className="text-[1.75rem] font-[900] text-accent tracking-tight leading-none">
                            Search Results
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-[0.875rem] font-medium">
                        Showing results for &quot;{query}&quot;
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                    <p className="text-muted-foreground font-semibold text-sm mt-3">Searching documents...</p>
                </div>
            ) : filteredDocs.length > 0 ? (
                <div className="space-y-6">
                    {filteredDocs.map((doc, idx) => {
                        const fileName = doc.title || getFileName(doc.file);
                        const displayType = doc.type?.replace(/_/g, ' ').replace(/\bdocument\b/gi, '').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'File';
                        return (
                            <div
                                key={`${doc.type}-${doc.id}-${idx}`}
                                className="relative bg-card text-card-foreground rounded-2xl border border-border hover:border-primary/45 p-6 flex flex-col gap-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.05)] transition-all duration-300 border-l-4 border-l-primary"
                            >
                                <div className="absolute top-5 right-5 flex items-center gap-2">
                                    <span className="text-xs font-bold bg-muted text-muted-foreground px-2 py-1 rounded-md uppercase tracking-wider">
                                        {displayType}
                                    </span>
                                    <a
                                        href={getFileUrl(doc.file)}
                                        onClick={(e) => handleDownloadClick(getFileUrl(doc.file), fileName, e)}
                                        className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                        title="Download document"
                                    >
                                        <Download className="w-5 h-5" />
                                    </a>
                                </div>

                                <div className="flex gap-4 items-start pr-32">
                                    <div className="p-3.5 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
                                        <FileText className="w-7 h-7" strokeWidth={2.2} />
                                    </div>
                                    <div className="space-y-1.5 min-w-0">
                                        <h3 className="text-[1.125rem] font-[900] text-accent truncate">
                                            {fileName.replace(/\.[^/.]+$/, "")} 
                                        </h3>
                                       
                                    </div>
                                </div>

                                <div className="flex mt-1">
                                    <a
                                        href={getFileViewerUrl(getFileUrl(doc.file))}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[0.875rem] font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm active:scale-95"
                                    >
                                        <Eye className="w-4.5 h-4.5" strokeWidth={2.5} />
                                        View Document
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-center p-12 bg-card text-card-foreground rounded-2xl border border-border shadow-sm min-h-[22rem]">
                    <SearchIcon className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-[1.125rem] font-bold text-foreground">No documents found</h3>
                    <p className="text-muted-foreground text-[0.875rem] max-w-sm mt-2">
                        We couldn&apos;t find any documents starting with &quot;{query}&quot;.
                    </p>
                </div>
            )}
        </div>
    );
}

export default function SearchPage() {
    return (
        <main className="bg-background text-foreground min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 font-sans">
            <Toaster position="top-center" />
            <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>}>
                <SearchResults />
            </Suspense>
        </main>
    );
}
