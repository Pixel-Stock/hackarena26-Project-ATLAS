'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Receipt, LineItem, TransactionFilters } from '@/types';

interface UseReceiptsReturn {
    receipts: Receipt[];
    loading: boolean;
    error: string | null;
    totalCount: number;
    fetchReceipts: (filters?: Partial<TransactionFilters>, page?: number, pageSize?: number) => Promise<void>;
    fetchReceiptById: (id: string) => Promise<{ receipt: Receipt; lineItems: LineItem[] } | null>;
    deleteReceipt: (id: string) => Promise<void>;
    updateLineItem: (id: string, updates: Partial<LineItem>) => Promise<void>;
    deleteLineItem: (id: string) => Promise<void>;
}

export function useReceipts(): UseReceiptsReturn {
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);

    const fetchReceipts = useCallback(
        async (
            filters?: Partial<TransactionFilters>,
            page: number = 0,
            pageSize: number = 20
        ) => {
            setLoading(true);
            setError(null);

            try {
                let query = supabase
                    .from('receipts')
                    .select('*', { count: 'exact' })
                    .order(
                        filters?.sort_field === 'amount' ? 'total_amount' :
                            filters?.sort_field === 'confidence' ? 'overall_confidence' :
                                'created_at',
                        { ascending: filters?.sort_direction === 'asc' }
                    )
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                // Apply search filter
                if (filters?.search) {
                    query = query.ilike('merchant_name', `%${filters.search}%`);
                }

                // Apply date range filter
                if (filters?.date_range) {
                    const now = new Date();
                    let startDate: Date;

                    switch (filters.date_range) {
                        case 'this_week':
                            startDate = new Date(now);
                            startDate.setDate(now.getDate() - now.getDay());
                            startDate.setHours(0, 0, 0, 0);
                            break;
                        case 'this_month':
                            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                            break;
                        case 'last_3_months':
                            startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                            break;
                        case 'custom':
                            if (filters.custom_date_range) {
                                query = query
                                    .gte('created_at', filters.custom_date_range.start.toISOString())
                                    .lte('created_at', filters.custom_date_range.end.toISOString());
                            }
                            startDate = new Date(0); // Won't be used
                            break;
                        default:
                            startDate = new Date(0);
                    }

                    if (filters.date_range !== 'custom') {
                        query = query.gte('created_at', startDate.toISOString());
                    }
                }

                // Apply amount filters
                if (filters?.amount_min !== null && filters?.amount_min !== undefined) {
                    query = query.gte('total_amount', filters.amount_min);
                }
                if (filters?.amount_max !== null && filters?.amount_max !== undefined) {
                    query = query.lte('total_amount', filters.amount_max);
                }

                const { data, count, error: fetchError } = await query;

                if (fetchError) throw fetchError;

                setReceipts((data as Receipt[]) ?? []);
                setTotalCount(count ?? 0);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch receipts');
            } finally {
                setLoading(false);
            }
        },
        []
    );

    const fetchReceiptById = useCallback(
        async (id: string): Promise<{ receipt: Receipt; lineItems: LineItem[] } | null> => {
            try {
                const [receiptResult, itemsResult] = await Promise.all([
                    supabase.from('receipts').select('*').eq('id', id).single(),
                    supabase
                        .from('line_items')
                        .select('*')
                        .eq('receipt_id', id)
                        .order('created_at', { ascending: true }),
                ]);

                if (receiptResult.error) throw receiptResult.error;
                if (itemsResult.error) throw itemsResult.error;

                return {
                    receipt: receiptResult.data as Receipt,
                    lineItems: (itemsResult.data as LineItem[]) ?? [],
                };
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch receipt');
                return null;
            }
        },
        []
    );

    const deleteReceipt = useCallback(async (id: string) => {
        const { error: deleteError } = await supabase
            .from('receipts')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        setReceipts((prev) => prev.filter((r) => r.id !== id));
        setTotalCount((prev) => prev - 1);
    }, []);

    const updateLineItem = useCallback(
        async (id: string, updates: Partial<LineItem>) => {
            const { error: updateError } = await supabase
                .from('line_items')
                .update({ ...updates, manually_corrected: true })
                .eq('id', id);

            if (updateError) throw updateError;
        },
        []
    );

    const deleteLineItem = useCallback(async (id: string) => {
        const { error: deleteError } = await supabase
            .from('line_items')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;
    }, []);

    return {
        receipts,
        loading,
        error,
        totalCount,
        fetchReceipts,
        fetchReceiptById,
        deleteReceipt,
        updateLineItem,
        deleteLineItem,
    };
}
