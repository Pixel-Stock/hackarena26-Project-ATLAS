'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Input } from '@/components/ui';
import { signInSchema, type SignInInput } from '@/lib/auth/validation';
import { useAuth } from '@/hooks/useAuth';

/* ============================================================
   ATLAS — LoginForm Component
   ============================================================ */

export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect') ?? '/dashboard';
    const { signIn } = useAuth();
    const [serverError, setServerError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignInInput>({
        resolver: zodResolver(signInSchema),
        defaultValues: {
            email: '',
            password: '',
            remember_me: false,
        },
    });

    const onSubmit = async (data: SignInInput) => {
        setIsSubmitting(true);
        setServerError('');

        try {
            await signIn(data.email, data.password);
            router.push(redirect);
        } catch (err) {
            setServerError(
                err instanceof Error ? err.message : 'Invalid email or password'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
        >
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
                autoComplete="email"
                {...register('email')}
            />

            <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                icon={<Lock className="h-4 w-4" />}
                showPasswordToggle
                error={errors.password?.message}
                autoComplete="current-password"
                {...register('password')}
            />

            <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--accent-primary)] focus:ring-[var(--accent-purple)]"
                        {...register('remember_me')}
                    />
                    <span className="text-sm text-[var(--text-secondary)]">
                        Remember me
                    </span>
                </label>
                <a
                    href="/forgot-password"
                    className="text-sm text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors"
                >
                    Forgot password?
                </a>
            </div>

            <Button
                type="submit"
                fullWidth
                loading={isSubmitting}
                size="lg"
            >
                Sign In
            </Button>
        </motion.form>
    );
}
