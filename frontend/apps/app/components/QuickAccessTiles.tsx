'use client';

import React from 'react';
import { Network, Palmtree, CalendarHeart, FileText, GraduationCap } from 'lucide-react';

interface TileProps {
    title: string;
    Icon: React.ElementType;
    bgColor: string;
    textColor: string;
}

const Tile: React.FC<TileProps> = ({ title, Icon, bgColor, textColor }) => (
    <div className={`${bgColor} w-full aspect-square rounded-[0.875rem] flex flex-col items-center justify-center p-1.5 sm:p-2 text-center cursor-pointer hover:opacity-95 transition-all shadow-sm group active:scale-95`}>
        <div className={`${textColor} mb-1 sm:mb-1.5 transform group-hover:scale-110 transition-transform duration-300`}>
            <Icon 
                className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" 
                strokeWidth={2.5} 
            />
        </div>
        <span className={`${textColor} text-[0.5rem] sm:text-[0.5625rem] lg:text-[0.625rem] font-[900] leading-[1.1] px-0.5 overflow-hidden text-ellipsis line-clamp-2`}>
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
        { title: "Org Chart", Icon: Network, bgColor: "bg-primary", textColor: "text-primary-foreground" },
        { title: "Holiday Calendar", Icon: Palmtree, bgColor: "bg-primary", textColor: "text-primary-foreground" },
        { title: "Employee Engagement Calendar", Icon: CalendarHeart, bgColor: "bg-primary", textColor: "text-primary-foreground" },
        { title: "Policies", Icon: FileText, bgColor: "bg-accent", textColor: "text-accent-foreground" },
        { title: "Learning & Development", Icon: GraduationCap, bgColor: "bg-accent", textColor: "text-accent-foreground" },
    ];

    return (
        <div className="w-full">
            {/* Grid Container */}
            <div className="grid grid-cols-3 xs:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 gap-2 sm:gap-2.5 w-full max-w-[25rem] sm:max-w-[35rem] md:max-w-[45rem] lg:max-w-none xl:max-h-[19.5rem] mx-auto overflow-hidden">
                {tiles.map((tile, i) => (
                    <Tile key={i} title={tile.title} Icon={tile.Icon} bgColor={tile.bgColor} textColor={tile.textColor} />
                ))}
            </div>
        </div>
    );
};

export default QuickAccessTiles;
