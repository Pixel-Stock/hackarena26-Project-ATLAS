'use client';

import { useState } from 'react';
import { Check, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge, Button } from '@/components/ui';
import { formatCurrency, formatConfidence } from '@/lib/utils/formatting';
import { CATEGORY_NAMES, getCategoryColor } from '@/lib/utils/categories';
import { getConfidenceLevel } from '@/types';
import type { ScanLineItem } from '@/types';

/* ============================================================
   ATLAS — LineItemReview Component
   Editable table for reviewing scanned receipt items
   ============================================================ */

interface LineItemReviewProps {
    items: ScanLineItem[];
    merchantName: string;
    total: number;
    currency: string;
    confidence: number;
    modelUsed: string;
    onSave: (items: ScanLineItem[]) => void;
    onCancel: () => void;
    saving?: boolean;
}

export function LineItemReview({
    items: initialItems,
    merchantName,
    total,
    currency,
    confidence,
    modelUsed,
    onSave,
    onCancel,
    saving = false,
}: LineItemReviewProps) {
    const [items, setItems] = useState<ScanLineItem[]>(initialItems);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const confidenceLevel = getConfidenceLevel(confidence);

    const updateItem = (index: number, updates: Partial<ScanLineItem>) => {
        setItems((prev) =>
            prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
        );
    };

    const removeItem = (index: number) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const calculatedTotal = items.reduce((sum, item) => sum + item.total_price, 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="font-display font-semibold text-xl text-[var(--text-primary)]">
                        {merchantName || 'Unknown Merchant'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                        <Badge
                            variant={
                                confidenceLevel === 'high'
                                    ? 'success'
                                    : confidenceLevel === 'medium'
                                        ? 'warning'
                                        : 'error'
                            }
                        >
                            {formatConfidence(confidence)} confident
                        </Badge>
                        <span className="text-xs text-[var(--text-muted)]">
                            via {modelUsed === 'gemini' ? 'Gemini AI' : 'ATLAS ML'}
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-mono font-bold text-[var(--text-primary)]">
                        {formatCurrency(calculatedTotal, currency)}
                    </p>
                    {Math.abs(calculatedTotal - total) > 0.01 && (
                        <p className="text-xs text-[var(--warning)] flex items-center gap-1 justify-end mt-1">
                            <AlertTriangle className="h-3 w-3" />
                            Original total: {formatCurrency(total, currency)}
                        </p>
                    )}
                </div>
            </div>

            {/* Items table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--border-subtle)]">
                            <th className="text-left py-3 px-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                Item
                            </th>
                            <th className="text-left py-3 px-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                Category
                            </th>
                            <th className="text-right py-3 px-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                Qty
                            </th>
                            <th className="text-right py-3 px-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                Amount
                            </th>
                            <th className="text-right py-3 px-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                Confidence
                            </th>
                            <th className="text-right py-3 px-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider w-20">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                        {items.map((item, index) => {
                            const isEditing = editingIndex === index;
                            const itemConfidence = getConfidenceLevel(item.confidence);

                            return (
                                <tr
                                    key={index}
                                    className={`group hover:bg-[var(--bg-elevated)]/50 transition-colors ${item.confidence < 0.7 ? 'bg-amber-500/5' : ''
                                        }`}
                                >
                                    <td className="py-3 px-2">
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={(e) =>
                                                    updateItem(index, { name: e.target.value })
                                                }
                                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-sm text-[var(--text-primary)]"
                                            />
                                        ) : (
                                            <span className="text-sm text-[var(--text-primary)]">
                                                {item.name}
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-2">
                                        {isEditing ? (
                                            <select
                                                value={item.category}
                                                onChange={(e) =>
                                                    updateItem(index, { category: e.target.value })
                                                }
                                                className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-sm text-[var(--text-primary)]"
                                            >
                                                {CATEGORY_NAMES.map((cat) => (
                                                    <option key={cat} value={cat}>
                                                        {cat}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span
                                                className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full"
                                                style={{
                                                    backgroundColor: getCategoryColor(item.category) + '15',
                                                    color: getCategoryColor(item.category),
                                                }}
                                            >
                                                <span
                                                    className="w-1.5 h-1.5 rounded-full"
                                                    style={{
                                                        backgroundColor: getCategoryColor(item.category),
                                                    }}
                                                />
                                                {item.category}
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-2 text-right">
                                        <span className="text-sm font-mono text-[var(--text-secondary)]">
                                            {item.quantity}
                                        </span>
                                    </td>
                                    <td className="py-3 px-2 text-right">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={item.total_price}
                                                onChange={(e) =>
                                                    updateItem(index, {
                                                        total_price: parseFloat(e.target.value) || 0,
                                                    })
                                                }
                                                className="w-24 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-sm text-right font-mono text-[var(--text-primary)]"
                                                step="0.01"
                                            />
                                        ) : (
                                            <span className="text-sm font-mono text-[var(--text-primary)]">
                                                {formatCurrency(item.total_price, currency)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-2 text-right">
                                        <span
                                            className={`text-xs font-mono confidence-${itemConfidence}`}
                                        >
                                            {formatConfidence(item.confidence)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-2 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() =>
                                                    setEditingIndex(isEditing ? null : index)
                                                }
                                                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/10 transition-colors"
                                                aria-label={isEditing ? 'Save' : 'Edit'}
                                            >
                                                {isEditing ? (
                                                    <Check className="h-3.5 w-3.5" />
                                                ) : (
                                                    <Pencil className="h-3.5 w-3.5" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => removeItem(index)}
                                                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-red-500/10 transition-colors"
                                                aria-label="Delete"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Empty state */}
            {items.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-[var(--text-muted)]">No items extracted</p>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                <Button variant="ghost" onClick={onCancel} disabled={saving}>
                    Discard
                </Button>
                <Button onClick={() => onSave(items)} loading={saving}>
                    Save Receipt ({items.length} items)
                </Button>
            </div>
        </motion.div>
    );
}
