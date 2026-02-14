import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn(
        "bg-glass-gradient backdrop-blur-md border border-white/10 rounded-xl shadow-glass p-6",
        className
    )}>
        {children}
    </div>
);

export const Button = ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button className={cn(
        "px-4 py-2 bg-brand-primary hover:bg-brand-primary/80 text-white rounded-lg transition-all active:scale-95 font-medium",
        className
    )} {...props}>
        {children}
    </button>
);
