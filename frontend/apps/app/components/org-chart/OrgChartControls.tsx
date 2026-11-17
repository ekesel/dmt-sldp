'use client';

import React from 'react';
import { Plus, Grid, Layers, RotateCcw } from 'lucide-react';

interface OrgChartControlsProps {
    currentDirection: 'TB' | 'LR';
    onAutoArrange: (direction: 'TB' | 'LR') => void;
    onAddClick: () => void;
    onResetChart?: () => void;
    isManager: boolean;
}

export const OrgChartControls: React.FC<OrgChartControlsProps> = ({
    currentDirection,
    onAutoArrange,
    onAddClick,
    onResetChart,
    isManager
}) => {
    return (
        <div className="flex items-center justify-end gap-4">
            {/* Right: Layout & Actions */}
            <div className="flex flex-wrap items-center gap-3.5 shrink-0 justify-end">
                {/* Direction auto-arrange */}
                <div className="flex items-center bg-muted/80 p-1 rounded-xl border border-border/40 shrink-0">
                    <button
                        onClick={() => onAutoArrange('TB')}
                        className={`px-3 py-1.5 rounded-lg text-[0.75rem] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            currentDirection === 'TB'
                                ? 'bg-background text-primary shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Top to Bottom Layout"
                    >
                        <Layers className="w-3.5 h-3.5" />
                        Vertical
                    </button>
                    <button
                        onClick={() => onAutoArrange('LR')}
                        className={`px-3 py-1.5 rounded-lg text-[0.75rem] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            currentDirection === 'LR'
                                ? 'bg-background text-primary shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Left to Right Layout"
                    >
                        <Grid className="w-3.5 h-3.5" />
                        Horizontal
                    </button>
                </div>

                {onResetChart && (
                    <button
                        onClick={onResetChart}
                        className="px-2.5 py-1.5 rounded-xl text-[0.75rem] font-bold flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer border border-border/40 shrink-0"
                        title="Reset Chart View"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Reset</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default OrgChartControls;
