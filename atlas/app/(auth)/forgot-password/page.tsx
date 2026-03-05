'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Button, Input } from '@/components/ui';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/auth/validation';
import { useAuth } from '@/hooks/useAuth';

/* ============================================================
   ATLAS — Forgot Password Page
   ============================================================ */

export default function ForgotPasswordPage() {
    const { resetPassword } = useAuth();
    const [sent, setSent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverError, setServerError] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordInput>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordInput) => {
        setIsSubmitting(true);
        setServerError('');
        try {
            await resetPassword(data.email);
            setSent(true);
        } catch (err) {
            setServerError(err instanceof Error ? err.message : 'Failed to send reset email');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--gradient-hero)' }}>
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-purple)] flex items-center justify-center mx-auto mb-4">
                        <span className="font-display font-bold text-white text-lg">A</span>
                    </div>
                    <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">
                        Reset your password
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        We&apos;ll send you a magic link to reset it
                    </p>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-xl">
                    {sent ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center space-y-4"
                        >
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                                <Mail className="h-8 w-8 text-emerald-400" />
                            </div>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Check your email for a reset link. It may take a minute to arrive.
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 text-sm text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to sign in
                            </Link>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            {serverError && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {serverError}
                                </div>
                            )}
                            <Input
                                label="Email"
                                type="email"
                                placeholder="john@example.com"
                                icon={<Mail className="h-4 w-4" />}
                                error={errors.email?.message}
                                {...register('email')}
                            />
                            <Button type="submit" fullWidth loading={isSubmitting} size="lg">
                                Send Reset Link
                            </Button>
                            <Link
                                href="/login"
                                className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to sign in
                            </Link>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
