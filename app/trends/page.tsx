"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataStore } from "@/lib/data-store";
import { formatCurrency } from "@/lib/utils";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "#e8a87c", "#85dcba", "#e27d60"];

export default function TrendsPage() {
    const { transactions } = useDataStore();
    const [timeframe, setTimeframe] = useState("month");

    // filter transactions based on timeframe
    const filteredTransactions = useMemo(() => {
        const now = new Date();
        let cutoff = new Date();

        switch (timeframe) {
            case "week":
                cutoff.setDate(now.getDate() - 7);
                break;
            case "month":
                cutoff.setMonth(now.getMonth() - 1);
                break;
            case "quarter":
                cutoff.setMonth(now.getMonth() - 3);
                break;
            case "year":
                cutoff.setFullYear(now.getFullYear() - 1);
                break;
        }

        return transactions.filter((t) => new Date(t.date) >= cutoff);
    }, [transactions, timeframe]);

    // monthly spending data
    const monthlyData = useMemo(() => {
        const monthMap: Record<string, number> = {};
        filteredTransactions.forEach((t) => {
            const month = t.date.substring(0, 7);
            monthMap[month] = (monthMap[month] || 0) + t.amount;
        });

        return Object.entries(monthMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, amount]) => ({
                month: new Date(month + "-01").toLocaleDateString("en-IN", {
                    month: "short",
                    year: "2-digit",
                }),
                amount,
            }));
    }, [filteredTransactions]);

    // category distribution data
    const categoryData = useMemo(() => {
        const catMap: Record<string, number> = {};
        filteredTransactions.forEach((t) => {
            catMap[t.category] = (catMap[t.category] || 0) + t.amount;
        });

        return Object.entries(catMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredTransactions]);

    // merchant frequency data
    const merchantData = useMemo(() => {
        const merchMap: Record<string, number> = {};
        filteredTransactions.forEach((t) => {
            merchMap[t.merchant] = (merchMap[t.merchant] || 0) + 1;
        });

        return Object.entries(merchMap)
            .map(([merchant, count]) => ({ merchant, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [filteredTransactions]);

    const totalSpending = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const avgTransaction = filteredTransactions.length > 0 ? totalSpending / filteredTransactions.length : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Trends</h1>
                <p className="text-muted-foreground mt-1">
                    Analyze your spending patterns over time
                </p>
            </div>

            {/* timeframe selector */}
            <Tabs value={timeframe} onValueChange={setTimeframe}>
                <TabsList>
                    <TabsTrigger value="week">Week</TabsTrigger>
                    <TabsTrigger value="month">Month</TabsTrigger>
                    <TabsTrigger value="quarter">Quarter</TabsTrigger>
                    <TabsTrigger value="year">Year</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* summary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">Total Spending</p>
                        <p className="text-xl font-bold mt-1">{formatCurrency(totalSpending)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">Transactions</p>
                        <p className="text-xl font-bold mt-1">{filteredTransactions.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">Avg per Transaction</p>
                        <p className="text-xl font-bold mt-1">{formatCurrency(avgTransaction)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* monthly spending */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Spending Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={monthlyData}>
                                <defs>
                                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
                                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    formatter={(v: number) => [formatCurrency(v), "Spending"]}
                                    contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--foreground)" }}
                                    itemStyle={{ color: "var(--foreground)" }}
                                    labelStyle={{ color: "var(--muted-foreground)" }}
                                />
                                <Area type="monotone" dataKey="amount" stroke="var(--chart-1)" strokeWidth={2} fill="url(#trendGradient)" animationDuration={800} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* category distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Category Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={95}
                                    paddingAngle={3}
                                    dataKey="value"
                                    animationDuration={800}
                                >
                                    {categoryData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(v: number) => formatCurrency(v)}
                                    contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--foreground)" }}
                                    itemStyle={{ color: "var(--foreground)" }}
                                    labelStyle={{ color: "var(--muted-foreground)" }}
                                />
                                <Legend verticalAlign="bottom" height={36} formatter={(v: string) => <span style={{ color: "var(--foreground)", fontSize: "11px" }}>{v}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* merchant frequency */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base">Most Visited Merchants</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={merchantData} layout="vertical" barSize={18}>
                                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
                                <YAxis type="category" dataKey="merchant" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} width={110} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--foreground)" }}
                                    itemStyle={{ color: "var(--foreground)" }}
                                    labelStyle={{ color: "var(--muted-foreground)" }}
                                />
                                <Bar dataKey="count" fill="var(--chart-2)" radius={[0, 4, 4, 0]} animationDuration={800} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
