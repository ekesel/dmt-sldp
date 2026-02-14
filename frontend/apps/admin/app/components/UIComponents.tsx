import React from 'lucide-react';

export const StatCard: React.FC<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string | number;
    description?: string;
    trend?: { value: number; isPositive: boolean };
    className?: string;
}> = ({ icon: Icon, title, value, description, trend, className = '' }) => (
    <div
        className={`
            bg-slate-900/50 border border-slate-800 rounded-xl p-6
            hover:border-slate-700 transition-all duration-300
            ${className}
        `}
    >
        <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <Icon className="w-5 h-5 text-blue-400" />
            </div>
            {trend && (
                <div className={`text-sm font-medium ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </div>
            )}
        </div>
        <h3 className="text-slate-400 text-sm font-medium mb-2">{title}</h3>
        <p className="text-2xl font-bold text-white mb-1">{value}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
    </div>
);

export const Badge: React.FC<{
    label: string;
    variant?: 'default' | 'success' | 'warning' | 'error';
}> = ({ label, variant = 'default' }) => {
    const variants = {
        default: 'bg-slate-800 text-slate-300',
        success: 'bg-green-500/20 text-green-400 border border-green-500/30',
        warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
        error: 'bg-red-500/20 text-red-400 border border-red-500/30',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${variants[variant]}`}>
            {label}
        </span>
    );
};

export const EmptyState: React.FC<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    action?: { label: string; onClick: () => void };
}> = ({ icon: Icon, title, description, action }) => (
    <div className="flex flex-col items-center justify-center py-12 px-6">
        <div className="p-3 bg-slate-800 rounded-lg mb-4">
            <Icon className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-center mb-6 max-w-sm">{description}</p>
        {action && (
            <button
                onClick={action.onClick}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
            >
                {action.label}
            </button>
        )}
    </div>
);
