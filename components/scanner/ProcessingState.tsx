'use client';

import { motion } from 'framer-motion';
import { ScanLine, Brain, CheckCircle, Loader2 } from 'lucide-react';

/* ============================================================
   ATLAS — ProcessingState Component
   Animated OCR processing steps
   ============================================================ */

interface ProcessingStateProps {
    currentStep: number; // 0-3
    steps?: string[];
}

const DEFAULT_STEPS = [
    'Preprocessing image...',
    'Extracting text with AI...',
    'Categorizing items...',
    'Finalizing results...',
];

const STEP_ICONS = [ScanLine, Brain, Loader2, CheckCircle];

export function ProcessingState({
    currentStep,
    steps = DEFAULT_STEPS,
}: ProcessingStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 space-y-8">
            {/* Animated scanner icon */}
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                className="relative"
            >
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-purple)] flex items-center justify-center">
                    <ScanLine className="h-12 w-12 text-white" />
                </div>

                {/* Scanning line animation */}
                <motion.div
                    animate={{ y: [0, 80, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute left-0 right-0 top-2 h-0.5 bg-white/60 rounded-full"
                />
            </motion.div>

            {/* Status text */}
            <motion.p
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg font-display font-medium text-[var(--text-primary)]"
            >
                {steps[currentStep] || 'Processing...'}
            </motion.p>

            {/* Step indicators */}
            <div className="flex flex-col gap-3 w-full max-w-xs">
                {steps.map((step, index) => {
                    const Icon = STEP_ICONS[index] || Loader2;
                    const isActive = index === currentStep;
                    const isComplete = index < currentStep;
                    const isPending = index > currentStep;

                    return (
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 ${isActive
                                    ? 'bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30'
                                    : isComplete
                                        ? 'bg-emerald-500/5'
                                        : 'opacity-40'
                                }`}
                        >
                            {isComplete ? (
                                <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                            ) : isActive ? (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                >
                                    <Loader2 className="h-4 w-4 text-[var(--accent-primary)] flex-shrink-0" />
                                </motion.div>
                            ) : (
                                <Icon className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                            )}
                            <span
                                className={`text-sm ${isActive
                                        ? 'text-[var(--accent-primary)] font-medium'
                                        : isComplete
                                            ? 'text-emerald-400'
                                            : 'text-[var(--text-muted)]'
                                    }`}
                            >
                                {step}
                            </span>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
