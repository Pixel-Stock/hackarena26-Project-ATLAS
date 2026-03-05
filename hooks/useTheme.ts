'use client';

import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { ThemeMode } from '@/types';

export function useTheme() {
    const { theme, setTheme } = useAppStore();

    const applyTheme = useCallback((mode: ThemeMode) => {
        const root = document.documentElement;
        let effectiveTheme: 'dark' | 'light' = 'dark';

        if (mode === 'system') {
            effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light';
        } else {
            effectiveTheme = mode;
        }

        root.setAttribute('data-theme', effectiveTheme);
        localStorage.setItem('atlas-theme', mode);
    }, []);

    useEffect(() => {
        // Try to restore saved theme
        const saved = localStorage.getItem('atlas-theme') as ThemeMode | null;
        const initial = saved ?? 'dark';
        setTheme(initial);
        applyTheme(initial);

        // Listen for system theme changes when in 'system' mode
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (useAppStore.getState().theme === 'system') {
                applyTheme('system');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [applyTheme, setTheme]);

    const toggleTheme = useCallback(() => {
        const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        applyTheme(next);
    }, [theme, setTheme, applyTheme]);

    const setThemeMode = useCallback(
        (mode: ThemeMode) => {
            setTheme(mode);
            applyTheme(mode);
        },
        [setTheme, applyTheme]
    );

    return {
        theme,
        toggleTheme,
        setTheme: setThemeMode,
        isDark: theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches),
    };
}
