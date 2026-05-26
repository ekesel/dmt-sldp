'use client';

import React from 'react';
import Link from 'next/link';
import { Network, Palmtree, CalendarHeart, FileText, GraduationCap, Rocket } from 'lucide-react';

interface TileProps {
    title: string;
    Icon: React.ElementType;
    bgColor: string;
    textColor: string;
}

const Tile: React.FC<TileProps> = ({ title, Icon, bgColor, textColor }) => (
    <div className={`${bgColor} w-full aspect-square rounded-[1.25rem] flex flex-col items-center justify-center p-2.5 sm:p-3.5 text-center cursor-pointer hover:opacity-95 transition-all shadow-sm group active:scale-95 saturate-[1.15]`}>
        <div className={`${textColor} mb-1.5 sm:mb-2 transform group-hover:scale-110 transition-transform duration-300`}>
            <Icon
                className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8"
                strokeWidth={2.5}
            />
        </div>
        <span className={`${textColor} text-[0.55rem] sm:text-[0.625rem] lg:text-[0.75rem] font-[900] leading-[1.1] px-0.5 overflow-hidden text-ellipsis line-clamp-2`}>
            {title}
        </span>
    </div>
);

/**
 * QuickAccessTiles component matching the reference image.
 * Features a grid of colorful navigation cards for quick actions.
 */
export const QuickAccessTiles: React.FC = () => {
    const tiles = [
        { title: "Org Chart", Icon: Network, bgColor: "bg-accent", textColor: "text-accent-foreground", href: "/org-chart" },
        { title: "Holiday Calendar", Icon: Palmtree, bgColor: "bg-accent", textColor: "text-accent-foreground", href: "/holiday-calendar" },
        { title: "Engagement Calendar", Icon: CalendarHeart, bgColor: "bg-accent", textColor: "text-accent-foreground", href: "/engagement-calendar" },
        { title: "Policies", Icon: FileText, bgColor: "bg-accent", textColor: "text-accent-foreground", href: "/policies" },
        { title: "Learning & Development", Icon: GraduationCap, bgColor: "bg-accent", textColor: "text-accent-foreground", href: "/learning-and-development" },
        { title: "Onboarding", Icon: Rocket, bgColor: "bg-accent", textColor: "text-accent-foreground", href: "/onboarding" },
    ];

    return (
        <div className="w-full h-full flex flex-col">
            <div className="bg-card rounded-[1.5rem] border border-border shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.05)] p-4 sm:p-5 w-full h-full flex flex-col">
                <h2 className="text-[1.125rem] sm:text-[1.25rem] md:text-[1.375rem] font-black text-foreground mb-3 tracking-tight flex-shrink-0">
                    Quick Links
                </h2>
                {/* Grid Container */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 w-full max-w-[25rem] sm:max-w-[35rem] md:max-w-[45rem] lg:max-w-none mx-auto overflow-y-auto pr-1 pb-1 flex-1 min-h-0 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-muted/10 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/50 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {tiles.map((tile, i) => (
                        <Link key={i} href={tile.href} className="w-full block">
                            <Tile title={tile.title} Icon={tile.Icon} bgColor={tile.bgColor} textColor={tile.textColor} />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default QuickAccessTiles;
