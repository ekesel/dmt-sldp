'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface DatePickerProps {
    label: string;
    value: string; // 'YYYY-MM-DD'
    onChange: (dateStr: string) => void;
    min?: string;
    max?: string;
    className?: string;
    popoverAlign?: 'left' | 'right';
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
        const [y, m, d] = dateStr.split('-').map(Number);
        if (!y || !m || !d) return dateStr;
        const monthName = SHORT_MONTH_NAMES[m - 1] || '';
        return `${monthName} ${d}, ${y}`;
    } catch {
        return dateStr;
    }
}

export const DatePicker: React.FC<DatePickerProps> = ({
    label,
    value,
    onChange,
    min = '2000-01-01',
    max,
    className = '',
    popoverAlign = 'left'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const effectiveMax = max || todayStr;
    const effectiveMin = min || '2000-01-01';

    const minParts = effectiveMin.split('-').map(Number);
    const minYear = minParts[0] || 2000;
    const minMonth = Math.max(0, (minParts[1] || 1) - 1);

    const maxParts = effectiveMax.split('-').map(Number);
    const maxYear = maxParts[0] || today.getFullYear();
    const maxMonth = Math.min(11, (maxParts[1] || (today.getMonth() + 1)) - 1);

    // Internal calendar view navigation state (independent of currently selected day)
    const [viewYear, setViewYear] = useState<number>(() => {
        if (value) {
            const y = parseInt(value.split('-')[0], 10);
            if (!isNaN(y)) return Math.min(maxYear, Math.max(minYear, y));
        }
        return Math.min(maxYear, Math.max(minYear, today.getFullYear()));
    });

    const [viewMonth, setViewMonth] = useState<number>(() => {
        if (value) {
            const [y, m] = value.split('-').map(Number);
            if (!isNaN(m) && m >= 1 && m <= 12) {
                let monthIdx = m - 1;
                if (y === minYear && monthIdx < minMonth) monthIdx = minMonth;
                if (y === maxYear && monthIdx > maxMonth) monthIdx = maxMonth;
                return monthIdx;
            }
        }
        let currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        if (currentYear === minYear && currentMonth < minMonth) currentMonth = minMonth;
        if (currentYear === maxYear && currentMonth > maxMonth) currentMonth = maxMonth;
        return currentMonth;
    });

    // When popover opens or value changes from outside, align view with value (or today) and clamp to bounds
    useEffect(() => {
        if (isOpen) {
            let targetYear = today.getFullYear();
            let targetMonth = today.getMonth();

            if (value) {
                const [y, m] = value.split('-').map(Number);
                if (y && m) {
                    targetYear = y;
                    targetMonth = m - 1;
                }
            }

            if (targetYear < minYear) {
                targetYear = minYear;
                targetMonth = minMonth;
            } else if (targetYear > maxYear) {
                targetYear = maxYear;
                targetMonth = maxMonth;
            } else if (targetYear === minYear && targetMonth < minMonth) {
                targetMonth = minMonth;
            } else if (targetYear === maxYear && targetMonth > maxMonth) {
                targetMonth = maxMonth;
            }

            setViewYear(targetYear);
            setViewMonth(targetMonth);
        }
    }, [isOpen, value, minYear, minMonth, maxYear, maxMonth]);

    // Close on click outside or Escape
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const canGoPrev = viewYear > minYear || (viewYear === minYear && viewMonth > minMonth);
    const canGoNext = viewYear < maxYear || (viewYear === maxYear && viewMonth < maxMonth);

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canGoPrev) return;
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(prev => prev - 1);
        } else {
            setViewMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canGoNext) return;
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(prev => prev + 1);
        } else {
            setViewMonth(prev => prev + 1);
        }
    };

    const handleMonthSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const targetMonth = Number(e.target.value);
        if (viewYear === minYear && targetMonth < minMonth) return;
        if (viewYear === maxYear && targetMonth > maxMonth) return;
        setViewMonth(targetMonth);
    };

    const handleYearSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const targetYear = Number(e.target.value);
        setViewYear(targetYear);
        if (targetYear === minYear && viewMonth < minMonth) {
            setViewMonth(minMonth);
        } else if (targetYear === maxYear && viewMonth > maxMonth) {
            setViewMonth(maxMonth);
        }
    };

    const handleDateClick = (dayNumber: number) => {
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
        onChange(dateStr);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setIsOpen(false);
    };

    // Calculate calendar grid
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    // Year range for dropdown (from min year up to current year)
    const yearOptions: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
        yearOptions.push(y);
    }

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                className="flex items-center gap-2 bg-card border border-border hover:border-primary/40 px-4 py-2 rounded-lg transition-all duration-300 w-56 h-12 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
            >
                <CalendarDays size={18} className="text-primary shrink-0" />
                <div className="flex flex-col flex-1 justify-center min-w-0">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">
                        {label}
                    </span>
                    <span className={`font-medium text-sm leading-none truncate ${value ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                        {formatDisplayDate(value) || 'Select date'}
                    </span>
                </div>
            </button>

            {/* Calendar Popover */}
            {isOpen && (
                <div
                    role="dialog"
                    aria-label={`Select ${label} Date`}
                    className={`absolute top-[calc(100%+0.5rem)] ${popoverAlign === 'right' ? 'right-0' : 'left-0'} z-50 bg-card border border-border rounded-2xl shadow-2xl p-4 w-72 backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150`}
                >
                    {/* Month / Year Navigation Header */}
                    <div className="flex items-center justify-between mb-3 gap-1">
                        <button
                            type="button"
                            disabled={!canGoPrev}
                            onClick={handlePrevMonth}
                            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                            title="Previous month"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex items-center gap-1 font-bold text-sm text-foreground">
                            {/* Month Dropdown */}
                            <select
                                aria-label="Select month"
                                value={viewMonth}
                                onChange={handleMonthSelect}
                                className="bg-transparent font-bold text-foreground text-xs cursor-pointer outline-none hover:text-primary transition-colors pr-1 py-1"
                            >
                                {MONTH_NAMES.map((m, idx) => {
                                    const isMonthDisabled =
                                        (viewYear === minYear && idx < minMonth) ||
                                        (viewYear === maxYear && idx > maxMonth);
                                    return (
                                        <option
                                            key={m}
                                            value={idx}
                                            disabled={isMonthDisabled}
                                            className="bg-card text-foreground disabled:text-muted-foreground/40"
                                        >
                                            {m}
                                        </option>
                                    );
                                })}
                            </select>

                            {/* Year Dropdown */}
                            <select
                                aria-label="Select year"
                                value={viewYear}
                                onChange={handleYearSelect}
                                className="bg-transparent font-bold text-foreground text-xs cursor-pointer outline-none hover:text-primary transition-colors pr-1 py-1"
                            >
                                {yearOptions.map(y => (
                                    <option key={y} value={y} className="bg-card text-foreground">
                                        {y}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="button"
                            disabled={!canGoNext}
                            onClick={handleNextMonth}
                            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                            title="Next month"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-1">
                        {DAY_LABELS.map(d => (
                            <span key={d} className="text-[10px] font-bold text-muted-foreground py-1">
                                {d}
                            </span>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                        {/* Empty cells before first day */}
                        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                            <div key={`empty-${idx}`} className="w-8 h-8" />
                        ))}

                        {/* Day numbers in current month */}
                        {Array.from({ length: daysInMonth }).map((_, idx) => {
                            const day = idx + 1;
                            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isSelected = value === dateStr;
                            const isCurrentDay = todayStr === dateStr;

                            // Disabled if before min or after effectiveMax
                            const isDisabled = (min && dateStr < min) || (effectiveMax && dateStr > effectiveMax);

                            return (
                                <button
                                    key={dateStr}
                                    type="button"
                                    disabled={Boolean(isDisabled)}
                                    onClick={() => handleDateClick(day)}
                                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
                                        isDisabled
                                            ? 'opacity-25 cursor-not-allowed text-muted-foreground'
                                            : isSelected
                                                ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30 cursor-pointer'
                                                : isCurrentDay
                                                    ? 'border border-primary text-primary font-bold hover:bg-primary/10 cursor-pointer'
                                                    : 'text-foreground hover:bg-primary/10 hover:text-primary cursor-pointer'
                                    }`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50 text-xs">
                        {value ? (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="text-muted-foreground hover:text-destructive font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <X size={12} /> Clear
                            </button>
                        ) : (
                            <div />
                        )}
                        <button
                            type="button"
                            disabled={Boolean(todayStr > effectiveMax || (min && todayStr < min))}
                            onClick={() => {
                                onChange(todayStr);
                                setIsOpen(false);
                            }}
                            className="text-primary hover:underline font-semibold ml-auto cursor-pointer disabled:opacity-40 disabled:no-underline"
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatePicker;
