'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { dashboard } from '@dmt/api';
import { Loader2 } from 'lucide-react';

interface HighlightUser {
    name: string;
    type: string;
    avatar: string;
}

interface UpcomingCelebration {
    name: string;
    date: string;
    avatar: string;
}

interface BirthdayEvent {
    user: string;
    next_birthday?: string | null;
    days_left: number;
}

interface AnniversaryEvent {
    user: string;
    next_anniversary?: string | null;
    days_left: number;
    anniversary_count?: number | null;
}

interface DashboardEventsResponse {
    today_birthdays?: BirthdayEvent[] | null;
    today_anniversaries?: AnniversaryEvent[] | null;
    upcoming_birthdays?: BirthdayEvent[] | null;
    upcoming_anniversaries?: AnniversaryEvent[] | null;
}

export const CelebrationsCard: React.FC = () => {
    const [highlightUsers, setHighlightUsers] = useState<HighlightUser[]>([]);
    const [upcoming, setUpcoming] = useState<UpcomingCelebration[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const getInitialsAvatar = (name: string) => {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128&bold=true`;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const dateObj = new Date(dateStr);
            return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    };

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setErrorMessage(null);

        try {
            const res = (await dashboard.getEvents()) as DashboardEventsResponse | null | undefined;
            if (res) {
                // 1. Process today's celebrations
                const todayBirthdays = res.today_birthdays || [];
                const todayAnniversaries = res.today_anniversaries || [];

                const todayCelebrations: HighlightUser[] = [
                    ...todayBirthdays.map((b) => ({
                        name: b.user,
                        type: 'Birthday 🎂',
                        avatar: getInitialsAvatar(b.user)
                    })),
                    ...todayAnniversaries.map((a) => ({
                        name: a.user,
                        type: `${a.anniversary_count || 1} Year Work Anniversary 🎉`,
                        avatar: getInitialsAvatar(a.user)
                    }))
                ];

                if (todayCelebrations.length === 0) {
                    // Fallback slide when no celebrations today
                    todayCelebrations.push({
                        name: 'No Celebrations Today',
                        type: 'Stay tuned for upcoming events! ✨',
                        avatar: 'https://ui-avatars.com/api/?name=DMT&background=0D8ABC&color=fff&size=128&bold=true'
                    });
                }
                setHighlightUsers(todayCelebrations);
                setCurrentIndex(0);

                // 2. Process upcoming list, combine and sort by days_left
                const upcomingBirthdays = (res.upcoming_birthdays || []).map((b) => ({
                    name: b.user,
                    date: formatDate(b.next_birthday ?? ''),
                    days_left: b.days_left,
                    avatar: getInitialsAvatar(b.user)
                }));

                const upcomingAnniversaries = (res.upcoming_anniversaries || []).map((a) => ({
                    name: a.user,
                    date: formatDate(a.next_anniversary ?? ''),
                    days_left: a.days_left,
                    avatar: getInitialsAvatar(a.user)
                }));

                const combinedUpcoming = [...upcomingBirthdays, ...upcomingAnniversaries]
                    .sort((a, b) => a.days_left - b.days_left)
                    .slice(0, 3); // Display top 3 upcoming

                setUpcoming(combinedUpcoming);
            }
        } catch (err) {
            console.error('Failed to load events celebrations:', err);
            setHighlightUsers([]);
            setUpcoming([]);
            setCurrentIndex(0);
            setErrorMessage('Couldn’t load celebrations right now. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const nextSlide = () => {
        if (currentIndex < highlightUsers.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    const prevSlide = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    useEffect(() => {
        if (highlightUsers.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev === highlightUsers.length - 1 ? 0 : prev + 1));
        }, 4000); // cycles every 4 seconds

        return () => clearInterval(timer);
    }, [highlightUsers.length]);

    if (loading) {
        return (
            <div className="bg-card rounded-[1.5rem] border border-border shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.05)] w-full h-[20rem] overflow-hidden flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground font-semibold text-sm mt-3">Loading Celebrations...</p>
            </div>
        );
    }

    if (errorMessage) {
        return (
            <div className="bg-card rounded-[1.5rem] border border-border shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.05)] w-full h-[20rem] overflow-hidden flex flex-col items-center justify-center px-6 text-center">
                <p className="text-card-foreground font-semibold text-sm">{errorMessage}</p>
                <button
                    type="button"
                    onClick={fetchEvents}
                    className="mt-4 inline-flex items-center justify-center rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-semibold text-card-foreground hover:bg-muted transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!highlightUsers || highlightUsers.length === 0) {
        return null;
    }

    const safeIndex = Math.max(0, Math.min(currentIndex, highlightUsers.length - 1));
    const currentUser = highlightUsers[safeIndex] || null;

    if (!currentUser) {
        return null;
    }

    return (
        <div className="bg-card rounded-[1.5rem] border border-border shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.05)] w-full h-full xl:max-h-[20rem] overflow-hidden flex flex-col">
            {/* Festive Header Section */}
            <div className="relative h-[5.5rem] sm:h-[6.25rem] w-full flex flex-col items-center justify-start flex-shrink-0">
                {/* Background Illustration */}
                <div className="absolute inset-0 z-0 opacity-100">
                    <Image
                        src={currentUser.type && currentUser.type.includes("Anniversary") ? "/assets/celebrationani.png" : "/assets/celebration.png"}
                        alt="Festive Background"
                        fill
                        className="object-cover object-top"
                        priority
                    />
                </div>

                {/* Fade-out Gradient at Bottom */}
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent z-[5]" />
            </div>

            {/* Main Highlight Section Overlapping Header */}
            <div className="relative z-20 px-4 sm:px-6 pt-0 pb-3 flex items-center justify-between -mt-9 sm:-mt-11 flex-shrink-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={safeIndex}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="flex items-center gap-3 sm:gap-4"
                    >
                        <div className="relative w-[4.5rem] h-[4.5rem] sm:w-[5rem] sm:h-[5rem] rounded-full overflow-hidden border-[3.5px] border-card shadow-lg flex-shrink-0 bg-secondary">
                            <Image
                                src={currentUser.avatar}
                                alt={currentUser.name}
                                fill
                                className="object-cover"
                                unoptimized
                            />
                        </div>
                        <div className="flex flex-col items-start text-left mt-3 sm:mt-4">
                            <h3 className="text-[1.125rem] sm:text-[1.25rem] font-bold text-card-foreground leading-tight">
                                {currentUser.name}
                            </h3>
                            <p className="text-[0.8125rem] sm:text-[0.875rem] font-medium text-muted-foreground">
                                {currentUser.type}
                            </p>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Controls */}
                {highlightUsers.length > 1 && (
                    <div className="flex gap-1.5 mt-3 sm:mt-4">
                        <button
                            onClick={prevSlide}
                            disabled={safeIndex === 0}
                            className="p-1.5 sm:p-2 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Previous celebration"
                        >
                            <svg className="w-3.5 h-3.5 sm:w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={nextSlide}
                            disabled={safeIndex === highlightUsers.length - 1}
                            className="p-1.5 sm:p-2 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Next celebration"
                        >
                            <svg className="w-3.5 h-3.5 sm:w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="px-4 sm:px-6">
                <div className="h-[0.0625rem] bg-border w-full" />
            </div>

            {/* Upcoming Section */}
            <div className="px-4 sm:px-6 pt-1 pb-2 font-sans flex-1 flex flex-col justify-start overflow-hidden">
                <h4 className="text-[0.875rem] sm:text-[1rem] font-semibold text-muted-foreground mb-1 sm:mb-1.5">
                    Upcoming:
                </h4>

                <div className="space-y-2.5 sm:space-y-3.5 overflow-hidden">
                    {upcoming.length > 0 ? (
                        upcoming.map((item, index) => (
                            <div key={index} className="flex items-center justify-between group animate-fade-in">
                                <div className="flex items-center gap-2 sm:gap-2.5">
                                    <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden border border-border group-hover:scale-105 transition-transform">
                                        <Image
                                            src={item.avatar}
                                            alt={item.name}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                    <span className="text-[0.875rem] sm:text-[0.9375rem] font-bold text-card-foreground truncate max-w-[5rem] sm:max-w-none">
                                        {item.name}
                                    </span>
                                </div>
                                <span className="text-[0.75rem] sm:text-[0.875rem] font-medium text-card-foreground flex-shrink-0">
                                    ({item.date})
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4 text-xs font-medium text-muted-foreground">
                            No upcoming birthdays or anniversaries this month.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CelebrationsCard;
