'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@dmt/ui';
import { dashboard, LeaderboardResponse, LeaderboardWinner, MonthLeaderboardData, getFileUrl } from '@dmt/api';
import { Trophy, Shield, Zap, GitPullRequest, Sparkles, Award, HelpCircle, BarChart2, CheckCircle2, Bot, Bug, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProjectSelector } from '../../../components/ProjectSelector';
import { ActiveFolderSelector } from "../../../components/ActiveFolderSelector";
import { HelpSidebar } from "../../../components/HelpSidebar";

/**
 * CategoryCard renders a single category leaderboard card showing
 * the current winner (with tie-carousel navigation), score metrics, and contenders.
 */
const CategoryCard = ({
    title,
    icon: Icon,
    winners,
    colorClass,
    scoreLabel,
    calculationText,
    helpId,
    onHelpClick,
    lowerIsBetter = false,
}: {
    title: string;
    icon: React.ElementType;
    winners: LeaderboardWinner[] | undefined;
    colorClass: string;
    scoreLabel: string;
    calculationText: string;
    helpId: string;
    onHelpClick: (id: string) => void;
    lowerIsBetter?: boolean;
}) => {
    const [currentWinnerIndex, setCurrentWinnerIndex] = useState(0);

    // Determine ranking with ties supported
    const rankedList = (winners || []).map((item, idx, list) => {
        let rank = 1;
        if (idx > 0) {
            if (item.score === list[idx - 1].score) {
                let firstIdx = idx;
                while (firstIdx > 0 && list[firstIdx - 1].score === item.score) {
                    firstIdx--;
                }
                rank = firstIdx + 1;
            } else {
                rank = idx + 1;
            }
        }
        return { ...item, rank };
    });

    const topWinners = rankedList.filter(item => item.rank === 1);
    const contenders = rankedList.filter(item => item.rank > 1).slice(0, 2);

    useEffect(() => {
        if (currentWinnerIndex >= topWinners.length) {
            setCurrentWinnerIndex(0);
        }
    }, [topWinners.length, currentWinnerIndex]);

    const handlePrevWinner = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentWinnerIndex((prev) => Math.max(0, prev - 1));
    };

    const handleNextWinner = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentWinnerIndex((prev) => Math.min(topWinners.length - 1, prev + 1));
    };

    const renderHistory = (history?: { date: string; score: number }[]) => {
        if (!history || history.length === 0) return null;
        const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const maxScore = Math.max(...sorted.map(h => h.score), 1);
        return (
            <div className="flex items-end gap-0.5 sm:gap-1 h-6 sm:h-8 mt-1 sm:mt-2 opacity-80">
                {sorted.map((h, i) => (
                    <div key={i} className="flex flex-col justify-end items-center group relative cursor-default h-full">
                        <div
                            className={`w-2 sm:w-3 rounded-t-sm transition-all duration-500 ${colorClass.replace('text-', 'bg-')} opacity-60 hover:opacity-100`}
                            style={{ height: `${Math.max((h.score / maxScore) * 100, 10)}%` }}
                        />
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Card className="flex flex-col p-3.5 sm:p-5 lg:p-6 bg-card border-border shadow-xl overflow-hidden relative">
            <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none ${colorClass.replace('text-', 'bg-')}`} />

            <div className="flex items-start sm:items-center justify-between gap-2 mb-4 sm:mb-6">
                <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className={`p-2 sm:p-3 rounded-xl bg-opacity-20 ${colorClass.replace('text-', 'bg-')}/10 border border-current/10 shrink-0`}>
                        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${colorClass}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-xl font-bold text-card-foreground tracking-tight break-words leading-snug">{title}</h3>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5 break-words leading-normal">{calculationText}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {lowerIsBetter && (
                        <span className="text-[9px] sm:text-[10px] bg-muted px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Lower = Better</span>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onHelpClick(helpId); }}
                        className="text-muted-foreground/50 hover:text-primary transition-colors focus:outline-none cursor-pointer p-0.5"
                        title={`Learn more about ${title}`}
                    >
                        <HelpCircle size={18} className="sm:w-5 sm:h-5" />
                    </button>
                </div>
            </div>

            {topWinners.length > 0 ? (
                <div className="space-y-4 mb-4 sm:mb-6">
                    <div className="bg-accent/50 rounded-2xl p-3.5 sm:p-5 lg:p-6 border border-border relative">
                        {topWinners.length > 1 && (
                            <div className="absolute top-1/2 -left-2.5 sm:-left-4 -translate-y-1/2 z-10">
                                <button 
                                    onClick={handlePrevWinner} 
                                    disabled={currentWinnerIndex === 0}
                                    className={`p-1 sm:p-1.5 bg-background border border-border rounded-full shadow-md transition-colors ${currentWinnerIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'}`}
                                >
                                    <ChevronLeft size={14} className="sm:w-4 sm:h-4" />
                                </button>
                            </div>
                        )}
                        {topWinners.length > 1 && (
                            <div className="absolute top-1/2 -right-2.5 sm:-right-4 -translate-y-1/2 z-10">
                                <button 
                                    onClick={handleNextWinner} 
                                    disabled={currentWinnerIndex === topWinners.length - 1}
                                    className={`p-1 sm:p-1.5 bg-background border border-border rounded-full shadow-md transition-colors ${currentWinnerIndex === topWinners.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'}`}
                                >
                                    <ChevronRight size={14} className="sm:w-4 sm:h-4" />
                                </button>
                            </div>
                        )}
                        <div className="absolute top-0 right-3 sm:right-6 -translate-y-1/2">
                            <div className="bg-amber-500 text-amber-950 text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-widest shadow-lg shadow-amber-500/20 flex items-center gap-1">
                                <Trophy size={11} className="sm:w-3 sm:h-3" />
                                <span>Winner {topWinners.length > 1 ? `(${currentWinnerIndex + 1}/${topWinners.length})` : ''}</span>
                            </div>
                        </div>
                        <div className="flex items-start sm:items-center gap-2.5 sm:gap-4">
                            <img
                                src={topWinners[currentWinnerIndex].avatar ? getFileUrl(topWinners[currentWinnerIndex].avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(topWinners[currentWinnerIndex].name)}&background=random`}
                                alt={topWinners[currentWinnerIndex].name}
                                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-amber-500/50 shadow-lg object-cover shrink-0 mt-0.5 sm:mt-0"
                            />
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm sm:text-lg font-bold text-foreground break-words leading-snug">{topWinners[currentWinnerIndex].name}</h4>
                                <p className="text-xs sm:text-sm font-medium text-amber-500/90 break-words leading-snug">{topWinners[currentWinnerIndex].title}</p>
                                {topWinners[currentWinnerIndex].reason && (
                                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 italic break-words leading-relaxed">&quot;{topWinners[currentWinnerIndex].reason}&quot;</p>
                                )}
                            </div>
                            <div className="text-right flex flex-col items-end shrink-0">
                                <div className="text-xl sm:text-2xl font-black text-foreground">{topWinners[currentWinnerIndex].score}</div>
                                <div className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase mb-0.5 sm:mb-1">{scoreLabel}</div>
                                {renderHistory(topWinners[currentWinnerIndex].history)}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-muted/30 rounded-2xl p-4 sm:p-6 border border-border text-center mb-4 sm:mb-6">
                    <p className="text-xs sm:text-sm text-muted-foreground">No data available yet</p>
                </div>
            )}

            {contenders.length > 0 && (
                <div className="space-y-2 sm:space-y-4 flex-1">
                    <h5 className="text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 sm:mb-2">Top Contenders</h5>
                    {contenders.map((contender, idx) => (
                        <div key={idx} className="flex items-start sm:items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-xl hover:bg-accent/50 transition-colors">
                            <div className="text-sm sm:text-lg font-bold text-muted-foreground w-3.5 sm:w-4 mt-0.5 sm:mt-0">{contender.rank}</div>
                            <img
                                src={contender.avatar ? getFileUrl(contender.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(contender.name)}&background=random`}
                                alt={contender.name}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 mt-0.5 sm:mt-0"
                            />
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs sm:text-sm font-bold text-foreground break-words leading-snug">{contender.name}</h4>
                                <p className="text-[11px] sm:text-xs text-muted-foreground break-words leading-snug">{contender.title}</p>
                            </div>
                            <div className="text-right flex flex-col items-end shrink-0">
                                <div className="text-xs sm:text-sm font-bold text-foreground">{contender.score}</div>
                                {renderHistory(contender.history)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
};

const CATEGORIES: Array<{
    key: keyof MonthLeaderboardData;
    title: string;
    icon: React.ElementType;
    colorClass: string;
    scoreLabel: string;
    calculationText: string;
    helpId: string;
    lowerIsBetter?: boolean;
}> = [
        { key: 'velocity', title: 'Velocity King', icon: Zap, colorClass: 'text-blue-500', scoreLabel: 'Points', calculationText: 'Highest total Story Points completed', helpId: 'velocity_king' },
        { key: 'quality', title: 'Quality Champion', icon: Shield, colorClass: 'text-emerald-500', scoreLabel: 'Compliance %', calculationText: 'Highest average DMT Compliance & Coverage', helpId: 'quality_champion' },
        { key: 'reviewer', title: 'Top Reviewer', icon: GitPullRequest, colorClass: 'text-purple-500', scoreLabel: 'PRs', calculationText: 'Most Pull Requests reviewed', helpId: 'top_reviewer' },
        { key: 'throughput', title: 'Throughput Champion', icon: BarChart2, colorClass: 'text-orange-500', scoreLabel: 'Items', calculationText: 'Most work items completed', helpId: 'throughput_champion' },
        { key: 'coverage', title: 'Coverage Champion', icon: CheckCircle2, colorClass: 'text-teal-500', scoreLabel: 'Coverage %', calculationText: 'Highest average code coverage', helpId: 'coverage_champion' },
        { key: 'ai', title: 'AI Specialist', icon: Sparkles, colorClass: 'text-cyan-500', scoreLabel: 'Usage %', calculationText: 'Highest self-reported AI tool usage', helpId: 'ai_specialist' },
        { key: 'objective_ai', title: 'Objective AI Master', icon: Bot, colorClass: 'text-indigo-500', scoreLabel: 'Code AI %', calculationText: 'Highest PR-analyzed AI code contribution', helpId: 'objective_ai_master' },
        { key: 'clean_coder', title: 'Clean Coder', icon: Bug, colorClass: 'text-rose-500', scoreLabel: 'Defects', calculationText: 'Fewest defects attributed', helpId: 'clean_coder', lowerIsBetter: true },
    ];

export default function LeaderboardPage() {
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [data, setData] = useState<LeaderboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [activeHelpId, setActiveHelpId] = useState<string | null>(null);

    const handleHelpClick = (id: string) => {
        setActiveHelpId(id);
        setIsHelpOpen(true);
    };

    useEffect(() => {
        setLoading(true);
        dashboard.getLeaderboard(selectedProjectId || undefined)
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [selectedProjectId]);

    const renderGrid = (monthData: MonthLeaderboardData | undefined) => (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {CATEGORIES.map(({ key, title, icon, colorClass, scoreLabel, calculationText, helpId, lowerIsBetter }) => (
                <CategoryCard
                    key={key}
                    title={title}
                    icon={icon}
                    winners={monthData?.[key]}
                    colorClass={colorClass}
                    scoreLabel={scoreLabel}
                    calculationText={calculationText}
                    helpId={helpId}
                    onHelpClick={handleHelpClick}
                    lowerIsBetter={lowerIsBetter}
                />
            ))}
        </div>
    );

    return (
        <div className="min-h-full bg-background px-3 py-4 sm:p-6 lg:p-8 selection:bg-primary/30 overflow-x-hidden">
            <div className="max-w-7xl mx-auto space-y-5 sm:space-y-8 mt-2 sm:mt-8 pb-12 sm:pb-16">
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end border-b border-border pb-4 sm:pb-8 gap-3 sm:gap-6">
                    <div>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-primary text-xs sm:text-sm font-bold tracking-wider uppercase mb-1 sm:mb-2">
                            <Award size={14} className="sm:w-4 sm:h-4" />
                            Monthly Awards
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">Leaderboard</h1>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleHelpClick('leaderboard'); }}
                                className="text-muted-foreground/50 hover:text-primary transition-colors focus:outline-none cursor-pointer"
                                title="Learn more about the leaderboard categories"
                            >
                                <HelpCircle size={18} className="sm:w-6 sm:h-6" />
                            </button>
                        </div>
                        <p className="text-muted-foreground mt-1 sm:mt-2 text-xs sm:text-base font-medium">Recognizing engineering excellence across the organization.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 items-stretch sm:items-center justify-start xl:justify-end w-full xl:w-auto">
                        <ProjectSelector selectedProjectId={selectedProjectId} onSelect={setSelectedProjectId} className="w-full sm:w-auto" />
                        <ActiveFolderSelector
                            projectId={selectedProjectId}
                            onFolderChanged={() => window.location.reload()}
                            dropdownAlign="right"
                        />
                    </div>
                </header>

                {loading ? (
                    <div className="text-primary text-center py-12">Loading competition data...</div>
                ) : data ? (
                    <div className="space-y-8 sm:space-y-16">
                        <div>
                            <h2 className="text-base sm:text-2xl font-bold text-foreground mb-3 sm:mb-6 border-l-4 border-primary pl-2.5 sm:pl-4 py-0.5 sm:py-1">Current Month Leaders</h2>
                            {renderGrid(data.current_month)}
                        </div>

                        {data.past_month && (
                            <div className="pt-4 sm:pt-8 opacity-80 hover:opacity-100 transition-opacity duration-300">
                                <h2 className="text-base sm:text-2xl font-bold text-foreground mb-3 sm:mb-6 border-l-4 border-primary pl-2.5 sm:pl-4 py-0.5 sm:py-1 flex items-center gap-2">
                                    <Trophy size={18} className="text-primary shrink-0 sm:w-5.5 sm:h-5.5" />
                                    <span>Past Month Leaders</span>
                                </h2>
                                {renderGrid(data.past_month)}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-muted-foreground text-center py-12">Failed to load leaderboard.</div>
                )}
            </div>

            <HelpSidebar
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
                activeTermId={activeHelpId}
            />
        </div>
    );
}
