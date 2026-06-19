'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@dmt/ui';
import { dashboard, LeaderboardResponse, LeaderboardWinner, getFileUrl } from '@dmt/api';
import { Trophy, Shield, Zap, GitPullRequest, Sparkles, Award, HelpCircle, BarChart2, CheckCircle2, Bot, Bug } from 'lucide-react';
import { ProjectSelector } from '../../../components/ProjectSelector';
import { ActiveFolderSelector } from "../../../components/ActiveFolderSelector";
import { HelpSidebar } from "../../../components/HelpSidebar";

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
    const topWinner = winners?.[0];
    const contenders = winners?.slice(1) || [];

    const renderHistory = (history?: { date: string; score: number }[]) => {
        if (!history || history.length === 0) return null;
        const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const maxScore = Math.max(...sorted.map(h => h.score), 1);
        return (
            <div className="flex items-end gap-1 h-8 mt-2 opacity-80" title="Recent Sprint History">
                {sorted.map((h, i) => (
                    <div key={i} className="flex flex-col justify-end items-center group relative cursor-help h-full">
                        <div className="absolute -top-8 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 transition-opacity">
                            {h.date}: {h.score}
                        </div>
                        <div
                            className={`w-3 rounded-t-sm transition-all duration-500 ${colorClass.replace('text-', 'bg-')} opacity-60 hover:opacity-100`}
                            style={{ height: `${Math.max((h.score / maxScore) * 100, 10)}%` }}
                        />
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Card className="flex flex-col p-6 bg-card border-border shadow-xl overflow-hidden relative">
            <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none ${colorClass.replace('text-', 'bg-')}`} />

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-opacity-20 ${colorClass.replace('text-', 'bg-')}/10 border border-current/10`}>
                        <Icon className={`w-6 h-6 ${colorClass}`} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-card-foreground tracking-tight">{title}</h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{calculationText}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {lowerIsBetter && (
                        <span className="text-[10px] bg-muted px-2 py-1 rounded font-bold text-muted-foreground uppercase tracking-wider">Lower = Better</span>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onHelpClick(helpId); }}
                        className="text-muted-foreground/50 hover:text-primary transition-colors focus:outline-none"
                        title={`Learn more about ${title}`}
                    >
                        <HelpCircle size={20} />
                    </button>
                </div>
            </div>

            {topWinner ? (
                <div className="bg-accent/50 rounded-2xl p-6 border border-border relative mb-6">
                    <div className="absolute top-0 right-6 -translate-y-1/2">
                        <div className="bg-amber-500 text-amber-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-amber-500/20 flex items-center gap-1">
                            <Trophy size={12} />
                            Winner
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <img
                            src={topWinner.avatar ? getFileUrl(topWinner.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(topWinner.name)}&background=random`}
                            alt={topWinner.name}
                            className="w-16 h-16 rounded-full border-2 border-amber-500/50 shadow-lg"
                        />
                        <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-bold text-foreground truncate">{topWinner.name}</h4>
                            <p className="text-sm font-medium text-amber-500/90 truncate">{topWinner.title}</p>
                            {topWinner.reason && (
                                <p className="text-xs text-muted-foreground mt-1 italic">&quot;{topWinner.reason}&quot;</p>
                            )}
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <div className="text-2xl font-black text-foreground">{topWinner.score}</div>
                            <div className="text-xs font-medium text-muted-foreground uppercase mb-1">{scoreLabel}</div>
                            {renderHistory(topWinner.history)}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-muted/30 rounded-2xl p-6 border border-border text-center mb-6">
                    <p className="text-muted-foreground">No data available yet</p>
                </div>
            )}

            {contenders.length > 0 && (
                <div className="space-y-4 flex-1">
                    <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Top Contenders</h5>
                    {contenders.map((contender, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent/50 transition-colors">
                            <div className="text-lg font-bold text-muted-foreground w-4">{idx + 2}</div>
                            <img
                                src={contender.avatar ? getFileUrl(contender.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(contender.name)}&background=random`}
                                alt={contender.name}
                                className="w-10 h-10 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-foreground truncate">{contender.name}</h4>
                                <p className="text-xs text-muted-foreground truncate">{contender.title}</p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <div className="text-sm font-bold text-foreground">{contender.score}</div>
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
    key: string;
    title: string;
    icon: React.ElementType;
    colorClass: string;
    scoreLabel: string;
    calculationText: string;
    helpId: string;
    lowerIsBetter?: boolean;
}> = [
    { key: 'velocity',     title: 'Velocity King',          icon: Zap,          colorClass: 'text-blue-500',    scoreLabel: 'Points',       calculationText: 'Highest total Story Points completed', helpId: 'velocity_king' },
    { key: 'quality',      title: 'Quality Champion',       icon: Shield,       colorClass: 'text-emerald-500', scoreLabel: 'Compliance %', calculationText: 'Highest average DMT Compliance & Coverage', helpId: 'quality_champion' },
    { key: 'reviewer',     title: 'Top Reviewer',           icon: GitPullRequest, colorClass: 'text-purple-500', scoreLabel: 'PRs',         calculationText: 'Most Pull Requests reviewed', helpId: 'top_reviewer' },
    { key: 'throughput',   title: 'Throughput Champion',    icon: BarChart2,    colorClass: 'text-orange-500',  scoreLabel: 'Items',        calculationText: 'Most work items completed', helpId: 'throughput_champion' },
    { key: 'coverage',     title: 'Coverage Champion',      icon: CheckCircle2, colorClass: 'text-teal-500',    scoreLabel: 'Coverage %',   calculationText: 'Highest average code coverage', helpId: 'coverage_champion' },
    { key: 'ai',           title: 'AI Specialist',          icon: Sparkles,     colorClass: 'text-cyan-500',    scoreLabel: 'Usage %',      calculationText: 'Highest self-reported AI tool usage', helpId: 'ai_specialist' },
    { key: 'objective_ai', title: 'Objective AI Master',    icon: Bot,          colorClass: 'text-indigo-500',  scoreLabel: 'Code AI %',    calculationText: 'Highest PR-analyzed AI code contribution', helpId: 'objective_ai_master' },
    { key: 'clean_coder',  title: 'Clean Coder',            icon: Bug,          colorClass: 'text-rose-500',    scoreLabel: 'Defects',      calculationText: 'Fewest defects attributed', helpId: 'clean_coder', lowerIsBetter: true },
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

    const renderGrid = (monthData: LeaderboardResponse['current_month'] | undefined) => (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {CATEGORIES.map(({ key, title, icon, colorClass, scoreLabel, calculationText, helpId, lowerIsBetter }) => (
                <CategoryCard
                    key={key}
                    title={title}
                    icon={icon}
                    winners={(monthData as any)?.[key]}
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
        <main className="min-h-screen bg-background p-8 selection:bg-primary/30">
            <div className="max-w-7xl mx-auto space-y-8 mt-8 pb-16">
                <header className="flex justify-between items-end border-b border-border pb-8">
                    <div>
                        <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider uppercase mb-2">
                            <Award size={16} />
                            Monthly Awards
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Leaderboard</h1>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleHelpClick('leaderboard'); }}
                                className="text-muted-foreground/50 hover:text-primary transition-colors focus:outline-none mt-2"
                                title="Learn more about the leaderboard categories"
                            >
                                <HelpCircle size={24} />
                            </button>
                        </div>
                        <p className="text-muted-foreground mt-2 font-medium">Recognizing engineering excellence across the organization.</p>
                    </div>
                    <div className="flex gap-4 items-center flex-wrap justify-end">
                        <ProjectSelector selectedProjectId={selectedProjectId} onSelect={setSelectedProjectId} />
                        <ActiveFolderSelector
                            projectId={selectedProjectId}
                            onFolderChanged={() => window.location.reload()}
                        />
                    </div>
                </header>

                {loading ? (
                    <div className="text-primary text-center py-12">Loading competition data...</div>
                ) : data ? (
                    <div className="space-y-16">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-6 border-l-4 border-primary pl-4 py-1">Current Month Leaders</h2>
                            {renderGrid(data.current_month)}
                        </div>

                        {data.past_month && (
                            <div className="pt-8 opacity-80 hover:opacity-100 transition-opacity duration-300">
                                <h2 className="text-2xl font-bold text-foreground mb-6 border-l-4 border-primary pl-4 py-1 flex items-center gap-2">
                                    <Trophy size={24} className="text-primary" />
                                    Past Month Leaders
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
        </main>
    );
}
