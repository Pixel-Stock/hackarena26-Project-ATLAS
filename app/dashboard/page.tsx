"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { SpendingByCategoryChart } from "@/components/charts/spending-by-category";
import { MonthlySpendingTrendChart } from "@/components/charts/monthly-spending-trend";
import { BudgetVsSpendingChart } from "@/components/charts/budget-vs-spending";
import { MerchantSpendingChart } from "@/components/charts/merchant-spending";
import { useDataStore } from "@/lib/data-store";
import { formatCurrency, getCurrentMonth, getRemainingDaysInMonth } from "@/lib/utils";
import { DollarSign, TrendingDown, Wallet, ShieldCheck } from "lucide-react";

export default function DashboardPage() {
    const { transactions, getCurrentBudget } = useDataStore();
    const currentMonth = getCurrentMonth();
    const budget = getCurrentBudget();

    // calculate dashboard stats
    const monthlySpending = transactions
        .filter((t) => t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + t.amount, 0);

    const monthlyBudget = budget?.budget_limit || 35000;
    const remaining = monthlyBudget - monthlySpending;
    const remainingDays = getRemainingDaysInMonth();
    const safeDailySpend = remainingDays > 0 ? remaining / remainingDays : 0;

    // stats cards data
    const stats = [
        {
            title: "Total Spending",
            value: formatCurrency(monthlySpending),
            description: "This month",
            icon: DollarSign,
            gradient: "from-orange-500/10 to-red-500/10",
            iconColor: "text-chart-1",
        },
        {
            title: "Monthly Budget",
            value: formatCurrency(monthlyBudget),
            description: "Configured limit",
            icon: Wallet,
            gradient: "from-purple-500/10 to-indigo-500/10",
            iconColor: "text-chart-2",
        },
        {
            title: "Remaining",
            value: formatCurrency(Math.max(remaining, 0)),
            description: remaining < 0 ? "Over budget!" : `${remainingDays} days left`,
            icon: TrendingDown,
            gradient: remaining < 0 ? "from-red-500/10 to-red-600/10" : "from-green-500/10 to-emerald-500/10",
            iconColor: remaining < 0 ? "text-destructive" : "text-green-600",
        },
        {
            title: "Safe to Spend",
            value: formatCurrency(Math.max(safeDailySpend, 0)),
            description: "Per day",
            icon: ShieldCheck,
            gradient: "from-blue-500/10 to-cyan-500/10",
            iconColor: "text-blue-600",
        },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* page header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Your financial overview at a glance
                    </p>
                </div>
                <AddExpenseDialog />
            </div>

            {/* stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <Card
                        key={stat.title}
                        className="relative overflow-hidden"
                        style={{ animationDelay: `${i * 100}ms` }}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50`} />
                        <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                        </CardHeader>
                        <CardContent className="relative">
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* charts grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SpendingByCategoryChart />
                <MonthlySpendingTrendChart />
                <BudgetVsSpendingChart />
                <MerchantSpendingChart />
            </div>

            {/* recent transactions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                        {transactions.slice(0, 10).map((t) => (
                            <div
                                key={t.id}
                                className="flex items-center justify-between py-2 border-b border-border last:border-0"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm">
                                        {t.category === "Food & Dining"
                                            ? "🍕"
                                            : t.category === "Shopping"
                                                ? "🛍️"
                                                : t.category === "Transport"
                                                    ? "🚗"
                                                    : t.category === "Groceries"
                                                        ? "🛒"
                                                        : t.category === "Entertainment"
                                                            ? "🎬"
                                                            : t.category === "Bills & Utilities"
                                                                ? "💡"
                                                                : t.category === "Health"
                                                                    ? "💊"
                                                                    : t.category === "Education"
                                                                        ? "📚"
                                                                        : "💳"}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{t.merchant}</p>
                                        <p className="text-xs text-muted-foreground">{t.category}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-foreground">
                                        -{formatCurrency(t.amount)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(t.date).toLocaleDateString("en-IN", {
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
