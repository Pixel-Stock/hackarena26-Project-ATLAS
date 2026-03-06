"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useDataStore } from "@/lib/data-store";
import { Plus } from "lucide-react";

// list of available emoji icons for categories
const emojiIcons = ["🍕", "🛒", "🚗", "🛍️", "🎬", "💡", "💊", "📚", "🏠", "✈️", "💪", "🎮", "☕", "🎵", "🐕", "💰", "🎁", "🔧"];

export function AddCategoryDialog() {
    const { addCategory } = useDataStore();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [icon, setIcon] = useState("🏷️");
    const [budgetLimit, setBudgetLimit] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    // validate form fields
    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = "Category name is required";
        if (!budgetLimit || parseFloat(budgetLimit) < 0) newErrors.budgetLimit = "Valid budget is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        // add new category to data store
        addCategory({
            name: name.trim(),
            icon,
            budget_limit: parseFloat(budgetLimit) || 0,
        });

        // reset form and close
        setName("");
        setIcon("🏷️");
        setBudgetLimit("");
        setErrors({});
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 text-white hover:opacity-90" style={{ backgroundColor: "#C96442" }}>
                    <Plus className="h-4 w-4" />
                    Add Category
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Create Category</DialogTitle>
                    <DialogDescription>
                        Add a custom spending category to organize your expenses.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* icon picker */}
                    <div className="space-y-2">
                        <Label>Icon</Label>
                        <div className="flex flex-wrap gap-2">
                            {emojiIcons.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setIcon(emoji)}
                                    className={`w-10 h-10 rounded-md flex items-center justify-center text-lg transition-all ${icon === emoji
                                        ? "bg-primary/10 border-2 border-primary scale-110"
                                        : "bg-secondary hover:bg-accent border border-transparent"
                                        }`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* category name */}
                    <div className="space-y-2">
                        <Label htmlFor="cat-name">Category Name</Label>
                        <Input
                            id="cat-name"
                            placeholder="e.g. Subscriptions"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">{errors.name}</p>
                        )}
                    </div>

                    {/* budget limit */}
                    <div className="space-y-2">
                        <Label htmlFor="budget-limit">Monthly Budget Limit (₹)</Label>
                        <Input
                            id="budget-limit"
                            type="number"
                            placeholder="5000"
                            min="0"
                            value={budgetLimit}
                            onChange={(e) => setBudgetLimit(e.target.value)}
                        />
                        {errors.budgetLimit && (
                            <p className="text-xs text-destructive">{errors.budgetLimit}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Create Category</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
