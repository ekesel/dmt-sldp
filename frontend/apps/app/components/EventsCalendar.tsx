'use client';

import React from 'react';
import { Card } from "@dmt/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const CALENDAR_DAYS = [
    { day: 26, muted: true }, { day: 27, muted: true }, { day: 28, muted: true }, { day: 29, muted: true }, { day: 30, muted: true }, { day: 1 }, { day: 2 },
    { day: 3 }, { day: 4 }, { day: 5 }, { day: 6 }, { day: 7 }, { day: 8 }, { day: 9 },
    { day: 10 }, { day: 11 }, { day: 12 }, { day: 13 }, { day: 14 }, { day: 15 }, { day: 16 },
    { day: 17 }, { day: 18 }, { day: 19 }, { day: 20 }, { day: 21 }, { day: 22 }, { day: 23 },
    { day: 24 }, { day: 25 }, { day: 26 }, { day: 27 }, { day: 28 }, { day: 29, event: true }, { day: 30 }, { day: 31 }
];

/**
 * Compact white-themed EventsCalendar matching the reference image.
 */
const EventsCalendar: React.FC = () => {
    return (
        <Card className="overflow-hidden border border-border shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.05)] bg-card rounded-[1.5rem] px-3 pb-3 pt-1.5 sm:px-4 sm:pb-4 sm:pt-2 lg:px-5 lg:pb-5 lg:pt-3 xl:px-4 xl:pb-4 xl:pt-2 w-full h-full xl:max-h-[16.25rem]">
            <div className="flex flex-col space-y-2 sm:space-y-3 lg:space-y-4 xl:space-y-3">
                {/* Simple Header */}
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <button className="p-1 rounded-full hover:bg-secondary transition-colors">
                            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 xl:h-4 xl:w-4 text-muted-foreground" />
                        </button>
                        <p className="text-[0.8125rem] sm:text-[0.875rem] lg:text-[1rem] xl:text-[0.875rem] font-bold text-card-foreground">October 2023</p>
                        <button className="p-1 rounded-full hover:bg-secondary transition-colors">
                            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 xl:h-4 xl:w-4 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-y-1 sm:gap-y-1.5 lg:gap-y-2 xl:gap-y-1.5 text-center">
                    {DAYS.map((d) => (
                        <span key={d} className="text-[0.625rem] sm:text-[0.6875rem] lg:text-[0.8125rem] xl:text-[0.6875rem] font-bold text-muted-foreground mb-0.5 sm:mb-1 lg:mb-1.5 xl:mb-1">
                            {d.slice(0, 2)}
                        </span>
                    ))}

                    {CALENDAR_DAYS.map((entry, i) => (
                        <div key={i} className="flex flex-col items-center justify-center relative py-0.5 sm:py-1 lg:py-1.5 xl:py-1">
                            <div
                                className={`flex h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 xl:h-6 xl:w-6 items-center justify-center rounded-full text-[0.625rem] sm:text-[0.75rem] lg:text-[0.875rem] xl:text-[0.75rem] font-semibold transition-all cursor-pointer ${entry.day === 25 && !entry.muted // Assume 25th is active for demo
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : entry.muted
                                            ? "text-muted-foreground/30"
                                            : "text-card-foreground hover:bg-secondary"
                                    }`}
                            >
                                {entry.day}
                            </div>

                            {entry.event && (
                                <div className="absolute bottom-0.5 sm:bottom-1 lg:bottom-1.5 xl:bottom-1 w-1.5 h-1.5 lg:w-2 lg:h-2 xl:w-1.5 xl:h-1.5 bg-destructive rounded-full border border-card" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};

export default EventsCalendar;
