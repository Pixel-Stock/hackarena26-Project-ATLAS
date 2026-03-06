"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataStore } from "@/lib/data-store";
import { formatCurrency, getCurrentMonth } from "@/lib/utils";

// donut chart showing category distribution — uses CSS chart variables
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "#e8a87c", "#85dcba", "#e27d60"];

export function SpendingByCategoryChart() {
    const { transactions } = useDataStore();
    const currentMonth = getCurrentMonth();

    // aggregate spending by category for current month
    const categorySpending: Record<string, number> = {};
    transactions
        .filter((t) => t.date.startsWith(currentMonth))
        .forEach((t) => {
            categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
        });

    const data = Object.entries(categorySpending)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    if (data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Spending by Category</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No transactions this month yet
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="45%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={800}
                            animationEasing="ease-out"
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number) => formatCurrency(value)}
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
                        <Legend
                            verticalAlign="bottom"
                            align="center"
                            layout="horizontal"
                            wrapperStyle={{
                                display: "flex",
                                flexDirection: "row",
                                flexWrap: "wrap",
                                justifyContent: "center",
                                gap: "4px 12px",
                                paddingTop: "12px",
                            }}
                            formatter={(value: string) => (
                                <span style={{ color: "var(--muted-foreground)", fontSize: "12px", fontWeight: 500 }}>{value}</span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

