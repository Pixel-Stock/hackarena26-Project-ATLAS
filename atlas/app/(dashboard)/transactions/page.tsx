'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Filter, Receipt, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Badge, Button, Input } from '@/components/ui';
import { useReceipts } from '@/hooks/useReceipts';
import { formatCurrency, formatDate, formatConfidence } from '@/lib/utils/formatting';
import { getCategoryColor, CATEGORY_NAMES } from '@/lib/utils/categories';
import { getConfidenceLevel } from '@/types';
import type { TransactionFilters, LineItem } from '@/types';

/* ============================================================
   ATLAS — Transactions Page
   Full paginated, searchable, filterable transaction history
   ============================================================ */

export default function TransactionsPage() {
    const { receipts, loading, totalCount, fetchReceipts, fetchReceiptById } = useReceipts();
    const [filters, setFilters] = useState<TransactionFilters>({
        search: '',
        categories: [],
        date_range: 'this_month',
        custom_date_range: null,
        amount_min: null,
        amount_max: null,
        sort_field: 'date',
        sort_direction: 'desc',
    });
    const [page, setPage] = useState(0);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchReceipts(filters, page);
    }, [fetchReceipts, filters, page]);

    const handleExpand = useCallback(async (id: string) => {
        if (expandedId === id) {
            setExpandedId(null);
            setLineItems([]);
            return;
        }
        setExpandedId(id);
        const result = await fetchReceiptById(id);
        if (result) setLineItems(result.lineItems);
    }, [expandedId, fetchReceiptById]);

    const toggleSort = (field: 'date' | 'amount' | 'confidence') => {
        setFilters(prev => ({
            ...prev,
            sort_field: field,
            sort_direction: prev.sort_field === field && prev.sort_direction === 'desc' ? 'asc' : 'desc',
        }));
    };

    const totalPages = Math.ceil(totalCount / 20);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">
                    Transactions
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                    {totalCount} receipts scanned
                </p>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                    <Input
                        placeholder="Search by merchant name..."
                        icon={<Search className="h-4 w-4" />}
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                </div>
                <Button
                    variant="secondary"
                    icon={<Filter className="h-4 w-4" />}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    Filters
                </Button>
            </div>

            {/* Filter panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <Card padding="md">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Date Range</label>
                                    <select
                                        value={filters.date_range}
                                        onChange={(e) => setFilters(prev => ({ ...prev, date_range: e.target.value as TransactionFilters['date_range'] }))}
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)]"
                                    >
                                        <option value="this_week">This Week</option>
                                        <option value="this_month">This Month</option>
                                        <option value="last_3_months">Last 3 Months</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Min Amount</label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={filters.amount_min ?? ''}
                                        onChange={(e) => setFilters(prev => ({ ...prev, amount_min: e.target.value ? Number(e.target.value) : null }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Max Amount</label>
                                    <Input
                                        type="number"
                                        placeholder="99999"
                                        value={filters.amount_max ?? ''}
                                        onChange={(e) => setFilters(prev => ({ ...prev, amount_max: e.target.value ? Number(e.target.value) : null }))}
                                    />
                                </div>
                            </div>
                            <div className="mt-3">
                                <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Categories</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORY_NAMES.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => {
                                                setFilters(prev => ({
                                                    ...prev,
                                                    categories: prev.categories.includes(cat)
                                                        ? prev.categories.filter(c => c !== cat)
                                                        : [...prev.categories, cat]
                                                }));
                                            }}
                                            className={`px-3 py-1 rounded-full text-xs border transition-all ${filters.categories.includes(cat)
                                                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                                                    : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Table */}
            <Card padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--border-subtle)]">
                                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--text-muted)]">Merchant</th>
                                <th
                                    className="text-left py-3 px-4 text-xs font-medium text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)]"
                                    onClick={() => toggleSort('date')}
                                >
                                    <span className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></span>
                                </th>
                                <th
                                    className="text-right py-3 px-4 text-xs font-medium text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)]"
                                    onClick={() => toggleSort('amount')}
                                >
                                    <span className="flex items-center justify-end gap-1">Amount <ArrowUpDown className="h-3 w-3" /></span>
                                </th>
                                <th
                                    className="text-right py-3 px-4 text-xs font-medium text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)]"
                                    onClick={() => toggleSort('confidence')}
                                >
                                    <span className="flex items-center justify-end gap-1">Confidence <ArrowUpDown className="h-3 w-3" /></span>
                                </th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-[var(--text-muted)]">Model</th>
                                <th className="w-10" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {receipts.map((receipt) => {
                                const isExpanded = expandedId === receipt.id;
                                const cl = receipt.overall_confidence ? getConfidenceLevel(receipt.overall_confidence) : 'low';

                                return (
                                    <motion.tr
                                        key={receipt.id}
                                        layout
                                        className="hover:bg-[var(--bg-elevated)]/50 cursor-pointer transition-colors"
                                        onClick={() => handleExpand(receipt.id)}
                                    >
                                        <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                                            {receipt.merchant_name ?? 'Unknown'}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                                            {formatDate(receipt.receipt_date ?? receipt.created_at)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-sm font-mono text-[var(--text-primary)]">
                                            {receipt.total_amount !== null ? formatCurrency(receipt.total_amount, receipt.currency) : '–'}
                                        </td>
                                        <td className={`py-3 px-4 text-right text-xs font-mono confidence-${cl}`}>
                                            {formatConfidence(receipt.overall_confidence)}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <Badge variant={receipt.model_used === 'gemini' ? 'purple' : 'info'} size="sm">
                                                {receipt.model_used ?? 'N/A'}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4">
                                            {isExpanded ? <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />}
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                    {expandedId && lineItems.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-4 pb-4 border-t border-[var(--border-subtle)]"
                        >
                            <div className="pt-4 space-y-2">
                                <h4 className="text-sm font-medium text-[var(--text-secondary)]">Line Items</h4>
                                {lineItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-elevated)]/50">
                                        <div className="flex items-center gap-3">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(item.category) }} />
                                            <span className="text-sm text-[var(--text-primary)]">{item.item_name}</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: getCategoryColor(item.category) + '15', color: getCategoryColor(item.category) }}>
                                                {item.category}
                                            </span>
                                        </div>
                                        <span className="text-sm font-mono text-[var(--text-primary)]">
                                            {formatCurrency(item.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Empty state */}
                {!loading && receipts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Receipt className="h-12 w-12 text-[var(--text-muted)] mb-4" />
                        <p className="text-[var(--text-secondary)]">No transactions found</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Try adjusting your filters or scan a receipt</p>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-subtle)]">
                        <span className="text-xs text-[var(--text-muted)]">Page {page + 1} of {totalPages}</span>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
                            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
