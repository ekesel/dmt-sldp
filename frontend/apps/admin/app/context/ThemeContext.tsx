'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { user, isLoading } = useAuth();
    // Default to dark mode
    const [theme, setThemeState] = useState<Theme>('dark');
    const [mounted, setMounted] = useState(false);

    // Get storage key based on user
    const getStorageKey = () => {
        if (user && user.username) {
            return `dmt-theme-${user.username}`;
        }
        return 'dmt-theme-guest';
    };

    // Load theme from storage when user changes or app mounts
    useEffect(() => {
        if (isLoading) return;

        const key = getStorageKey();
        const savedTheme = localStorage.getItem(key) as Theme;

        if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
            setThemeState(savedTheme);
        } else {
            // Default to dark if no preference found
            setThemeState('dark');
        }
        setMounted(true);
    }, [user, isLoading]);

    // Apply theme to document
    useEffect(() => {
        if (!mounted) return;

        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);

        const key = getStorageKey();
        localStorage.setItem(key, theme);
    }, [theme, mounted, user]); // Re-run if user changes to ensure we save to new key

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    // Avoid hydration mismatch by not rendering until mounted
    // if (!mounted) {
    //     return <>{children}</>;
    // }

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {/* Prevent hydration mismatch for theme-dependent UI by only showing when mounted 
                 OR accept that server renders default 'dark' match. 
                 Since we default to 'dark', we can render immediately. 
                 However, to avoid flash, we can use the `mounted` check inside consumers if needed, 
                 but here we just provide the context. */ }
            <div style={{ visibility: mounted ? 'visible' : 'hidden' }}>
                {children}
            </div>
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
