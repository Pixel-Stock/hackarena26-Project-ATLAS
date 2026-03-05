'use client';

import { useEffect, useState } from 'react';
import { Brain, TrendingUp, TrendingDown, DollarSign, Store, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils/formatting';
import { getCategoryColor } from '@/lib/utils/categories';
import type { CategoryBreakdown, WeeklyInsight } from '@/types';

/* ============================================================
   ATLAS — Spending DNA / Insights Page
   ============================================================ */

export default function InsightsPage() {
    const { user } = useAuth();
    const [insights, setInsights] = useState<WeeklyInsight[]>([]);
    const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([]);
    const [topMerchant, setTopMerchant] = useState<{ name: string; count: number } | null>(null);
    const [biggestExpense, setBiggestExpense] = useState<{ merchant: string; amount: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchInsights = async () => {
            setLoading(true);
            try {
                const now = new Date();
                const thisWeekStart = new Date(now);
                thisWeekStart.setDate(now.getDate() - now.getDay());
                thisWeekStart.setHours(0, 0, 0, 0);

                const lastWeekStart = new Date(thisWeekStart);
                lastWeekStart.setDate(lastWeekStart.getDate() - 7);

                // This week's line items
                const { data: thisWeekReceipts } = await supabase
                    .from('receipts')
                    .select('id, merchant_name, total_amount')
                    .gte('created_at', thisWeekStart.toISOString());

                const receiptIds = (thisWeekReceipts ?? []).map(r => r.id);
                const { data: thisWeekItems } = await supabase
                    .from('line_items')
                    .select('category, amount')
                    .in('receipt_id', receiptIds.length > 0 ? receiptIds : ['00000000-0000-0000-0000-000000000000']);

                // Last week's line items
                const { data: lastWeekReceipts } = await supabase
                    .from('receipts')
                    .select('id')
                    .gte('created_at', lastWeekStart.toISOString())
                    .lt('created_at', thisWeekStart.toISOString());

                const lastReceiptIds = (lastWeekReceipts ?? []).map(r => r.id);
                const { data: lastWeekItems } = await supabase
                    .from('line_items')
                    .select('category, amount')
                    .in('receipt_id', lastReceiptIds.length > 0 ? lastReceiptIds : ['00000000-0000-0000-0000-000000000000']);

                // Category breakdown
                const catMap = new Map<string, number>();
                const lastCatMap = new Map<string, number>();
                let totalSpent = 0;

                (thisWeekItems ?? []).forEach(item => {
                    catMap.set(item.category, (catMap.get(item.category) ?? 0) + item.amount);
                    totalSpent += item.amount;
                });

                (lastWeekItems ?? []).forEach(item => {
                    lastCatMap.set(item.category, (lastCatMap.get(item.category) ?? 0) + item.amount);
                });

                // Weekly insights
                const weeklyInsights: WeeklyInsight[] = [];
                catMap.forEach((thisWeekTotal, category) => {
                    const lastWeekTotal = lastCatMap.get(category) ?? 0;
                    if (lastWeekTotal > 0) {
                        const change = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;
                        if (Math.abs(change) > 10) {
                            weeklyInsights.push({
                                message: `You spent ${Math.abs(change).toFixed(0)}% ${change > 0 ? 'more' : 'less'} on ${category} this week vs last week`,
                                type: change > 0 ? 'increase' : 'decrease',
                                category,
                                percent_change: change,
                            });
                        }
                    }
                });

                // Full breakdown
                const breakdownData: CategoryBreakdown[] = Array.from(catMap.entries())
                    .map(([category, total]) => ({
                        category,
                        total_spent: total,
                        percent_of_total: totalSpent > 0 ? (total / totalSpent) * 100 : 0,
                        transaction_count: (thisWeekItems ?? []).filter(i => i.category === category).length,
                        avg_per_transaction: 0,
                        color: getCategoryColor(category),
                        icon: '',
                    }))
                    .sort((a, b) => b.total_spent - a.total_spent);

                breakdownData.forEach(item => {
                    item.avg_per_transaction = item.transaction_count > 0 ? item.total_spent / item.transaction_count : 0;
                });

                // Top merchant
                const merchantCounts = new Map<string, number>();
                (thisWeekReceipts ?? []).forEach(r => {
                    if (r.merchant_name) {
                        merchantCounts.set(r.merchant_name, (merchantCounts.get(r.merchant_name) ?? 0) + 1);
                    }
                });
                let topM: { name: string; count: number } | null = null;
                merchantCounts.forEach((count, name) => {
                    if (!topM || count > topM.count) topM = { name, count };
                });

                // Biggest expense
                let biggest: { merchant: string; amount: number } | null = null;
                (thisWeekReceipts ?? []).forEach(r => {
                    if (r.total_amount && (!biggest || r.total_amount > biggest.amount)) {
                        biggest = { merchant: r.merchant_name ?? 'Unknown', amount: r.total_amount };
                    }
                });

                setInsights(weeklyInsights);
                setBreakdown(breakdownData);
                setTopMerchant(topM);
                setBiggestExpense(biggest);
            } catch (err) {
                if (process.env.NODE_ENV === 'development') console.error('Insights error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchInsights();
    }, [user]);

    if (loading) {
        return (
            <div className="space-y-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl animate-shimmer" />
                ))}
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div>
                <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Spending DNA</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Your spending patterns and insights</p>
            </div>

            {/* Insight cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card padding="md">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                            <Store className="h-5 w-5 text-purple-400" />
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">Top Merchant</span>
                    </div>
                    <p className="font-display font-semibold text-lg text-[var(--text-primary)]">
                        {topMerchant?.name ?? 'N/A'}
                    </p>
                    {topMerchant && <p className="text-xs text-[var(--text-muted)]">{topMerchant.count} visits this month</p>}
                </Card>

                <Card padding="md">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                            <DollarSign className="h-5 w-5 text-amber-400" />
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">Biggest Expense</span>
                    </div>
                    <p className="font-display font-semibold text-lg text-[var(--text-primary)]">
                        {biggestExpense ? formatCurrency(biggestExpense.amount) : 'N/A'}
                    </p>
                    {biggestExpense && <p className="text-xs text-[var(--text-muted)]">{biggestExpense.merchant}</p>}
                </Card>

                <Card padding="md">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                            <Receipt className="h-5 w-5 text-emerald-400" />
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">Categories</span>
                    </div>
                    <p className="font-display font-semibold text-lg text-[var(--text-primary)]">{breakdown.length}</p>
                    <p className="text-xs text-[var(--text-muted)]">Active this week</p>
                </Card>
            </div>

            {/* Weekly insights */}
            {insights.length > 0 && (
                <Card padding="md">
                    <CardHeader>
                        <CardTitle>Weekly Insights</CardTitle>
                        <Brain className="h-5 w-5 text-[var(--accent-purple)]" />
                    </CardHeader>
                    <div className="space-y-3">
                        {insights.map((insight, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-elevated)]/50">
                                {insight.type === 'increase'
                                    ? <TrendingUp className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                                    : <TrendingDown className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />}
                                <p className="text-sm text-[var(--text-secondary)]">{insight.message}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Category breakdown table */}
            <Card padding="none">
                <CardHeader className="px-6 pt-6">
                    <CardTitle>Category Breakdown</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--border-subtle)]">
                                {['Category', 'Total Spent', '% of Total', 'Transactions', 'Avg per Tx'].map(h => (
                                    <th key={h} className="text-left py-3 px-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {breakdown.map(cat => (
                                <tr key={cat.category} className="hover:bg-[var(--bg-elevated)]/50 transition-colors">
                                    <td className="py-3 px-4">
                                        <span className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                            <span className="text-sm text-[var(--text-primary)]">{cat.category}</span>
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm font-mono text-[var(--text-primary)]">{formatCurrency(cat.total_spent)}</td>
                                    <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">{cat.percent_of_total.toFixed(1)}%</td>
                                    <td className="py-3 px-4 text-sm font-mono text-[var(--text-secondary)]">{cat.transaction_count}</td>
                                    <td className="py-3 px-4 text-sm font-mono text-[var(--text-secondary)]">{formatCurrency(cat.avg_per_transaction)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {breakdown.length === 0 && (
                    <div className="text-center py-12 text-[var(--text-muted)] text-sm">No spending data for this period</div>
                )}
            </Card>
        </motion.div>
    );
}
