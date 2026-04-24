'use client';

import React from 'react';
import Image from 'next/image';
import { Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    performers = [
        {
            name: "David Chen",
            role: "Sales",
            message: "For outstanding performance in Q3",
            rating: 4.5,
            avatar: "https://i.pravatar.cc/150?u=david"
        },
        {
            name: "Sarah Miller",
            role: "Marketing",
            message: "Exceeded all campaign targets in October",
            rating: 5,
            avatar: "https://i.pravatar.cc/150?u=sarah"
        }
    ]
}) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);

    const nextSlide = () => {
        if (currentIndex < performers.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    const prevSlide = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    const currentPerformer = performers[currentIndex];

    return (
        <div className="bg-card rounded-[1.5rem] border border-border shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.05)] p-3 sm:px-4 sm:pt-3 sm:pb-2 w-full h-full md:min-h-[12rem] lg:min-h-[10.5rem] xl:min-h-[16.25rem] xl:max-h-[16.25rem] overflow-hidden flex flex-col">
            {/* Header Section */}
            <div className="flex justify-between items-start mb-1 sm:mb-1.5 flex-shrink-0">
                <div className="flex flex-col gap-1">
                    <h2 className="text-[1.125rem] sm:text-[1.25rem] font-black text-card-foreground tracking-tight">
                        Star Performer
                    </h2>
                    
                    {/* Navigation Controls */}
                    {performers.length > 1 && (
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
                                disabled={currentIndex === performers.length - 1}
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
                        initial={{ opacity: 0, scale: 0.98, x: 10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.98, x: -10 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="flex gap-3 sm:gap-5 items-center absolute inset-0"
                    >
                        {/* Avatar */}
                        <div className="relative w-[4.5rem] h-[4.5rem] sm:w-[5.9375rem] sm:h-[5.9375rem] rounded-[1.125rem] overflow-hidden flex-shrink-0 shadow-sm border border-border">
                            <Image
                                src={currentPerformer.avatar}
                                alt={currentPerformer.name}
                                fill
                                className="object-cover"
                                unoptimized
                            />
                        </div>

                        <div className="flex flex-col justify-center py-0.5 min-w-0 flex-1">
                            <h3 className="text-[1rem] sm:text-[1.0625rem] font-bold text-card-foreground leading-tight mb-0.5 break-words">
                                {currentPerformer.name}, {currentPerformer.role}
                            </h3>
                            <p className="text-[0.75rem] sm:text-[0.8125rem] text-muted-foreground font-medium mb-1.5 sm:mb-2 leading-snug break-words">
                                {currentPerformer.message}
                            </p>

                            {/* Star Rating Section */}
                            <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => {
                                    const isHalf = star - 0.5 === currentPerformer.rating;
                                    const isFull = star <= currentPerformer.rating;

                                    return (
                                        <div key={star} className="relative">
                                            <Star
                                                size="1rem"
                                                className={`${isFull ? "fill-primary text-primary" : "text-muted/30"} sm:hidden`}
                                            />
                                            <Star
                                                size="1.25rem"
                                                className={`${isFull ? "fill-primary text-primary" : "text-muted/30"} hidden sm:block`}
                                            />
                                            {isHalf && (
                                                <div className="absolute inset-0 overflow-hidden w-1/2">
                                                    <Star
                                                        size="1rem"
                                                        className="fill-primary text-primary sm:hidden"
                                                    />
                                                    <Star
                                                        size="1.25rem"
                                                        className="fill-primary text-primary hidden sm:block"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default StarPerformer;
