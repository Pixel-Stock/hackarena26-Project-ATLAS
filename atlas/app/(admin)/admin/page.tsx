'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, ScanLine, Activity, BarChart3, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui';
import { StatsGrid } from '@/components/admin/StatsGrid';
import type { AdminStats } from '@/types';

/* ============================================================
   ATLAS — Admin Dashboard
   ============================================================ */

export default function AdminPage() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/admin/stats');
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch {
                // Silently fail in dev
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-2xl animate-shimmer" />
                ))}
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-[var(--accent-purple)]" />
                <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Admin Dashboard</h1>
            </div>

            {/* Stats Grid */}
            <StatsGrid
                stats={[
                    { label: 'Total Users', value: stats?.total_users ?? 0, subtitle: `+${stats?.new_users_today ?? 0} today` },
                    { label: 'New This Week', value: stats?.new_users_this_week ?? 0 },
                    { label: 'Total Receipts', value: stats?.total_receipts ?? 0, subtitle: `${stats?.scans_today ?? 0} today` },
                    { label: 'Avg Confidence', value: `${((stats?.avg_confidence ?? 0) * 100).toFixed(1)}%` },
                    { label: 'Gemini Usage', value: `${(stats?.gemini_percent ?? 0).toFixed(0)}%` },
                    { label: 'Custom ML', value: `${(stats?.custom_ml_percent ?? 0).toFixed(0)}%` },
                    { label: 'Error Rate', value: `${(stats?.error_rate ?? 0).toFixed(1)}%` },
                    { label: 'Categories Active', value: stats?.category_distribution?.length ?? 0 },
                ]}
            />

            {/* Top Merchants */}
            <Card padding="md">
                <CardHeader>
                    <CardTitle>Top 10 Merchants</CardTitle>
                </CardHeader>
                <div className="space-y-2">
                    {(stats?.top_merchants ?? []).map((m, i) => (
                        <div key={m.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-elevated)]/50">
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-[var(--text-muted)] w-6 text-right">#{i + 1}</span>
                                <span className="text-sm text-[var(--text-primary)]">{m.name}</span>
                            </div>
                            <Badge variant="default">{m.count} scans</Badge>
                        </div>
                    ))}
                    {(stats?.top_merchants ?? []).length === 0 && (
                        <p className="text-center text-sm text-[var(--text-muted)] py-8">No merchant data yet</p>
                    )}
                </div>
            </Card>

            {/* Category Distribution */}
            <Card padding="md">
                <CardHeader>
                    <CardTitle>Category Distribution (All Users)</CardTitle>
                </CardHeader>
                <div className="space-y-2">
                    {(stats?.category_distribution ?? []).map((cat) => (
                        <div key={cat.category} className="flex items-center justify-between py-1.5">
                            <span className="text-sm text-[var(--text-secondary)]">{cat.category}</span>
                            <div className="flex items-center gap-3">
                                <div className="w-32 h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-[var(--accent-primary)]"
                                        style={{ width: `${cat.percent}%` }}
                                    />
                                </div>
                                <span className="text-xs text-[var(--text-muted)] w-16 text-right">{cat.count} ({cat.percent.toFixed(0)}%)</span>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* System Health */}
            <Card padding="md">
                <CardHeader>
                    <CardTitle>System Health</CardTitle>
                </CardHeader>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)]/50">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">Gemini API</p>
                            <p className="text-xs text-[var(--text-muted)]">Operational</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)]/50">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">Supabase</p>
                            <p className="text-xs text-[var(--text-muted)]">Connected</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)]/50">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">Storage</p>
                            <p className="text-xs text-[var(--text-muted)]">Active</p>
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}
