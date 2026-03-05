'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui';
import type { DailySpending } from '@/types';

/* ============================================================
   ATLAS — SpendingChart Component
   Line chart: daily spending over last 30 days
   ============================================================ */

interface SpendingChartProps {
    data: DailySpending[];
    currency?: string;
}

export function SpendingChart({ data, currency = 'INR' }: SpendingChartProps) {
    const formatCurrencyShort = (value: number) => {
        if (currency === 'INR') {
            if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
            return `₹${value}`;
        }
        if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
        return `$${value}`;
    };

    return (
        <Card padding="md">
            <CardHeader>
                <CardTitle>Daily Spending</CardTitle>
                <span className="text-xs text-[var(--text-muted)]">Last 30 days</span>
            </CardHeader>

            {data.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
                    <p className="text-sm">No spending data yet. Scan your first receipt!</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={data}>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--border-subtle)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="date"
                            stroke="var(--text-muted)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => {
                                const d = new Date(val);
                                return `${d.getDate()}/${d.getMonth() + 1}`;
                            }}
                        />
                        <YAxis
                            stroke="var(--text-muted)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatCurrencyShort}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '12px',
                                fontSize: '12px',
                                color: 'var(--text-primary)',
                            }}
                            formatter={(value) => [formatCurrencyShort(Number(value ?? 0)), 'Spent']}
                            labelFormatter={(label) => {
                                const d = new Date(label);
                                return d.toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                });
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="total"
                            stroke="var(--accent-primary)"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{
                                r: 5,
                                fill: 'var(--accent-primary)',
                                stroke: 'var(--bg-card)',
                                strokeWidth: 2,
                            }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </Card>
    );
}
