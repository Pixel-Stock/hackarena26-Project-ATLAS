'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Receipt, TrendingUp, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StatCard } from '@/components/dashboard/StatCard';
import { SpendingChart } from '@/components/dashboard/SpendingChart';
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { formatCurrency } from '@/lib/utils/formatting';
import type { DashboardStats, DailySpending, SpendingByCategory, TransactionListItem } from '@/types';

/* ============================================================
   ATLAS — Dashboard Page
   ============================================================ */

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [dailySpending, setDailySpending] = useState<DailySpending[]>([]);
    const [categoryData, setCategoryData] = useState<SpendingByCategory[]>([]);
    const [recentTx, setRecentTx] = useState<TransactionListItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchDashboard = async () => {
            setLoading(true);
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

            try {
                // Fetch receipts for this month
                const { data: thisMonthReceipts } = await supabase
                    .from('receipts')
                    .select('total_amount, merchant_name, receipt_date, overall_confidence, model_used, created_at, id')
                    .gte('created_at', thisMonthStart)
                    .order('created_at', { ascending: false });

                // Fetch receipts for last month
                const { data: lastMonthReceipts } = await supabase
                    .from('receipts')
                    .select('total_amount')
                    .gte('created_at', lastMonthStart)
                    .lte('created_at', lastMonthEnd);

                // Fetch line items for category data
                const { data: lineItems } = await supabase
                    .from('line_items')
                    .select('category, amount, receipt_id')
                    .in('receipt_id', (thisMonthReceipts ?? []).map(r => r.id));

                // Calculate stats
                const totalThisMonth = (thisMonthReceipts ?? []).reduce((s, r) => s + (r.total_amount ?? 0), 0);
                const totalLastMonth = (lastMonthReceipts ?? []).reduce((s, r) => s + (r.total_amount ?? 0), 0);
                const percentChange = totalLastMonth > 0
                    ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100
                    : 0;

                // Category aggregation
                const catMap = new Map<string, { total: number; count: number }>();
                (lineItems ?? []).forEach((item) => {
                    const existing = catMap.get(item.category) ?? { total: 0, count: 0 };
                    catMap.set(item.category, {
                        total: existing.total + item.amount,
                        count: existing.count + 1,
                    });
                });

                const catData: SpendingByCategory[] = Array.from(catMap.entries())
                    .map(([category, data]) => ({
                        category,
                        total: data.total,
                        color: '',
                        count: data.count,
                    }))
                    .sort((a, b) => b.total - a.total);

                // Top category
                const topCategory = catData.length > 0 ? catData[0].category : null;

                // Daily spending (last 30 days)
                const dailyMap = new Map<string, number>();
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                (thisMonthReceipts ?? []).forEach((r) => {
                    const dateKey = (r.receipt_date ?? r.created_at).split('T')[0];
                    dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + (r.total_amount ?? 0));
                });

                const daily: DailySpending[] = Array.from(dailyMap.entries())
                    .map(([date, total]) => ({ date, total }))
                    .sort((a, b) => a.date.localeCompare(b.date));

                // Recent transactions
                const recent: TransactionListItem[] = (thisMonthReceipts ?? []).slice(0, 5).map((r) => ({
                    id: r.id,
                    merchant_name: r.merchant_name,
                    receipt_date: r.receipt_date,
                    total_amount: r.total_amount,
                    category: catData.length > 0 ? catData[0].category : 'Other',
                    confidence: r.overall_confidence,
                    model_used: r.model_used,
                    created_at: r.created_at,
                }));

                setStats({
                    total_this_month: totalThisMonth,
                    total_last_month: totalLastMonth,
                    percent_change: percentChange,
                    top_category: topCategory,
                    receipts_scanned: (thisMonthReceipts ?? []).length,
                });
                setDailySpending(daily);
                setCategoryData(catData);
                setRecentTx(recent);
            } catch (err) {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Dashboard fetch error:', err);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, [user]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-32 rounded-2xl animate-shimmer" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-80 rounded-2xl animate-shimmer" />
                    <div className="h-80 rounded-2xl animate-shimmer" />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total This Month"
                    value={formatCurrency(stats?.total_this_month ?? 0)}
                    icon={<DollarSign className="h-5 w-5" />}
                    change={
                        stats
                            ? { value: stats.percent_change, label: 'vs last month' }
                            : undefined
                    }
                />
                <StatCard
                    title="Receipts Scanned"
                    value={stats?.receipts_scanned ?? 0}
                    icon={<Receipt className="h-5 w-5" />}
                    accent="var(--accent-purple)"
                />
                <StatCard
                    title="Top Category"
                    value={stats?.top_category ?? 'N/A'}
                    icon={<TrendingUp className="h-5 w-5" />}
                    accent="#10b981"
                />
                <StatCard
                    title="Last Month"
                    value={formatCurrency(stats?.total_last_month ?? 0)}
                    icon={<BarChart3 className="h-5 w-5" />}
                    accent="#f59e0b"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SpendingChart data={dailySpending} />
                <CategoryPieChart data={categoryData} />
            </div>

            {/* Recent Transactions */}
            <RecentTransactions transactions={recentTx} />
        </motion.div>
    );
}
