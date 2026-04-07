"use client"

import React from 'react';
import { ArrowRight, Gift, Sparkles } from 'lucide-react';
import { Avatar, BirthdayPerson } from './UpcomingBirthdaysUI';

interface TodayBirthdaysProps {
    birthdays: BirthdayPerson[];
}

export default function TodayBirthdays({ birthdays }: TodayBirthdaysProps) {
    return (
        <div className="relative overflow-hidden bg-vibrant-gradient text-accent-foreground p-8 min-h-80 rounded-lg">
            {/* Enhanced Background Gradient Overlay */}
            <div className="absolute inset-0 z-0 bg-vibrant-glow pointer-events-none" />

            {/* Dotted Pattern Overlay */}
            <div className="absolute inset-0 z-0 pointer-events-none bg-dots-pattern opacity-40" />

            {/* Moon-like Circular Shape (Top Left) */}
            <div className="absolute -top-4 -left-3 h-18 w-18 rounded-full decorative-shape-1" />

            {/* Secondary Floating Shape (Top Right) */}
            <div className="absolute top-2 -right-3 h-18 w-18 rounded-full decorative-shape-2" />

            <div className="relative z-10">
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-3 bg-accent-foreground/10 backdrop-blur-md border border-accent-foreground/10 px-6 py-2 rounded-full text-[11px] uppercase font-bold tracking-widest text-accent-foreground transition-all duration-300 hover:bg-accent-foreground/20 hover:scale-105 cursor-default group/badge">
                        <Sparkles size={14} className="text-accent-foreground/80 group-hover/badge:scale-110 transition-transform" />
                        Today’s Celebration
                    </div>
                    <button className="bg-card text-accent px-7 py-3 rounded-full flex items-center gap-3 text-sm font-bold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95 group">
                        Wish Now <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                <div className="mb-10 max-w-xl">
                    <h2 className="text-4xl font-extrabold leading-tight tracking-tight mb-4">
                        Wish the birthday crew <br />
                        before the day gets away.
                    </h2>
                    <p className="text-accent-foreground font-medium leading-relaxed opacity-80 text-lg">
                        Two teammates are celebrating today. Make it loud, warm, and personal.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {birthdays.map((p) => (
                        <div key={p.id} className="glass-card p-4 rounded-3xl flex items-center gap-4 hover:bg-accent-foreground/20 transition-all duration-500 group cursor-pointer shadow-lg">
                            <div className="relative">
                                <div className="h-16 w-16 rounded-full p-0.5 bg-gradient-to-tr from-accent-foreground/40 to-transparent">
                                    <img src={p.avatar} alt={p.name} className="h-full w-full rounded-full object-cover" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-lg font-bold text-accent-foreground truncate">{p.name.split(' ')[0]}...</p>
                                <p className="text-xs text-accent-foreground truncate font-semibold uppercase tracking-wider opacity-60">
                                    {p.role.split(' ')[0]}...
                                </p>
                            </div>
                            <div className="bg-accent-foreground/10 p-3 rounded-2xl group-hover:bg-card group-hover:text-accent group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300 shadow-inner group-hover:shadow-lg">
                                <Gift size={20} className="shrink-0" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
