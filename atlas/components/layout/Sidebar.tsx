'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    ScanLine,
    Receipt,
    Brain,
    Settings,
    Shield,
    ChevronLeft,
    ChevronRight,
    LogOut,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import { Tooltip } from '@/components/ui';

/* ============================================================
   ATLAS — Sidebar Component
   ============================================================ */

const NAV_ITEMS = [
    {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
    },
    {
        label: 'Scan Receipt',
        href: '/scan',
        icon: ScanLine,
    },
    {
        label: 'Transactions',
        href: '/transactions',
        icon: Receipt,
    },
    {
        label: 'Spending DNA',
        href: '/insights',
        icon: Brain,
    },
    {
        label: 'Settings',
        href: '/settings',
        icon: Settings,
    },
];

const ADMIN_ITEMS = [
    {
        label: 'Admin Panel',
        href: '/admin',
        icon: Shield,
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const { sidebarOpen, toggleSidebar } = useAppStore();
    const { isAdmin, signOut, profile } = useAuth();

    const allItems = [...NAV_ITEMS, ...(isAdmin ? ADMIN_ITEMS : [])];

    return (
        <motion.aside
            initial={false}
            animate={{ width: sidebarOpen ? 256 : 72 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed left-0 top-0 h-screen z-40 flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)]"
        >
            {/* Logo */}
            <div className="flex items-center h-16 px-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-purple)] flex items-center justify-center flex-shrink-0">
                        <span className="font-display font-bold text-white text-sm">A</span>
                    </div>
                    <AnimatePresence>
                        {sidebarOpen && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="font-display font-bold text-lg text-[var(--text-primary)] whitespace-nowrap overflow-hidden"
                            >
                                ATLAS
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                {allItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const Icon = item.icon;

                    const linkContent = (
                        <Link
                            href={item.href}
                            className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl
                transition-all duration-200
                group relative
                ${isActive
                                    ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                                }
              `}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-indicator"
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[var(--accent-primary)]"
                                    transition={{ duration: 0.2 }}
                                />
                            )}
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            <AnimatePresence>
                                {sidebarOpen && (
                                    <motion.span
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: 'auto' }}
                                        exit={{ opacity: 0, width: 0 }}
                                        className="text-sm font-medium whitespace-nowrap overflow-hidden"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </Link>
                    );

                    return sidebarOpen ? (
                        <div key={item.href}>{linkContent}</div>
                    ) : (
                        <Tooltip key={item.href} content={item.label} position="right">
                            {linkContent}
                        </Tooltip>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-2 border-t border-[var(--border-subtle)] space-y-1">
                {/* User info */}
                {sidebarOpen && profile && (
                    <div className="px-3 py-2 mb-1">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {profile.full_name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                            {profile.email}
                        </p>
                    </div>
                )}

                {/* Sign out */}
                <button
                    onClick={() => signOut()}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-red-500/10 transition-all duration-200"
                >
                    <LogOut className="h-5 w-5 flex-shrink-0" />
                    <AnimatePresence>
                        {sidebarOpen && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-sm font-medium"
                            >
                                Sign Out
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>

                {/* Toggle */}
                <button
                    onClick={toggleSidebar}
                    className="flex items-center justify-center w-full py-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                    aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                    {sidebarOpen ? (
                        <ChevronLeft className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                </button>
            </div>
        </motion.aside>
    );
}
