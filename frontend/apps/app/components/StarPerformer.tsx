'use client';

import React from 'react';
import Image from 'next/image';
import { Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { dashboard } from '@dmt/api';

interface Performer {
    name: string;
    role: string;
    message: string;
    rating: number;
    avatar: string;
}

interface StarPerformerProps {
    performers?: Performer[];
}

/**
 * StarPerformer component that matches the reference image.
 * Features a trophy illustration, user info, and a star rating.
 */
export const StarPerformer: React.FC<StarPerformerProps> = ({
    performers
}) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [apiPerformers, setApiPerformers] = React.useState<Performer[]>([]);
    const [loading, setLoading] = React.useState(true);

    const defaultPerformers = [
        {
            name: "David Chen",
            role: "Sales",
            message: "For outstanding performance in Q3",
            rating: 5,
            avatar: "https://i.pravatar.cc/150?u=david"
        },
        {
            name: "Sarah Miller",
            role: "Marketing",
            message: "Exceeded all campaign targets in October",
            rating: 5,
            avatar: "https://i.pravatar.cc/150?u=sarah"
        }
    ];

    React.useEffect(() => {
        const fetchPerformers = async () => {
            try {
                const data = await dashboard.getStarPerformer();
                if (data && data.top_performers) {
                    const mapped: Performer[] = Object.values(data.top_performers)
                        .filter((p: any) => p !== null && p !== undefined)
                        .map((p: any) => {
                            // Compute a clean 3.5 - 5 star rating based on score
                            let rating = 5;
                            if (p.score !== undefined && p.score !== null) {
                                // If the score is a raw number (like compliance, velocity points, etc.), scale it nicely
                                const val = Number(p.score);
                                if (val > 0) {
                                    // Map to a premium 4 to 5 range
                                    rating = 4 + (val % 2 === 0 ? 0.5 : 1) * 0.5;
                                }
                            }
                            return {
                                name: p.name || 'Performer',
                                role: p.title || 'Top Performer',
                                message: p.reason || 'Outstanding performance',
                                rating: Math.min(5, Math.max(3.5, rating)),
                                avatar: p.avatar || 'https://i.pravatar.cc/150?u=star'
                            };
                        });
                    setApiPerformers(mapped);
                }
            } catch (error) {
                console.error('Failed to fetch star performers:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPerformers();
    }, []);

    // Resolve final data list
    const dataList = performers && performers.length > 0 
        ? performers 
        : (apiPerformers.length > 0 ? apiPerformers : defaultPerformers);

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

    return (
        <div className="bg-card rounded-[1.5rem] border border-border shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.05)] p-3 sm:px-4 sm:pt-3 sm:pb-2 w-full h-full md:min-h-[12rem] lg:min-h-[10.5rem] xl:min-h-[16.25rem] xl:max-h-[16.25rem] overflow-hidden flex flex-col">
            {/* Header Section */}
            <div className="flex justify-between items-start mb-1 sm:mb-1.5 flex-shrink-0">
                <div className="flex flex-col gap-1">
                    <h2 className="text-[0.9375rem] sm:text-[1.0625rem] font-black text-card-foreground tracking-tight">
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
                <div className="relative w-12 h-12 sm:w-16 sm:h-16 -mr-1 -mt-1">
                    <Image
                        src="/assets/trophy.png"
                        alt="Trophy"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
            </div>

            {/* Divider */}
            <div className="h-[0.0625rem] bg-border w-full mb-2 sm:mb-3" />

            {/* User Info Section */}
            <div className="relative flex-1">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="flex gap-3 sm:gap-5 items-center absolute inset-0"
                    >
                        {/* Avatar */}
                        <div className="relative w-[4.5rem] h-[4.5rem] sm:w-[5.9375rem] sm:h-[5.9375rem] rounded-[1.125rem] overflow-hidden flex-shrink-0 shadow-sm border border-border">
                            <Image
                                src={currentPerformer?.avatar || 'https://i.pravatar.cc/150?u=star'}
                                alt={currentPerformer?.name || 'Star Performer'}
                                fill
                                className="object-cover"
                                unoptimized
                            />
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
            </div>
        </div>
    );
};

export default StarPerformer;
