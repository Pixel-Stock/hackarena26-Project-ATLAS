'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui';
import { getCategoryColor } from '@/lib/utils/categories';
import { formatCurrency } from '@/lib/utils/formatting';
import type { SpendingByCategory } from '@/types';

/* ============================================================
   ATLAS — CategoryPieChart Component
   Interactive pie chart of spending by category
   ============================================================ */

interface CategoryPieChartProps {
    data: SpendingByCategory[];
    currency?: string;
}

export function CategoryPieChart({
    data,
    currency = 'INR',
}: CategoryPieChartProps) {
    const chartData = data.map((item) => ({
        ...item,
        color: getCategoryColor(item.category),
    }));

    const totalSpent = data.reduce((sum, d) => sum + d.total, 0);

    return (
        <Card padding="md">
            <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
            </CardHeader>

            {data.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
                    <p className="text-sm">No category data yet</p>
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row items-center gap-6">
                    {/* Chart */}
                    <div className="w-full lg:w-1/2">
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="total"
                                    nameKey="category"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--bg-card)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        color: 'var(--text-primary)',
                                    }}
                                    formatter={(value) => [
                                        formatCurrency(Number(value ?? 0), currency),
                                        'Spent',
                                    ]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="w-full lg:w-1/2 space-y-2">
                        {chartData.slice(0, 6).map((item) => (
                            <div
                                key={item.category}
                                className="flex items-center justify-between py-1.5"
                            >
                                <div className="flex items-center gap-2.5">
                                    <span
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="text-sm text-[var(--text-secondary)]">
                                        {item.category}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-mono text-[var(--text-primary)]">
                                        {formatCurrency(item.total, currency)}
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)] ml-2">
                                        {totalSpent > 0
                                            ? ((item.total / totalSpent) * 100).toFixed(0)
                                            : 0}
                                        %
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}
