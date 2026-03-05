'use client';

import Link from 'next/link';
import { ArrowRight, Receipt } from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui';
import { formatCurrency, formatDate, formatConfidence } from '@/lib/utils/formatting';
import { getCategoryColor } from '@/lib/utils/categories';
import { getConfidenceLevel } from '@/types';
import type { TransactionListItem } from '@/types';

/* ============================================================
   ATLAS — RecentTransactions Component
   ============================================================ */

interface RecentTransactionsProps {
    transactions: TransactionListItem[];
    currency?: string;
}

export function RecentTransactions({
    transactions,
    currency = 'INR',
}: RecentTransactionsProps) {
    return (
        <Card padding="md">
            <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <Link
                    href="/transactions"
                    className="flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors"
                >
                    View all <ArrowRight className="h-3 w-3" />
                </Link>
            </CardHeader>

            {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Receipt className="h-10 w-10 text-[var(--text-muted)] mb-3" />
                    <p className="text-sm text-[var(--text-secondary)]">
                        No transactions yet
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                        Scan your first receipt to get started
                    </p>
                    <Link
                        href="/scan"
                        className="mt-4 px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white text-sm font-medium hover:brightness-110 transition-all"
                    >
                        Scan Receipt
                    </Link>
                </div>
            ) : (
                <div className="space-y-1">
                    {transactions.map((tx) => {
                        const confidenceLevel = tx.confidence
                            ? getConfidenceLevel(tx.confidence)
                            : 'low';

                        return (
                            <Link
                                key={tx.id}
                                href={`/transactions?id=${tx.id}`}
                                className="flex items-center justify-between py-3 px-3 -mx-3 rounded-xl hover:bg-[var(--bg-elevated)]/50 transition-colors group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                        style={{
                                            backgroundColor: getCategoryColor(tx.category) + '15',
                                        }}
                                    >
                                        <span
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: getCategoryColor(tx.category) }}
                                        />
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                            {tx.merchant_name ?? 'Unknown'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-[var(--text-muted)]">
                                                {formatDate(tx.receipt_date ?? tx.created_at, 'short')}
                                            </span>
                                            <span
                                                className="text-[10px] px-1.5 py-0.5 rounded-full"
                                                style={{
                                                    backgroundColor: getCategoryColor(tx.category) + '15',
                                                    color: getCategoryColor(tx.category),
                                                }}
                                            >
                                                {tx.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right flex-shrink-0 ml-3">
                                    <p className="text-sm font-mono font-medium text-[var(--text-primary)]">
                                        {tx.total_amount !== null
                                            ? formatCurrency(tx.total_amount, currency)
                                            : '–'}
                                    </p>
                                    <p
                                        className={`text-[10px] font-mono confidence-${confidenceLevel}`}
                                    >
                                        {tx.confidence ? formatConfidence(tx.confidence) : ''}
                                    </p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}
