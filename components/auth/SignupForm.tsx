'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Input } from '@/components/ui';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { signUpSchema, type SignUpInput } from '@/lib/auth/validation';
import { useAuth } from '@/hooks/useAuth';

/* ============================================================
   ATLAS — SignupForm Component
   ============================================================ */

export function SignupForm() {
    const router = useRouter();
    const { signUp } = useAuth();
    const [serverError, setServerError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<SignUpInput>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            email: '',
            password: '',
            confirm_password: '',
            full_name: '',
        },
    });

    const watchPassword = watch('password');

    const onSubmit = async (data: SignUpInput) => {
        setIsSubmitting(true);
        setServerError('');

        try {
            await signUp(data.email, data.password, data.full_name);
            router.push('/dashboard');
        } catch (err) {
            setServerError(
                err instanceof Error ? err.message : 'An error occurred during sign up'
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
                label="Full Name"
                placeholder="John Doe"
                icon={<User className="h-4 w-4" />}
                error={errors.full_name?.message}
                autoComplete="name"
                {...register('full_name')}
            />

            <Input
                label="Email"
                type="email"
                placeholder="john@example.com"
                icon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                autoComplete="email"
                {...register('email')}
            />

            <div>
                <Input
                    label="Password"
                    type="password"
                    placeholder="Create a strong password"
                    icon={<Lock className="h-4 w-4" />}
                    showPasswordToggle
                    error={errors.password?.message}
                    autoComplete="new-password"
                    {...register('password')}
                />
                <PasswordStrengthIndicator password={watchPassword || ''} />
            </div>

            <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter your password"
                icon={<Lock className="h-4 w-4" />}
                showPasswordToggle
                error={errors.confirm_password?.message}
                autoComplete="new-password"
                {...register('confirm_password')}
            />

            <Button
                type="submit"
                fullWidth
                loading={isSubmitting}
                size="lg"
            >
                Create Account
            </Button>
        </motion.form>
    );
}
