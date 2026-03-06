"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AddCategoryDialog } from "@/components/add-category-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useDataStore } from "@/lib/data-store";
import { formatCurrency, getCurrentMonth, calculatePercentage } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

export default function CategoriesPage() {
    const { categories, transactions, updateCategory, deleteCategory } = useDataStore();
    const currentMonth = getCurrentMonth();
    const [editingCat, setEditingCat] = useState<string | null>(null);
    const [editBudget, setEditBudget] = useState("");

    // calculate spending per category for current month
    const categorySpending: Record<string, { amount: number; count: number }> = {};
    transactions
        .filter((t) => t.date.startsWith(currentMonth))
        .forEach((t) => {
            if (!categorySpending[t.category]) {
                categorySpending[t.category] = { amount: 0, count: 0 };
            }
            categorySpending[t.category].amount += t.amount;
            categorySpending[t.category].count += 1;
        });

    // handle updating budget limit
    const handleUpdateBudget = () => {
        if (editingCat && editBudget) {
            updateCategory(editingCat, { budget_limit: parseFloat(editBudget) });
            setEditingCat(null);
            setEditBudget("");
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your spending categories and budgets
                    </p>
                </div>
                <AddCategoryDialog />
            </div>

            {/* categories grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat) => {
                    const spending = categorySpending[cat.name] || { amount: 0, count: 0 };
                    const percentage = calculatePercentage(spending.amount, cat.budget_limit);
                    const isOverBudget = spending.amount > cat.budget_limit && cat.budget_limit > 0;

                    return (
                        <Card key={cat.id} className="relative overflow-hidden">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-lg bg-secondary flex items-center justify-center text-xl">
                                            {cat.icon}
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{cat.name}</CardTitle>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {spending.count} transactions
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => {
                                                setEditingCat(cat.id);
                                                setEditBudget(String(cat.budget_limit));
                                            }}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => deleteCategory(cat.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Spent</span>
                                    <span className="font-semibold">{formatCurrency(spending.amount)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Budget</span>
                                    <span className="font-medium">{formatCurrency(cat.budget_limit)}</span>
                                </div>
                                <Progress
                                    value={Math.min(percentage, 100)}
                                    className="h-2"
                                    indicatorClassName={isOverBudget ? "bg-destructive" : ""}
                                />
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">
                                        {percentage}% used
                                    </span>
                                    {isOverBudget && (
                                        <Badge variant="destructive" className="text-[10px]">
                                            Over Budget
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* edit budget dialog */}
            <Dialog open={!!editingCat} onOpenChange={() => setEditingCat(null)}>
                <DialogContent className="sm:max-w-[350px]">
                    <DialogHeader>
                        <DialogTitle>Edit Category Budget</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Label htmlFor="edit-budget">Monthly Budget Limit (₹)</Label>
                        <Input
                            id="edit-budget"
                            type="number"
                            value={editBudget}
                            onChange={(e) => setEditBudget(e.target.value)}
                            min="0"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingCat(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateBudget}>Update</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
