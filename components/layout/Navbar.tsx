'use client';

import { Bell, Search, Menu } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAppStore } from '@/store/useAppStore';

/* ============================================================
   ATLAS — Navbar Component
   ============================================================ */

interface NavbarProps {
    title?: string;
}

export function Navbar({ title }: NavbarProps) {
    const { toggleSidebar, sidebarOpen } = useAppStore();

    return (
        <header className="sticky top-0 z-30 h-16 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]">
            <div className="flex items-center justify-between h-full px-6">
                {/* Left: Menu button (mobile) + Title */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleSidebar}
                        className="lg:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                        aria-label="Toggle menu"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    {title && (
                        <h1 className="font-display font-semibold text-xl text-[var(--text-primary)]">
                            {title}
                        </h1>
                    )}
                </div>

                {/* Right: Search, notifications, theme */}
                <div className="flex items-center gap-2">
                    {/* Search (desktop) */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl">
                        <Search className="h-4 w-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none w-40"
                        />
                        <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-1.5 text-[10px] font-medium text-[var(--text-muted)]">
                            ⌘K
                        </kbd>
                    </div>

                    {/* Notifications */}
                    <button
                        className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                        aria-label="Notifications"
                    >
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
                    </button>

                    {/* Theme Toggle */}
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
}
