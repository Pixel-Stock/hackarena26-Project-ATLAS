"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useDataStore } from "@/lib/data-store";
import { Plus } from "lucide-react";

export function AddExpenseDialog() {
    const { categories, addTransaction } = useDataStore();
    const [open, setOpen] = useState(false);
    const [merchant, setMerchant] = useState("");
    const [category, setCategory] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [notes, setNotes] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    // validate form fields
    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!merchant.trim()) newErrors.merchant = "Merchant is required";
        if (!category) newErrors.category = "Category is required";
        if (!amount || parseFloat(amount) <= 0) newErrors.amount = "Valid amount is required";
        if (!date) newErrors.date = "Date is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        // add new transaction to data store
        addTransaction({
            merchant: merchant.trim(),
            category,
            amount: parseFloat(amount),
            date,
            notes: notes.trim(),
        });

        // reset form and close dialog
        setMerchant("");
        setCategory("");
        setAmount("");
        setDate(new Date().toISOString().split("T")[0]);
        setNotes("");
        setErrors({});
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 shadow-md hover:shadow-lg transition-shadow">
                    <Plus className="h-4 w-4" />
                    Add Expense
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Expense</DialogTitle>
                    <DialogDescription>
                        Record a new transaction to track your spending.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* merchant field */}
                    <div className="space-y-2">
                        <Label htmlFor="merchant">Merchant</Label>
                        <Input
                            id="merchant"
                            placeholder="e.g. Swiggy, Amazon, Uber"
                            value={merchant}
                            onChange={(e) => setMerchant(e.target.value)}
                        />
                        {errors.merchant && (
                            <p className="text-xs text-destructive">{errors.merchant}</p>
                        )}
                    </div>

                    {/* category dropdown */}
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.name}>
                                        {cat.icon} {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.category && (
                            <p className="text-xs text-destructive">{errors.category}</p>
                        )}
                    </div>

                    {/* amount field */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount (₹)</Label>
                        <Input
                            id="amount"
                            type="number"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        {errors.amount && (
                            <p className="text-xs text-destructive">{errors.amount}</p>
                        )}
                    </div>

                    {/* date field */}
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                        {errors.date && (
                            <p className="text-xs text-destructive">{errors.date}</p>
                        )}
                    </div>

                    {/* notes field */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (optional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Add any notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Add Expense</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
