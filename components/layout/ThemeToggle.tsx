'use client';

import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';

/* ============================================================
   ATLAS — ThemeToggle Component
   Smooth sun/moon toggle with Framer Motion
   ============================================================ */

export function ThemeToggle() {
    const { theme, toggleTheme, isDark } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            title={`Current: ${theme} mode`}
        >
            <motion.div
                key={isDark ? 'moon' : 'sun'}
                initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
            >
                {isDark ? (
                    <Moon className="h-5 w-5" />
                ) : (
                    <Sun className="h-5 w-5" />
                )}
            </motion.div>
        </button>
    );
}
