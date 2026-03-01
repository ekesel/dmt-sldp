'use client';

import React, { useEffect, useState } from 'react';
import { dashboard, LeaderboardResponse, LeaderboardWinner } from '@dmt/api';
import { motion, AnimatePresence } from 'framer-motion';

interface WinnersCornerProps {
    projectId?: number | string;
}

const WinnersCorner: React.FC<WinnersCornerProps> = ({ projectId }) => {
    const [data, setData] = useState<LeaderboardResponse | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await dashboard.getLeaderboard(projectId);
                setData(result);
            } catch (error) {
                console.error('Failed to fetch leaderboard:', error);
            }
        };
        fetchData();
    }, [projectId]);

    // Flatten all winners into one list for the ticker
    const allWinners: (LeaderboardWinner & { category: string })[] = data?.current_month
        ? [
            ...(data.current_month.quality || []).map((w) => ({ ...w, category: 'Code Quality Champion' })),
            ...(data.current_month.velocity || []).map((w) => ({ ...w, category: 'Velocity King' })),
            ...(data.current_month.reviewer || []).map((w) => ({ ...w, category: 'Top Reviewer' })),
            ...(data.current_month.ai || []).map((w) => ({ ...w, category: 'AI Specialist' })),
        ]
        : [];

    useEffect(() => {
        if (allWinners.length > 1) {
            const interval = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % allWinners.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [allWinners.length]);

    if (!data || allWinners.length === 0) return null;

    const current = allWinners[currentIndex];

    return (
        <div className="relative w-full overflow-hidden bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 mb-6 flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-lg rounded-full animate-pulse" />
                    <img
                        src={current.avatar}
                        alt={current.name}
                        className="w-10 h-10 rounded-full border-2 border-blue-500/50 object-cover relative z-10"
                    />
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${current.email}-${current.category}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col"
                    >
                        <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                            {current.category}
                        </span>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-white">
                                {current.name}
                            </span>
                            <span className="text-xs text-white/60">
                                — {current.title}
                            </span>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] text-white/40 uppercase">Score</span>
                <span className="text-sm font-mono font-bold text-blue-400">{current.score}</span>
            </div>

            <div className="absolute bottom-0 left-0 h-0.5 bg-blue-500/30 w-full overflow-hidden">
                <motion.div
                    key={currentIndex}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 5, ease: 'linear' }}
                    className="h-full bg-blue-500"
                />
            </div>
        </div>
    );
};

export default WinnersCorner;
