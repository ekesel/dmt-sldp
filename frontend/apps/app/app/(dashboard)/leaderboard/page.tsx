'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@dmt/ui';
import { dashboard, LeaderboardResponse, LeaderboardWinner } from '@dmt/api';
import { Trophy, Shield, Zap, GitPullRequest, Sparkles, Award, HelpCircle } from 'lucide-react';
import { ProjectSelector } from '../../../components/ProjectSelector';
import { ActiveFolderSelector } from "../../../components/ActiveFolderSelector";
import { HelpSidebar } from "../../../components/HelpSidebar";

const CategoryCard = ({
    title,
    icon: Icon,
    winners,
    colorClass,
    scoreLabel,
    calculationText
}: {
    title: string;
    icon: React.ElementType;
    winners: LeaderboardWinner[] | undefined;
    colorClass: string;
    scoreLabel: string;
    calculationText: string;
}) => {
    const topWinner = winners?.[0];
    const contenders = winners?.slice(1) || [];

    // Helper to render mini history visualization
    const renderHistory = (history?: { date: string; score: number }[]) => {
        if (!history || history.length === 0) return null;

        // Reverse history to show oldest first (left to right) if it came from backend newest first
        const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const maxScore = Math.max(...sortedHistory.map(h => h.score), 1);

        return (
            <div className="flex items-end gap-1 h-8 mt-2 opacity-80" title="Recent Sprint History">
                {sortedHistory.map((h, i) => (
                    <div key={i} className="flex flex-col justify-end items-center group relative cursor-help h-full">
                        {/* Tooltip */}
                        <div className="absolute -top-8 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 transition-opacity pointers-events-none">
                            {h.date}: {h.score}
                        </div>
                        {/* Bar */}
                        <div
                            className={`w-3 rounded-t-sm transition-all duration-500 ${colorClass.replace("text-", "bg-")} opacity-60 hover:opacity-100`}
                            style={{ height: `${Math.max((h.score / maxScore) * 100, 10)}%` }}
                        />
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Card className="flex flex-col p-6 bg-card border-border shadow-xl overflow-hidden relative">
            <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none ${colorClass}`} />

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${colorClass} bg-opacity-20`}>
                        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-card-foreground tracking-tight">{title}</h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{calculationText}</p>
                    </div>
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
                            src={topWinner.avatar || `https://ui-avatars.com/api/?name=${topWinner.name}&background=random`}
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
                                src={contender.avatar || `https://ui-avatars.com/api/?name=${contender.name}&background=random`}
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
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const res = await dashboard.getLeaderboard(selectedProjectId || undefined);
                setData(res);
            } catch (err) {
                console.error("Failed to load leaderboard:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [selectedProjectId]);

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
                        <ProjectSelector
                            selectedProjectId={selectedProjectId}
                            onSelect={setSelectedProjectId}
                        />
                        <ActiveFolderSelector
                            projectId={selectedProjectId}
                            onFolderChanged={() => {
                                // Reload page to fetch new leaderboard data with new active folder restrictions
                                window.location.reload();
                            }}
                        />
                    </div>
                </header>

                {loading ? (
                    <div className="text-primary text-center py-12">Loading competition data...</div>
                ) : data ? (
                    <div className="space-y-16">
                        {/* CURRENT MONTH */}
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-6 border-l-4 border-primary pl-4 py-1">Current Month Leaders</h2>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                <CategoryCard
                                    title="Velocity King"
                                    icon={Zap}
                                    winners={data.current_month?.velocity}
                                    colorClass="bg-blue-500 text-blue-500"
                                    scoreLabel="Points"
                                    calculationText="Highest total Story Points completed"
                                />
                                <CategoryCard
                                    title="Quality Champion"
                                    icon={Shield}
                                    winners={data.current_month?.quality}
                                    colorClass="bg-emerald-500 text-emerald-500"
                                    scoreLabel="Compliance %"
                                    calculationText="Highest average DMT Compliance & Coverage"
                                />
                                <CategoryCard
                                    title="Top Reviewer"
                                    icon={GitPullRequest}
                                    winners={data.current_month?.reviewer}
                                    colorClass="bg-purple-500 text-purple-500"
                                    scoreLabel="PRs"
                                    calculationText="Most Pull Requests reviewed"
                                />
                                <CategoryCard
                                    title="AI Specialist"
                                    icon={Sparkles}
                                    winners={data.current_month?.ai}
                                    colorClass="bg-cyan-500 text-cyan-500"
                                    scoreLabel="Usage %"
                                    calculationText="Highest Copilot / AI Tool usage correlation"
                                />
                            </div>
                        </div>

                        {/* PAST MONTH */}
                        {data.past_month && (
                            <div className="pt-8 opacity-80 hover:opacity-100 transition-opacity duration-300">
                                <h2 className="text-2xl font-bold text-foreground mb-6 border-l-4 border-primary pl-4 py-1 flex items-center gap-2">
                                    <Trophy size={24} className="text-primary" />
                                    Past Month Leaders
                                </h2>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                    <CategoryCard
                                        title="Velocity King"
                                        icon={Zap}
                                        winners={data.past_month.velocity}
                                        colorClass="bg-blue-500 text-blue-500"
                                        scoreLabel="Points"
                                        calculationText="Highest total Story Points completed"
                                    />
                                    <CategoryCard
                                        title="Quality Champion"
                                        icon={Shield}
                                        winners={data.past_month.quality}
                                        colorClass="bg-emerald-500 text-emerald-500"
                                        scoreLabel="Compliance %"
                                        calculationText="Highest average DMT Compliance & Coverage"
                                    />
                                    <CategoryCard
                                        title="Top Reviewer"
                                        icon={GitPullRequest}
                                        winners={data.past_month.reviewer}
                                        colorClass="bg-purple-500 text-purple-500"
                                        scoreLabel="PRs"
                                        calculationText="Most Pull Requests reviewed"
                                    />
                                    <CategoryCard
                                        title="AI Specialist"
                                        icon={Sparkles}
                                        winners={data.past_month.ai}
                                        colorClass="bg-cyan-500 text-cyan-500"
                                        scoreLabel="Usage %"
                                        calculationText="Highest Copilot / AI Tool usage correlation"
                                    />
                                </div>
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
