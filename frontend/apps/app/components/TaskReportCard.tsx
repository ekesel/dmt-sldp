'use client';

import React from 'react';
import Image from 'next/image';
import { Check, UserPlus, Info } from 'lucide-react';

interface TaskReportCardProps {
    completed?: number;
    total?: number;
    avatars?: string[];
}

/**
 * TaskReportCard component matching the reference image.
 * Features a high-fidelity progress bar with percentage and team avatars.
 */
export const TaskReportCard: React.FC<TaskReportCardProps> = ({
    completed = 23,
    total = 50,
    avatars = [
        "https://i.pravatar.cc/150?u=a",
        "https://i.pravatar.cc/150?u=b",
        "https://i.pravatar.cc/150?u=c"
    ]
}) => {
    const percentage = Math.round((completed / total) * 100);

    return (
        <div className="w-full space-y-4">
            {/* Title Header */}
            <h2 className="text-[20px] font-bold text-[#111827] tracking-tight ml-1">
                Task Report
            </h2>

            {/* Main Card Container */}
            <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-5 w-full max-w-full space-y-4">
                
                {/* Header Section: Stats and Avatars */}
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-[17px] font-bold text-[#111827]">
                        Task Done: <span className="text-[#FFAB40] ml-1">{completed} / {total}</span>
                    </h3>

                    {/* Overlapping Avatars */}
                    <div className="flex -space-x-2.5">
                        {avatars.map((url, i) => (
                            <div key={i} className="relative w-7 h-7 rounded-full border-2 border-white overflow-hidden shadow-sm">
                                <Image
                                    src={url}
                                    alt="Team member"
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Custom Progress Bar */}
                <div className="relative h-[32px] w-full bg-[#FEF3E2] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-[#FFAB40] rounded-full flex items-center justify-center transition-all duration-1000 ease-out shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"
                        style={{ width: `${percentage}%` }}
                    >
                        <span className="text-white font-[900] text-[15px] tracking-tight">
                            {percentage}%
                        </span>
                    </div>
                </div>

                {/* Divider Line */}
                <div className="h-[1px] bg-gray-100/50 w-full" />

                {/* Action Footer */}
                <div className="flex justify-between items-center px-1 pt-2 gap-4">
                    <button className="flex items-center gap-1.5 text-[#4B5563] hover:text-[#FFAB40] transition-colors font-bold text-[13.5px] group whitespace-nowrap">
                        <Check size={16} className="text-gray-400 group-hover:text-[#FFAB40]" />
                        <span>Mark Complete</span>
                    </button>
                    
                    <button className="flex items-center gap-1.5 text-[#4B5563] hover:text-[#FFAB40] transition-colors font-bold text-[13.5px] group whitespace-nowrap">
                        <UserPlus size={16} className="text-gray-400 group-hover:text-[#FFAB40]" />
                        <span>Delegate</span>
                    </button>
                    
                    <button className="flex items-center gap-1.5 text-[#4B5563] hover:text-[#FFAB40] transition-colors font-bold text-[13.5px] group whitespace-nowrap">
                        <Info size={16} className="text-gray-400 group-hover:text-[#FFAB40]" />
                        <span>Details</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskReportCard;
