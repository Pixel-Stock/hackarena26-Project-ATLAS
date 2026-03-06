"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useDataStore } from "@/lib/data-store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Trash2, Search, ArrowUpDown, SlidersHorizontal, RotateCcw, Check } from "lucide-react";

export default function TransactionsPage() {
    const { transactions, categories, deleteTransaction } = useDataStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
    const [showFilters, setShowFilters] = useState(false);

    // applied filter state
    const [appliedFilters, setAppliedFilters] = useState({
        category: "all",
        dateFrom: "",
        dateTo: "",
        amountMin: "",
        amountMax: "",
    });

    // draft filter state (what user is editing before applying)
    const [draftFilters, setDraftFilters] = useState({ ...appliedFilters });

    // check if any filter is active
    const hasActiveFilters =
        appliedFilters.category !== "all" ||
        appliedFilters.dateFrom ||
        appliedFilters.dateTo ||
        appliedFilters.amountMin ||
        appliedFilters.amountMax;

    // apply filters
    const applyFilters = () => {
        setAppliedFilters({ ...draftFilters });
    };

    // reset filters
    const resetFilters = () => {
        const empty = { category: "all", dateFrom: "", dateTo: "", amountMin: "", amountMax: "" };
        setDraftFilters(empty);
        setAppliedFilters(empty);
    };

    // filter and sort transactions
    const filteredTransactions = useMemo(() => {
        let filtered = [...transactions];

        // search filter — searches merchants, categories, and notes
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (t) =>
                    t.merchant.toLowerCase().includes(q) ||
                    t.category.toLowerCase().includes(q) ||
                    t.notes.toLowerCase().includes(q)
            );
        }

        // category filter
        if (appliedFilters.category !== "all") {
            filtered = filtered.filter((t) => t.category === appliedFilters.category);
        }

        // date range filter
        if (appliedFilters.dateFrom) {
            filtered = filtered.filter((t) => t.date >= appliedFilters.dateFrom);
        }
        if (appliedFilters.dateTo) {
            filtered = filtered.filter((t) => t.date <= appliedFilters.dateTo);
        }

        // amount range filter
        if (appliedFilters.amountMin) {
            filtered = filtered.filter((t) => t.amount >= parseFloat(appliedFilters.amountMin));
        }
        if (appliedFilters.amountMax) {
            filtered = filtered.filter((t) => t.amount <= parseFloat(appliedFilters.amountMax));
        }

        // sort
        switch (sortOrder) {
            case "newest":
                filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                break;
            case "oldest":
                filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                break;
            case "highest":
                filtered.sort((a, b) => b.amount - a.amount);
                break;
            case "lowest":
                filtered.sort((a, b) => a.amount - b.amount);
                break;
        }

        return filtered;
    }, [transactions, searchQuery, appliedFilters, sortOrder]);

    const totalFiltered = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
                    <p className="text-muted-foreground mt-1">
                        {filteredTransactions.length} transactions · {formatCurrency(totalFiltered)} total
                    </p>
                </div>
                <AddExpenseDialog />
            </div>

            {/* search & sort bar */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* search bar */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by merchant, category, or notes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        {/* sort dropdown */}
                        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as typeof sortOrder)}>
                            <SelectTrigger className="w-full sm:w-[160px]">
                                <ArrowUpDown className="h-4 w-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Newest First</SelectItem>
                                <SelectItem value="oldest">Oldest First</SelectItem>
                                <SelectItem value="highest">Highest Amount</SelectItem>
                                <SelectItem value="lowest">Lowest Amount</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* filters toggle button */}
                        <Button
                            variant={showFilters ? "default" : "outline"}
                            className="gap-2"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Filters
                            {hasActiveFilters && (
                                <span className="ml-1 h-5 w-5 rounded-full bg-primary-foreground text-primary text-xs flex items-center justify-center font-bold">
                                    !
                                </span>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* filter panel */}
            {showFilters && (
                <Card className="animate-fade-in">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <SlidersHorizontal className="h-4 w-4" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* category */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Category</Label>
                            <Select value={draftFilters.category} onValueChange={(v) => setDraftFilters({ ...draftFilters, category: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.name}>
                                            {cat.icon} {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* amount range */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Amount Range</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    type="number"
                                    placeholder="Min ₹"
                                    value={draftFilters.amountMin}
                                    onChange={(e) => setDraftFilters({ ...draftFilters, amountMin: e.target.value })}
                                />
                                <Input
                                    type="number"
                                    placeholder="Max ₹"
                                    value={draftFilters.amountMax}
                                    onChange={(e) => setDraftFilters({ ...draftFilters, amountMax: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* date range */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Date Range</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Start Date</span>
                                    <Input
                                        type="date"
                                        value={draftFilters.dateFrom}
                                        onChange={(e) => setDraftFilters({ ...draftFilters, dateFrom: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">End Date</span>
                                    <Input
                                        type="date"
                                        value={draftFilters.dateTo}
                                        onChange={(e) => setDraftFilters({ ...draftFilters, dateTo: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* action buttons */}
                        <div className="flex items-center justify-between pt-3 border-t border-border">
                            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={resetFilters}>
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reset Filters
                            </Button>
                            <Button size="sm" className="gap-2" onClick={applyFilters}>
                                <Check className="h-3.5 w-3.5" />
                                Apply Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* transaction list */}
            <Card>
                <CardContent className="p-0">
                    {/* table header */}
                    <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-muted/50 text-sm font-medium text-muted-foreground border-b border-border">
                        <div className="col-span-3">Merchant</div>
                        <div className="col-span-2">Category</div>
                        <div className="col-span-2 text-right">Amount</div>
                        <div className="col-span-2">Date</div>
                        <div className="col-span-2">Notes</div>
                        <div className="col-span-1"></div>
                    </div>

                    {/* table rows */}
                    {filteredTransactions.length === 0 ? (
                        <div className="flex items-center justify-center py-16 text-muted-foreground">
                            No transactions found
                        </div>
                    ) : (
                        filteredTransactions.map((t) => (
                            <div
                                key={t.id}
                                className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-6 py-4 border-b border-border last:border-0 hover:bg-accent/30 transition-colors items-center"
                            >
                                <div className="sm:col-span-3 font-medium text-sm">{t.merchant}</div>
                                <div className="sm:col-span-2">
                                    <Badge variant="secondary" className="text-xs">
                                        {t.category}
                                    </Badge>
                                </div>
                                <div className="sm:col-span-2 text-right font-semibold text-sm">
                                    {formatCurrency(t.amount)}
                                </div>
                                <div className="sm:col-span-2 text-sm text-muted-foreground">
                                    {formatDate(t.date)}
                                </div>
                                <div className="sm:col-span-2 text-sm text-muted-foreground truncate">
                                    {t.notes || "—"}
                                </div>
                                <div className="sm:col-span-1 flex justify-end">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => deleteTransaction(t.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
