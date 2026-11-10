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
            .then((data: unknown) => {
                const record = data as { holidays?: Holiday[] } | Holiday[] | undefined;
                const list = Array.isArray(record)
                    ? record
                    : Array.isArray(record?.holidays)
                        ? record.holidays
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
        <Card className="overflow-hidden border border-border shadow-sm bg-card rounded-2xl p-3 sm:p-4 w-full h-full min-h-[14rem] sm:min-h-[15rem] md:min-h-[16.25rem] xl:max-h-[16.25rem] flex flex-col justify-between">
            <div className="flex flex-col space-y-1 sm:space-y-1.5 xl:space-y-1">
                {/* Header */}
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <button onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-secondary transition-colors" aria-label="Previous month">
                            <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                        </button>
                        <p className="text-xs sm:text-sm md:text-base font-bold text-card-foreground">
                            {MONTH_NAMES[currentMonth]} {currentYear}
                        </p>
                        <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-secondary transition-colors" aria-label="Next month">
                            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="relative grid grid-cols-7 gap-y-0.5 sm:gap-y-1 text-center">
                    {DAYS.map((d) => (
                        <span key={d} className="text-[0.625rem] sm:text-xs font-bold text-muted-foreground mb-0.5 sm:mb-1">
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
                                className="flex flex-col items-center justify-center relative py-0.5"
                            >
                                <div
                                    title={isHoliday ? holidayNames.join(', ') : undefined}
                                    onClick={(e) => {
                                        if (isHoliday) {
                                            e.stopPropagation();
                                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                            setTooltip({
                                                text: holidayNames.join(', '),
                                                x: Math.max(70, Math.min(window.innerWidth - 70, rect.left + rect.width / 2)),
                                                y: rect.bottom + 6,
                                            });
                                        }
                                    }}
                                    className={`flex h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 xl:h-7 xl:w-7 items-center justify-center rounded-full text-xs sm:text-sm font-semibold transition-all ${
                                        isHoliday ? 'cursor-pointer' : 'cursor-default'
                                    } ${
                                        isToday
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : isHoliday
                                                ? 'bg-accent text-accent-foreground shadow-sm hover:opacity-90'
                                                : entry.muted
                                                    ? ''
                                                    : 'text-card-foreground hover:bg-secondary'
                                    }`}
                                >
                                    {!entry.muted && entry.day}
                                </div>

                            </div>
                        );
                    })}
                </div>


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
