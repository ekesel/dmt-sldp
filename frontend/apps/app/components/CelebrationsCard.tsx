'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

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

interface CelebrationsCardProps {
    highlightUsers?: HighlightUser[];
    upcoming?: UpcomingCelebration[];
}

/**
 * CelebrationsCard component matching the reference image.
 * Features a festive header, main work anniversary highlight, and upcoming list.
 */
export const CelebrationsCard: React.FC<CelebrationsCardProps> = ({
    highlightUsers = [
        {
            name: "Jessica",
            type: "Work Anniversary",
            avatar: "https://i.pravatar.cc/150?u=jessica"
        },
        {
            name: "Riya",
            type: "Birthday",
            avatar: "https://i.pravatar.cc/150?u=rahul"
        }
    ],
    upcoming = [
        { name: "John Doe", date: "Oct 28", avatar: "https://i.pravatar.cc/150?u=john" },
        { name: "Maria G.", date: "Nov 1", avatar: "https://i.pravatar.cc/150?u=maria" }
    ]
}) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);

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

    const currentUser = highlightUsers[currentIndex];

    return (
        <div className="bg-card rounded-[1.5rem] border border-border shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.05)] w-full h-full xl:max-h-[20rem] overflow-hidden flex flex-col">
            {/* Festive Header Section */}
            <div className="relative h-[6rem] sm:h-[6.875rem] w-full flex flex-col items-center justify-start pt-3 flex-shrink-0">
                {/* Background Illustration */}
                <div className="absolute inset-0 z-0 opacity-100">
                    <Image
                        src="/assets/celebration.png"
                        alt="Festive Background"
                        fill
                        className="object-cover object-top"
                        priority
                    />
                </div>

                {/* Fade-out Gradient at Bottom */}
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent z-[5]" />

                {/* Playful Title at Bottom of Header */}
                <div className="absolute bottom-2 inset-x-0 z-10 text-center select-none">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentUser.type}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.3 }}
                        >
                            {currentUser.type === "Birthday" ? (
                                <>
                                    <h2 className="text-[0.9375rem] sm:text-[1.0625rem] font-black leading-none flex gap-1 justify-center mb-0.5 drop-shadow-sm">
                                        <span className="text-[#56C3B1]">H</span>
                                        <span className="text-[#FFAB40]">a</span>
                                        <span className="text-[#FF808B]">p</span>
                                        <span className="text-[#7CB9E8]">p</span>
                                        <span className="text-[#6FCF97]">y</span>
                                    </h2>
                                    <h2 className="text-[0.9375rem] sm:text-[1.0625rem] font-black text-accent leading-tight drop-shadow-sm">
                                        Birthday!
                                    </h2>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-[0.9375rem] sm:text-[1.0625rem] font-black leading-none flex gap-1 justify-center mb-0.5 drop-shadow-sm">
                                        <span className="text-[#56C3B1]">C</span>
                                        <span className="text-accent">o</span>
                                        <span className="text-[#FF808B]">n</span>
                                        <span className="text-[#7CB9E8]">g</span>
                                        <span className="text-[#6FCF97]">r</span>
                                        <span className="text-accent">a</span>
                                        <span className="text-[#FF808B]">t</span>
                                        <span className="text-[#7CB9E8]">s</span>
                                    </h2>
                                    <h2 className="text-[0.9375rem] sm:text-[1.0625rem] font-black text-[#6FCF97] leading-tight drop-shadow-sm">
                                        Work Anniversary!
                                    </h2>
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Main Highlight Section Overlapping Header */}
            <div className="relative z-20 px-4 sm:px-6 pt-0 pb-2 flex items-end justify-between -mt-10 sm:-mt-12 flex-shrink-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="flex flex-col items-start gap-1.5 sm:gap-2"
                    >
                        <div className="relative w-[4.5rem] h-[4.5rem] sm:w-[5.3125rem] sm:h-[5.3125rem] rounded-full overflow-hidden border-4 border-card shadow-lg flex-shrink-0 bg-secondary">
                            <Image
                                src={currentUser.avatar}
                                alt={currentUser.name}
                                fill
                                className="object-cover"
                                unoptimized
                            />
                        </div>
                        <div className="flex flex-col items-start text-left">
                            <h3 className="text-[1.0625rem] sm:text-[1.1875rem] font-bold text-card-foreground leading-tight">
                                {currentUser.name}
                            </h3>
                            <p className="text-[0.75rem] sm:text-[0.8125rem] font-medium text-muted-foreground">
                                {currentUser.type}
                            </p>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Controls */}
                {highlightUsers.length > 1 && (
                    <div className="flex flex-col items-end gap-3 mb-2">
                        {/* Chevron Buttons */}
                        <div className="flex gap-1.5">
                            <button
                                onClick={prevSlide}
                                disabled={currentIndex === 0}
                                className="p-1.5 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-secondary disabled:hover:text-muted-foreground"
                                aria-label="Previous celebration"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={nextSlide}
                                disabled={currentIndex === highlightUsers.length - 1}
                                className="p-1.5 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-secondary disabled:hover:text-muted-foreground"
                                aria-label="Next celebration"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
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
                    {upcoming.map((item, index) => (
                        <div key={index} className="flex items-center justify-between group">
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
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CelebrationsCard;
