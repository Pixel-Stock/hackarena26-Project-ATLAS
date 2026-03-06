"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataStore } from "@/lib/data-store";
import { formatCurrency, getCurrentMonth } from "@/lib/utils";

// bar chart comparing budget vs actual spending per category
export function BudgetVsSpendingChart() {
    const { transactions, categories } = useDataStore();
    const currentMonth = getCurrentMonth();

    // get current month spending by category
    const categorySpending: Record<string, number> = {};
    transactions
        .filter((t) => t.date.startsWith(currentMonth))
        .forEach((t) => {
            categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
        });

    // build comparison data
    const data = categories
        .filter((c) => c.budget_limit > 0)
        .map((cat) => ({
            category: cat.name.length > 10 ? cat.name.substring(0, 10) + "…" : cat.name,
            budget: cat.budget_limit,
            actual: categorySpending[cat.name] || 0,
        }))
        .sort((a, b) => b.actual - a.actual);

    if (data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Budget vs Spending</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Set category budgets to see comparison
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Budget vs Spending</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis
                            dataKey="category"
                            stroke="var(--muted-foreground)"
                            fontSize={11}
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
                            formatter={(value: number, name: string) => [
                                formatCurrency(value),
                                name === "budget" ? "Budget" : "Actual",
                            ]}
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
                            formatter={(value: string) => (
                                <span style={{ color: "var(--foreground)", fontSize: "12px" }}>
                                    {value === "budget" ? "Budget" : "Actual"}
                                </span>
                            )}
                        />
                        <Bar
                            dataKey="budget"
                            fill="var(--chart-3)"
                            radius={[4, 4, 0, 0]}
                            animationDuration={800}
                        />
                        <Bar
                            dataKey="actual"
                            fill="var(--chart-1)"
                            radius={[4, 4, 0, 0]}
                            animationDuration={800}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
