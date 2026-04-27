"use client"

import React from 'react';
import { Sparkles, Star } from 'lucide-react';
import { Avatar, BirthdayPerson } from './UpcomingBirthdaysUI';

interface UpcomingBirthdaysListProps {
    birthdays: BirthdayPerson[];
}

const getStatusConfig = (days: number) => {
    if (days <= 3) return { label: 'Very soon', indicator: 'bg-destructive', badge: 'bg-destructive text-destructive-foreground' };
    if (days <= 7) return { label: 'Coming up', indicator: 'bg-accent', badge: 'bg-accent text-accent-foreground' };
    return { label: 'Later this month', indicator: 'bg-primary', badge: 'bg-primary text-primary-foreground' };
};

export default function UpcomingBirthdaysList({ birthdays }: UpcomingBirthdaysListProps) {
    return (
        <div className="p-6 bg-background rounded-b-lg border-t border-border">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="font-bold text-foreground text-lg">Next up</h3>
                    <p className="text-sm text-muted-foreground max-w-[200px] leading-tight mt-1">
                        Theme colors mark the birthdays coming up fastest.
                    </p>
                </div>
                <div className="text-xs bg-accent px-4 py-2 rounded-full flex items-center gap-2 font-bold text-accent-foreground shadow-sm">
                    <Star size={14} className="fill-accent-foreground text-accent-foreground" /> 
                    April lineup
                </div>
            </div>

            <div className="space-y-4">
                {birthdays.map((p) => {
                    const config = getStatusConfig(p.daysUntil || 100);
                    return (
                        <div key={p.id} className="flex items-center gap-4 bg-card p-3 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer overflow-hidden relative">
                            {/* Left Indicator Bar */}
                            <div className={`absolute left-0 top-1/4 bottom-1/4 w-1.5 ${config.indicator} rounded-r-full group-hover:top-2 group-hover:bottom-2 transition-all`} />

                            <div className="ml-2">
                                <Avatar src={p.avatar} alt={p.name} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground truncate tracking-tight">{p.name}</p>
                                <p className="text-xs text-muted-foreground truncate font-medium">{p.role}</p>
                            </div>

                            <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-foreground mb-1">{p.date}</p>
                                <div className={`flex items-center gap-1 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-tight ${config.badge} transition-opacity`}>
                                    <Sparkles size={10} className="shrink-0" />
                                    {config.label}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
