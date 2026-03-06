"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataStore } from "@/lib/data-store";
import { formatCurrency, getCurrentMonth } from "@/lib/utils";

// horizontal bar chart showing top merchants
export function MerchantSpendingChart() {
    const { transactions } = useDataStore();
    const currentMonth = getCurrentMonth();

    // aggregate spending by merchant
    const merchantSpending: Record<string, number> = {};
    transactions
        .filter((t) => t.date.startsWith(currentMonth))
        .forEach((t) => {
            merchantSpending[t.merchant] = (merchantSpending[t.merchant] || 0) + t.amount;
        });

    // sort and take top 8
    const data = Object.entries(merchantSpending)
        .map(([merchant, amount]) => ({ merchant, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8);

    if (data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Top Merchants</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No merchant data this month
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Top Merchants</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} layout="vertical" barSize={20}>
                        <XAxis
                            type="number"
                            stroke="var(--muted-foreground)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `₹${(value / 1000).toFixed(1)}k`}
                        />
                        <YAxis
                            type="category"
                            dataKey="merchant"
                            stroke="var(--muted-foreground)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            width={100}
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
                        <Bar
                            dataKey="amount"
                            fill="var(--chart-2)"
                            radius={[0, 4, 4, 0]}
                            animationDuration={800}
                            animationEasing="ease-out"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
