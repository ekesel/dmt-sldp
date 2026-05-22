'use client';

import React, { useState } from 'react';
import { Card } from "@dmt/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * Compact white-themed EventsCalendar matching the reference image.
 */
const EventsCalendar: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const today = new Date();

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    };

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const calendarDays = [];

    // Previous month days
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push({
            day: daysInPrevMonth - firstDayOfMonth + i + 1,
            muted: true,
            event: false
        });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push({
            day: i,
            muted: false,
            // Keep a mock event for demo purposes on the 29th
            event: i === 29
        });
    }

    // Fill remaining cells
    const totalCells = calendarDays.length > 35 ? 42 : 35;
    const remainingCells = totalCells - calendarDays.length;
    for (let i = 1; i <= remainingCells; i++) {
        calendarDays.push({
            day: i,
            muted: true,
            event: false
        });
    }

    return (
        <Card className="overflow-hidden border border-border shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.05)] bg-card rounded-[1.5rem] px-3 pb-3 pt-1.5 sm:px-4 sm:pb-4 sm:pt-2 lg:px-5 lg:pb-5 lg:pt-3 xl:px-4 xl:pb-4 xl:pt-2 w-full h-full xl:max-h-[16.25rem]">
            <div className="flex flex-col space-y-2 sm:space-y-3 lg:space-y-4 xl:space-y-3">
                {/* Simple Header */}
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-secondary transition-colors">
                            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 xl:h-4 xl:w-4 text-muted-foreground" />
                        </button>
                        <p className="text-[0.8125rem] sm:text-[0.875rem] lg:text-[1rem] xl:text-[0.875rem] font-bold text-card-foreground">
                            {MONTH_NAMES[currentMonth]} {currentYear}
                        </p>
                        <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-secondary transition-colors">
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

                    {calendarDays.map((entry, i) => {
                        const isToday = !entry.muted && entry.day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

                        return (
                            <div key={i} className="flex flex-col items-center justify-center relative py-0.5 sm:py-1 lg:py-1.5 xl:py-1">
                                <div
                                    className={`flex h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 xl:h-6 xl:w-6 items-center justify-center rounded-full text-[0.625rem] sm:text-[0.75rem] lg:text-[0.875rem] xl:text-[0.75rem] font-semibold transition-all cursor-pointer ${
                                        isToday
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : entry.event
                                                ? "bg-accent text-accent-foreground shadow-sm"
                                                : entry.muted
                                                    ? "text-muted-foreground/30"
                                                    : "text-card-foreground hover:bg-secondary"
                                    }`}
                                >
                                    {entry.day}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
};

export default EventsCalendar;
