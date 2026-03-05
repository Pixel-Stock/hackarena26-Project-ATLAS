'use client';

import { useState, useCallback } from 'react';
import { Camera, Upload, ToggleLeft, ToggleRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReceiptUploader } from '@/components/scanner/ReceiptUploader';
import { CameraCapture } from '@/components/scanner/CameraCapture';
import { ProcessingState } from '@/components/scanner/ProcessingState';
import { LineItemReview } from '@/components/scanner/LineItemReview';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ScanResult } from '@/types';

/* ============================================================
   ATLAS — Scan Page
   Full receipt scanning flow
   ============================================================ */

type ScanMode = 'upload' | 'camera';
type ScanStep = 'input' | 'processing' | 'review';

export default function ScanPage() {
    const { user } = useAuth();
    const [mode, setMode] = useState<ScanMode>('upload');
    const [step, setStep] = useState<ScanStep>('input');
    const [tornMode, setTornMode] = useState(false);
    const [processStep, setProcessStep] = useState(0);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const processReceipt = useCallback(async (files: File[]) => {
        setStep('processing');
        setProcessStep(0);
        setError(null);

        try {
            const formData = new FormData();
            files.forEach((file) => formData.append('images', file));
            formData.append('torn_mode', String(tornMode));

            // Step 1: Uploading
            setProcessStep(0);
            await new Promise((r) => setTimeout(r, 500));

            // Step 2: Extracting
            setProcessStep(1);

            const response = await fetch('/api/scan', {
                method: 'POST',
                body: formData,
            });

            // Step 3: Categorizing
            setProcessStep(2);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error ?? 'Scan failed');
            }

            const result: ScanResult = await response.json();

            // Step 4: Finalizing
            setProcessStep(3);
            await new Promise((r) => setTimeout(r, 300));

            setScanResult(result);
            setStep('review');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process receipt');
            setStep('input');
        }
    }, [tornMode]);

    const handleCameraCapture = useCallback(
        (file: File) => {
            processReceipt([file]);
        },
        [processReceipt]
    );

    const handleSave = useCallback(
        async (items: typeof scanResult extends null ? never : ScanResult['items']) => {
            if (!scanResult || !user) return;
            setSaving(true);

            try {
                // Save receipt
                const { data: receipt, error: receiptError } = await supabase
                    .from('receipts')
                    .insert({
                        user_id: user.id,
                        merchant_name: scanResult.merchant,
                        receipt_date: scanResult.date,
                        total_amount: scanResult.total,
                        currency: scanResult.currency,
                        overall_confidence: scanResult.overall_confidence,
                        model_used: scanResult.model_used,
                        raw_text: scanResult.raw_text,
                        is_torn_receipt: tornMode,
                    })
                    .select()
                    .single();

                if (receiptError) throw receiptError;

                // Save line items
                const lineItems = items.map((item) => ({
                    receipt_id: receipt.id,
                    item_name: item.name,
                    amount: item.total_price,
                    category: item.category,
                    confidence: item.confidence,
                }));

                const { error: itemsError } = await supabase
                    .from('line_items')
                    .insert(lineItems);

                if (itemsError) throw itemsError;

                // Reset
                setScanResult(null);
                setStep('input');
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to save receipt');
            } finally {
                setSaving(false);
            }
        },
        [scanResult, user, tornMode]
    );

    const handleCancel = () => {
        setScanResult(null);
        setStep('input');
        setError(null);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">
                    Scan Receipt
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Upload or capture a receipt to extract spending data
                </p>
            </div>

            {/* Error */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                    {error}
                </motion.div>
            )}

            {/* Controls (visible during input step) */}
            <AnimatePresence mode="wait">
                {step === 'input' && (
                    <motion.div
                        key="input"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                    >
                        {/* Mode toggle */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-1">
                                <button
                                    onClick={() => setMode('upload')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'upload'
                                            ? 'bg-[var(--accent-primary)] text-white'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                >
                                    <Upload className="h-4 w-4" />
                                    Upload
                                </button>
                                <button
                                    onClick={() => setMode('camera')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'camera'
                                            ? 'bg-[var(--accent-primary)] text-white'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                >
                                    <Camera className="h-4 w-4" />
                                    Camera
                                </button>
                            </div>

                            {/* Torn receipt toggle */}
                            <button
                                onClick={() => setTornMode(!tornMode)}
                                className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                {tornMode ? (
                                    <ToggleRight className="h-5 w-5 text-[var(--accent-primary)]" />
                                ) : (
                                    <ToggleLeft className="h-5 w-5" />
                                )}
                                Torn Receipt Mode
                            </button>
                        </div>

                        {/* Input area */}
                        {mode === 'upload' ? (
                            <ReceiptUploader
                                onUpload={processReceipt}
                                tornMode={tornMode}
                            />
                        ) : (
                            <CameraCapture
                                onCapture={handleCameraCapture}
                                onClose={() => setMode('upload')}
                            />
                        )}
                    </motion.div>
                )}

                {step === 'processing' && (
                    <motion.div
                        key="processing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <ProcessingState currentStep={processStep} />
                    </motion.div>
                )}

                {step === 'review' && scanResult && (
                    <motion.div
                        key="review"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <LineItemReview
                            items={scanResult.items}
                            merchantName={scanResult.merchant}
                            total={scanResult.total}
                            currency={scanResult.currency}
                            confidence={scanResult.overall_confidence}
                            modelUsed={scanResult.model_used}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            saving={saving}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
