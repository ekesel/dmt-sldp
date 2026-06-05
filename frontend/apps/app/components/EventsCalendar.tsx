'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@dmt/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dashboard } from "@dmt/api";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface Holiday {
  id?: number;
  name: string;
  date: string; // e.g. "2025-01-01"
  description?: string;
  [key: string]: unknown;
}

/** Compact white-themed EventsCalendar with live holiday data from API. */
const EventsCalendar: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const today = new Date();

    // Fetch holidays once on mount
    useEffect(() => {
        dashboard.getHolidays()
            .then((data: any) => {
                // API returns { holidays: [...] } — extract the array
                const list = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.holidays)
                        ? data.holidays
                        : [];
                setHolidays(list);
            })
            .catch(() => {
                // silently fail — calendar still works without holiday data
            });
    }, []);

    // Build a lookup: "YYYY-MM-DD" -> holiday name(s)
    const holidayMap = new Map<string, string[]>();
    holidays.forEach((h) => {
        if (!h.date) return;
        const key = h.date.slice(0, 10); // normalise to YYYY-MM-DD
        if (!holidayMap.has(key)) {
            holidayMap.set(key, []);
        }
        holidayMap.get(key)!.push(h.name);
    });

    const isHolidayDate = (year: number, month: number, day: number): string[] => {
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return holidayMap.get(key) ?? [];
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    };

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const calendarDays: { day: number; muted: boolean; year: number; month: number }[] = [];

    // Previous month trailing days
    for (let i = 0; i < firstDayOfMonth; i++) {
        const d = daysInPrevMonth - firstDayOfMonth + i + 1;
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        calendarDays.push({ day: d, muted: true, year: prevYear, month: prevMonth });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push({ day: i, muted: false, year: currentYear, month: currentMonth });
    }

    // Fill remaining cells
    const totalCells = calendarDays.length > 35 ? 42 : 35;
    const remainingCells = totalCells - calendarDays.length;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    for (let i = 1; i <= remainingCells; i++) {
        calendarDays.push({ day: i, muted: true, year: nextYear, month: nextMonth });
    }

    // Hide tooltip when clicking outside
    useEffect(() => {
        const handleClick = () => setTooltip(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    return (
        <Card className="overflow-hidden border border-border shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.05)] bg-card rounded-[1.5rem] px-3 pb-3 pt-1.5 sm:px-4 sm:pb-4 sm:pt-2 lg:px-5 lg:pb-5 lg:pt-3 xl:px-4 xl:pb-4 xl:pt-2 w-full h-full xl:max-h-[16.25rem]">
            <div className="flex flex-col space-y-2 sm:space-y-3 lg:space-y-4 xl:space-y-3">
                {/* Header */}
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
                <div className="relative grid grid-cols-7 gap-y-1 sm:gap-y-1.5 lg:gap-y-2 xl:gap-y-1.5 text-center">
                    {DAYS.map((d) => (
                        <span key={d} className="text-[0.625rem] sm:text-[0.6875rem] lg:text-[0.8125rem] xl:text-[0.6875rem] font-bold text-muted-foreground mb-0.5 sm:mb-1 lg:mb-1.5 xl:mb-1">
                            {d.slice(0, 2)}
                        </span>
                    ))}

                    {calendarDays.map((entry, i) => {
                        const isToday =
                            !entry.muted &&
                            entry.day === today.getDate() &&
                            entry.month === today.getMonth() &&
                            entry.year === today.getFullYear();

                        const holidayNames = entry.muted
                            ? []
                            : isHolidayDate(entry.year, entry.month, entry.day);
                        const isHoliday = holidayNames.length > 0;

                        return (
                            <div
                                key={i}
                                className="flex flex-col items-center justify-center relative py-0.5 sm:py-1 lg:py-1.5 xl:py-1"
                            >
                                <div
                                    title={isHoliday ? holidayNames.join(', ') : undefined}
                                    onClick={(e) => {
                                        if (isHoliday) {
                                            e.stopPropagation();
                                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                            setTooltip({
                                                text: holidayNames.join(', '),
                                                x: rect.left + rect.width / 2,
                                                y: rect.bottom + 6,
                                            });
                                        }
                                    }}
                                    className={`flex h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 xl:h-6 xl:w-6 items-center justify-center rounded-full text-[0.625rem] sm:text-[0.75rem] lg:text-[0.875rem] xl:text-[0.75rem] font-semibold transition-all ${
                                        isHoliday ? 'cursor-pointer' : 'cursor-default'
                                    } ${
                                        isToday
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : isHoliday
                                                ? 'bg-accent text-accent-foreground shadow-sm hover:opacity-90'
                                                : entry.muted
                                                    ? 'text-muted-foreground/30'
                                                    : 'text-card-foreground hover:bg-secondary'
                                    }`}
                                >
                                    {entry.day}
                                </div>

                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                {holidays.length > 0 && (
                    <div className="flex items-center gap-1.5 px-1 pt-0.5">
                        <span className="h-2 w-2 rounded-full bg-accent flex-shrink-0" />
                        <span className="text-[0.6rem] sm:text-[0.65rem] xl:text-[0.625rem] text-muted-foreground">
                            Holiday
                        </span>
                    </div>
                )}
            </div>

            {/* Floating tooltip rendered in a portal-like div */}
            {tooltip && (
                <div
                    ref={tooltipRef}
                    style={{ position: 'fixed', left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)', zIndex: 9999 }}
                    className="pointer-events-none max-w-[12rem] rounded-md bg-gray-900 px-2 py-1 text-[0.65rem] text-white shadow-lg text-center"
                >
                    {tooltip.text}
                </div>
            )}
        </Card>
    );
};

export default EventsCalendar;
