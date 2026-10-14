'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { dashboard, getFileUrl, getCache } from '@dmt/api';

export interface Performer {
    name: string;
    role: string;
    message: string;
    rating: number;
    avatar: string;
}

export interface RawPerformerPayload {
    name?: string;
    title?: string;
    reason?: string;
    score?: number | string | null;
    avatar?: string | null;
    [key: string]: unknown;
}

export interface StarPerformerApiResponse {
    message?: string;
    top_performers?: Record<string, RawPerformerPayload | RawPerformerPayload[] | null | undefined>;
    [key: string]: unknown;
}

interface StarPerformerProps {
    performers?: Performer[];
}

export const parseStarPerformers = (data?: StarPerformerApiResponse | null): Performer[] => {
    if (!data || !data.top_performers) {
        return [];
    }

    const performerList: RawPerformerPayload[] = [];
    for (const val of Object.values(data.top_performers)) {
        if (val !== null && val !== undefined) {
            const p = Array.isArray(val) ? val[0] : val;
            if (p) {
                performerList.push(p);
            }
        }
    }

    const rawVals: number[] = performerList
        .map((p) => {
            if (p.score !== undefined && p.score !== null) {
                return Number(p.score);
            }
            return NaN;
        })
        .filter((n) => Number.isFinite(n));

    const scoreMin = rawVals.length > 0 ? Math.min(...rawVals) : 0;
    const scoreMax = rawVals.length > 0 ? Math.max(...rawVals) : 1;

    return performerList
        .map((p) => {
            const RATING_MIN = 4;
            const RATING_MAX = 5;
            const DEFAULT_RATING = 4.5;
            let rating = DEFAULT_RATING;

            if (p.score !== undefined && p.score !== null) {
                const valScore = Number(p.score);
                if (Number.isFinite(valScore)) {
                    const range = scoreMax - scoreMin;
                    const normalized = range > 0
                        ? (valScore - scoreMin) / range
                        : 0.5;
                    rating = RATING_MIN + normalized * (RATING_MAX - RATING_MIN);
                    rating = Math.min(RATING_MAX, Math.max(RATING_MIN, rating));
                }
            }

            const performerName = p.name || 'Performer';
            let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(performerName)}&background=0D8ABC&color=fff&size=128&bold=true`;

            if (p.avatar) {
                try {
                    avatarUrl = typeof getFileUrl === 'function' ? getFileUrl(p.avatar) : p.avatar;
                } catch {
                    avatarUrl = p.avatar;
                }
            }

            return {
                name: performerName,
                role: p.title || 'Top Performer',
                message: p.reason || 'Outstanding performance',
                rating,
                avatar: avatarUrl,
            };
        });
};

const CACHE_STORAGE_KEY = 'dmt_star_performers_cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache for instant rendering across logins

let memoryCache: Performer[] | null = null;
let memoryTimestamp = 0;
let memoryTenant: string | null = null;

const getTenantSlug = (): string => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('dmt-tenant') || 'default';
    }
    return 'default';
};

export const getCachedPerformers = (): Performer[] | null => {
    const currentTenant = getTenantSlug();

    // 1. Check in-memory performer cache
    if (
        memoryCache &&
        memoryCache.length > 0 &&
        Date.now() - memoryTimestamp < CACHE_TTL_MS &&
        (!memoryTenant || memoryTenant === currentTenant || currentTenant === 'default')
    ) {
        return memoryCache;
    }

    // 2. Check localStorage persistent cache
    if (typeof window !== 'undefined') {
        try {
            const raw = localStorage.getItem(CACHE_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.performers) && parsed.performers.length > 0) {
                    const isTenantValid = !parsed.tenant || parsed.tenant === currentTenant || currentTenant === 'default';
                    if (isTenantValid && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
                        memoryCache = parsed.performers;
                        memoryTimestamp = parsed.timestamp;
                        memoryTenant = parsed.tenant || currentTenant;
                        return parsed.performers;
                    }
                }
            }
        } catch {
            // Ignore storage parse errors
        }
    }

    // 3. Fallback: check in-memory API cache from @dmt/api if pre-warmed
    try {
        const apiCached = getCache<StarPerformerApiResponse>('/homepage/star-performer/?{}');
        if (apiCached) {
            const parsed = parseStarPerformers(apiCached);
            if (parsed && parsed.length > 0) {
                setCachedPerformers(parsed);
                return parsed;
            }
        }
    } catch {
        // Ignore API cache errors
    }

    return null;
};

export const setCachedPerformers = (performers: Performer[]) => {
    const tenant = getTenantSlug();
    memoryCache = performers;
    memoryTimestamp = Date.now();
    memoryTenant = tenant;
    if (typeof window !== 'undefined') {
        try {
            if (performers && performers.length > 0) {
                localStorage.setItem(
                    CACHE_STORAGE_KEY,
                    JSON.stringify({ timestamp: memoryTimestamp, tenant, performers })
                );
            } else {
                localStorage.removeItem(CACHE_STORAGE_KEY);
            }
        } catch {
            // Ignore storage quota errors
        }
    }
};

export const resetStarPerformersCache = () => {
    memoryCache = null;
    memoryTimestamp = 0;
    memoryTenant = null;
    if (typeof window !== 'undefined') {
        try {
            localStorage.removeItem(CACHE_STORAGE_KEY);
        } catch {
            // Ignore storage errors
        }
    }
};

/**
 * StarPerformer component that matches the reference design.
 * Features a stable card shell, persistent client cache, instant mount across navigation switches and login,
 * and graceful avatar fallback handling.
 */
export const StarPerformer: React.FC<StarPerformerProps> = ({
    performers
}) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const isFirstMount = React.useRef(true);

    React.useEffect(() => {
        isFirstMount.current = false;
    }, []);

    // Initialise immediately from prop or persistent cache to eliminate rendering lag on navigation/login
    const initialPerformers = React.useMemo(() => {
        if (performers && performers.length > 0) {
            return performers;
        }
        const cached = getCachedPerformers();
        if (cached && cached.length > 0) {
            return cached;
        }
        return [];
    }, [performers]);

    const [apiPerformers, setApiPerformers] = React.useState<Performer[]>(initialPerformers);
    const [loading, setLoading] = React.useState<boolean>(
        (!performers || performers.length === 0) && initialPerformers.length === 0
    );
    const [avatarErrors, setAvatarErrors] = React.useState<Record<number, boolean>>({});

    React.useEffect(() => {
        // Skip network fetch entirely when performers are injected via props
        if (performers && performers.length > 0) {
            setLoading(false);
            return;
        }

        let isMounted = true;
        // Only trigger skeleton if we have no performers in cache
        if (apiPerformers.length === 0) {
            setLoading(true);
        }

        dashboard.getStarPerformer()
            .then((data) => {
                if (!isMounted) return;
                const mapped = parseStarPerformers(data as StarPerformerApiResponse);
                setCachedPerformers(mapped);
                setApiPerformers(mapped);
            })
            .catch((error) => {
                console.error('Failed to fetch star performers:', error);
            })
            .finally(() => {
                if (isMounted) {
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [performers]);

    // Resolve final data list
    const dataList = (performers && performers.length > 0)
        ? performers
        : apiPerformers;

    const nextSlide = () => {
        if (currentIndex < dataList.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    const prevSlide = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    React.useEffect(() => {
        if (dataList.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev === dataList.length - 1 ? 0 : prev + 1));
        }, 4000); // cycle every 4 seconds

        return () => clearInterval(timer);
    }, [dataList.length]);

    const currentPerformer = dataList[currentIndex];
    const isImageError = avatarErrors[currentIndex] ?? false;
    const isTrophyMuted = !loading && dataList.length === 0;

    return (
        <div className="bg-card rounded-[1.5rem] border border-border shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.05)] p-3 sm:px-4 sm:pt-3 sm:pb-2 w-full h-full md:min-h-[12rem] lg:min-h-[10.5rem] xl:min-h-[16.25rem] xl:max-h-[16.25rem] overflow-hidden flex flex-col">
            {/* Header Section - Stably rendered at all times to eliminate full card reflows */}
            <div className="flex justify-between items-start mb-1 sm:mb-1.5 flex-shrink-0">
                <div className="flex flex-col gap-1">
                    <h2 className="text-[1.125rem] sm:text-[1.25rem] md:text-[1.375rem] font-black text-card-foreground tracking-tight">
                        Star Performer
                    </h2>

                    {/* Navigation Controls */}
                    {dataList.length > 1 && (
                        <div className="flex gap-1.5">
                            <button
                                onClick={prevSlide}
                                disabled={currentIndex === 0}
                                className="p-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Previous performer"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={nextSlide}
                                disabled={currentIndex === dataList.length - 1}
                                className="p-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Next performer"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
                <div className={`relative w-12 h-12 sm:w-16 sm:h-16 -mr-1 -mt-1 transition-opacity duration-300 ${isTrophyMuted ? 'opacity-40' : 'opacity-100'}`}>
                    <Image
                        src="/assets/trophy.png"
                        alt="Trophy"
                        fill
                        className={`object-contain ${isTrophyMuted ? 'grayscale' : ''}`}
                        priority
                    />
                </div>
            </div>

            {/* Divider */}
            <div className="h-[0.0625rem] bg-border w-full mb-2 sm:mb-3" />

            {/* Body Section */}
            <div className="relative flex-1 flex items-center min-h-0">
                {loading && dataList.length === 0 ? (
                    /* Inner skeleton only when cold cache, preserving stable outer card shell */
                    <div className="flex gap-3 sm:gap-5 items-center w-full animate-pulse">
                        <div className="w-[4.5rem] h-[4.5rem] sm:w-[5.9375rem] sm:h-[5.9375rem] rounded-[1.125rem] bg-muted flex-shrink-0" />
                        <div className="flex flex-col justify-center py-0.5 flex-1 gap-2">
                            <div className="h-4 w-3/4 bg-muted rounded" />
                            <div className="h-3 w-1/2 bg-muted rounded" />
                            <div className="h-3 w-5/6 bg-muted rounded" />
                        </div>
                    </div>
                ) : dataList.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center flex-1 text-center py-2 px-4">
                        <p className="text-[0.875rem] font-bold text-muted-foreground mb-1">
                            No star performers yet
                        </p>
                        <p className="text-[0.75rem] sm:text-[0.8125rem] text-muted-foreground/70 font-medium max-w-[15rem] leading-snug">
                            Keep pushing boundaries to claim the trophy next month!
                        </p>
                    </div>
                ) : (
                    /* Performer Display with smooth transition and instant cached layout */
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div
                            key={currentIndex}
                            initial={isFirstMount.current ? false : { opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="flex gap-3 sm:gap-5 items-center w-full"
                        >
                            {/* Avatar */}
                            <div className="relative w-[4.5rem] h-[4.5rem] sm:w-[5.9375rem] sm:h-[5.9375rem] rounded-[1.125rem] overflow-hidden flex-shrink-0 shadow-sm border border-border bg-muted flex items-center justify-center">
                                {isImageError ? (
                                    <span className="text-xl sm:text-2xl font-bold text-primary select-none">
                                        {currentPerformer?.name?.charAt(0)?.toUpperCase() || '★'}
                                    </span>
                                ) : (
                                    <Image
                                        src={currentPerformer?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentPerformer?.name || 'Star')}&background=0D8ABC&color=fff&size=128&bold=true`}
                                        alt={currentPerformer?.name || 'Star Performer'}
                                        fill
                                        sizes="(max-width: 640px) 4.5rem, 5.9375rem"
                                        className="object-cover"
                                        unoptimized
                                        priority
                                        onError={() => {
                                            setAvatarErrors((prev) => ({ ...prev, [currentIndex]: true }));
                                        }}
                                    />
                                )}
                            </div>

                            <div className="flex flex-col justify-center py-0.5 min-w-0 flex-1">
                                <h3 className="text-[0.9375rem] sm:text-[1rem] font-bold text-card-foreground leading-tight mb-0.5 break-words">
                                    {currentPerformer?.name}
                                </h3>
                                <p className="text-[0.8125rem] sm:text-[0.875rem] font-bold text-muted-foreground/80 mb-1 leading-none">
                                    {currentPerformer?.role}
                                </p>
                                <p className="text-[0.75rem] sm:text-[0.8125rem] text-muted-foreground font-medium mb-1.5 sm:mb-2 leading-snug break-words">
                                    {currentPerformer?.message}
                                </p>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default StarPerformer;

