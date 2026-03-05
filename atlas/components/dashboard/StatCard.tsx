'use client';

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui';

/* ============================================================
   ATLAS — StatCard Component
   Dashboard summary stat card
   ============================================================ */

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: ReactNode;
    change?: {
        value: number;
        label: string;
    };
    accent?: string;
}

export function StatCard({
    title,
    value,
    subtitle,
    icon,
    change,
    accent = 'var(--accent-primary)',
}: StatCardProps) {
    return (
        <Card hover padding="md">
            <div className="flex items-start justify-between">
                <div className="space-y-3">
                    <p className="text-sm text-[var(--text-secondary)]">{title}</p>
                    <p className="text-3xl font-display font-bold text-[var(--text-primary)]">
                        {value}
                    </p>
                    {change && (
                        <div className="flex items-center gap-1.5">
                            {change.value > 0 ? (
                                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                            ) : change.value < 0 ? (
                                <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                            ) : (
                                <Minus className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                            )}
                            <span
                                className={`text-xs font-medium ${change.value > 0
                                        ? 'text-emerald-400'
                                        : change.value < 0
                                            ? 'text-red-400'
                                            : 'text-[var(--text-muted)]'
                                    }`}
                            >
                                {change.value > 0 ? '+' : ''}
                                {change.value.toFixed(1)}%
                            </span>
                            <span className="text-xs text-[var(--text-muted)]">
                                {change.label}
                            </span>
                        </div>
                    )}
                    {subtitle && (
                        <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
                    )}
                </div>

                <div
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: accent + '15' }}
                >
                    <div style={{ color: accent }}>{icon}</div>
                </div>
            </div>
        </Card>
    );
}
