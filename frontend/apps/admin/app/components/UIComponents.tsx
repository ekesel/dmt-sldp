import React from 'react';
import { X } from 'lucide-react';

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
            bg-card/50 border border-border rounded-xl p-6
            hover:border-border/80 transition-all duration-300
            ${className}
        `}
    >
        <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                <Icon className="w-5 h-5 text-primary" />
            </div>
            {trend && (
                <div className={`text-sm font-medium ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
                    {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </div>
            )}
        </div>
        <h3 className="text-muted-foreground text-sm font-medium mb-2">{title}</h3>
        <p className="text-2xl font-bold text-foreground mb-1">{value}</p>
        {description && <p className="text-xs text-muted-foreground/60">{description}</p>}
    </div>
);

export const Badge: React.FC<{
    label: string;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'neutral';
}> = ({ label, variant = 'default' }) => {
    const variants = {
        default: 'bg-secondary text-secondary-foreground',
        success: 'bg-success/10 text-success border border-success/20',
        warning: 'bg-warning/10 text-warning border border-warning/20',
        error: 'bg-destructive/10 text-destructive border border-destructive/20',
        neutral: 'bg-muted/50 text-muted-foreground border border-border',
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
        <div className="p-3 bg-muted rounded-lg mb-4">
            <Icon className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-sm">{description}</p>
        {action && (
            <button
                onClick={action.onClick}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition"
            >
                {action.label}
            </button>
        )}
    </div>
);
export const Modal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
}> = ({ isOpen, onClose, title, description, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="bg-popover border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">{title}</h2>
                        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg transition text-muted-foreground hover:text-foreground">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};
