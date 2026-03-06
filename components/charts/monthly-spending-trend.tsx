"use client";

import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataStore } from "@/lib/data-store";
import { formatCurrency } from "@/lib/utils";

// line chart showing spending across months
export function MonthlySpendingTrendChart() {
    const { transactions } = useDataStore();

    // aggregate spending by month (last 6 months)
    const monthlyData: Record<string, number> = {};
    const now = new Date();

    // initialize last 6 months
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyData[key] = 0;
    }

    // fill with actual data
    transactions.forEach((t) => {
        const month = t.date.substring(0, 7);
        if (month in monthlyData) {
            monthlyData[month] += t.amount;
        }
    });

    const data = Object.entries(monthlyData).map(([month, amount]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-IN", { month: "short" }),
        amount,
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Monthly Spending Trend</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis
                            dataKey="month"
                            stroke="var(--muted-foreground)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="var(--muted-foreground)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            formatter={(value: number) => [formatCurrency(value), "Spending"]}
                            contentStyle={{
                                backgroundColor: "var(--card)",
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius)",
                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                color: "var(--foreground)",
                            }}
                            itemStyle={{ color: "var(--foreground)" }}
                            labelStyle={{ color: "var(--muted-foreground)" }}
                        />
                        <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="var(--chart-1)"
                            strokeWidth={2.5}
                            fill="url(#colorSpending)"
                            animationDuration={1000}
                            animationEasing="ease-out"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
