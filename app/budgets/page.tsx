"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useDataStore } from "@/lib/data-store";
import {
    formatCurrency,
    getCurrentMonth,
    getMonthName,
    calculatePercentage,
    getRemainingDaysInMonth,
} from "@/lib/utils";
import { Wallet, Save } from "lucide-react";

export default function BudgetsPage() {
    const { transactions, categories, budgets, setBudget, updateCategory } = useDataStore();
    const currentMonth = getCurrentMonth();
    const currentBudget = budgets.find((b) => b.month === currentMonth);

    const [monthlyBudget, setMonthlyBudget] = useState(
        String(currentBudget?.budget_limit || 35000)
    );
    const [categoryBudgets, setCategoryBudgets] = useState<Record<string, string>>({});

    // calculate current month spending
    const monthlySpending = transactions
        .filter((t) => t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + t.amount, 0);

    const budgetLimit = currentBudget?.budget_limit || 35000;
    const remaining = budgetLimit - monthlySpending;
    const percentage = calculatePercentage(monthlySpending, budgetLimit);
    const remainingDays = getRemainingDaysInMonth();
    const safeDailySpend = remainingDays > 0 ? Math.max(remaining / remainingDays, 0) : 0;

    // calculate spending by category
    const categorySpending: Record<string, number> = {};
    transactions
        .filter((t) => t.date.startsWith(currentMonth))
        .forEach((t) => {
            categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
        });

    // save monthly budget
    const saveMonthlyBudget = () => {
        setBudget(currentMonth, parseFloat(monthlyBudget) || 0);
    };

    // save category budget
    const saveCategoryBudget = (catId: string, catName: string) => {
        const value = categoryBudgets[catId];
        if (value !== undefined) {
            updateCategory(catId, { budget_limit: parseFloat(value) || 0 });
            setCategoryBudgets((prev) => {
                const updated = { ...prev };
                delete updated[catId];
                return updated;
            });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
                <p className="text-muted-foreground mt-1">
                    Configure your monthly and category budgets
                </p>
            </div>

            {/* monthly budget overview */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Wallet className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Monthly Budget — {getMonthName(currentMonth)}</CardTitle>
                            <CardDescription>Set your overall spending limit for the month</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* budget input */}
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <Label htmlFor="monthly-budget">Budget Amount (₹)</Label>
                            <Input
                                id="monthly-budget"
                                type="number"
                                value={monthlyBudget}
                                onChange={(e) => setMonthlyBudget(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={saveMonthlyBudget} className="gap-2">
                                <Save className="h-4 w-4" />
                                Save
                            </Button>
                        </div>
                    </div>

                    {/* budget progress */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                                {formatCurrency(monthlySpending)} spent of {formatCurrency(budgetLimit)}
                            </span>
                            <span className={`font-semibold ${percentage > 100 ? "text-destructive" : ""}`}>
                                {percentage}%
                            </span>
                        </div>
                        <Progress
                            value={Math.min(percentage, 100)}
                            className="h-3"
                            indicatorClassName={percentage > 90 ? "bg-destructive" : percentage > 70 ? "bg-yellow-500" : ""}
                        />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                            <div className="text-center p-3 rounded-lg bg-secondary/50">
                                <p className="text-xs text-muted-foreground">Remaining</p>
                                <p className="text-lg font-bold">{formatCurrency(Math.max(remaining, 0))}</p>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-secondary/50">
                                <p className="text-xs text-muted-foreground">Days Left</p>
                                <p className="text-lg font-bold">{remainingDays}</p>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-secondary/50">
                                <p className="text-xs text-muted-foreground">Safe Daily</p>
                                <p className="text-lg font-bold">{formatCurrency(safeDailySpend)}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Separator />

            {/* category budgets */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Category Budgets</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {categories.map((cat) => {
                        const spent = categorySpending[cat.name] || 0;
                        const catPercentage = calculatePercentage(spent, cat.budget_limit);
                        const editValue = categoryBudgets[cat.id];
                        const isEditing = editValue !== undefined;

                        return (
                            <Card key={cat.id}>
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{cat.icon}</span>
                                            <span className="font-medium text-sm">{cat.name}</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {formatCurrency(spent)} / {formatCurrency(cat.budget_limit)}
                                        </span>
                                    </div>
                                    <Progress
                                        value={Math.min(catPercentage, 100)}
                                        className="h-2"
                                        indicatorClassName={catPercentage > 100 ? "bg-destructive" : ""}
                                    />
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            placeholder={String(cat.budget_limit)}
                                            value={isEditing ? editValue : ""}
                                            onChange={(e) =>
                                                setCategoryBudgets((prev) => ({ ...prev, [cat.id]: e.target.value }))
                                            }
                                            className="h-8 text-sm"
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8"
                                            disabled={!isEditing}
                                            onClick={() => saveCategoryBudget(cat.id, cat.name)}
                                        >
                                            Save
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
