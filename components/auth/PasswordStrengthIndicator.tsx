'use client';

import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { validatePasswordStrength } from '@/lib/auth/password';

/* ============================================================
   ATLAS — PasswordStrengthIndicator
   Real-time password rule checker
   ============================================================ */

interface PasswordStrengthIndicatorProps {
    password: string;
}

const RULES = [
    { key: 'minLength' as const, label: 'At least 8 characters' },
    { key: 'maxLength' as const, label: 'At most 32 characters' },
    { key: 'hasUppercase' as const, label: 'One uppercase letter (A-Z)' },
    { key: 'hasLowercase' as const, label: 'One lowercase letter (a-z)' },
    { key: 'hasNumber' as const, label: 'One number (0-9)' },
    { key: 'hasSpecialChar' as const, label: 'One special character (!@#$...)' },
];

export function PasswordStrengthIndicator({
    password,
}: PasswordStrengthIndicatorProps) {
    const validation = useMemo(
        () => validatePasswordStrength(password),
        [password]
    );

    const metCount = RULES.filter((r) => validation[r.key]).length;
    const strength = metCount / RULES.length;

    const strengthLabel =
        strength === 1
            ? 'Strong'
            : strength >= 0.7
                ? 'Good'
                : strength >= 0.4
                    ? 'Fair'
                    : password.length > 0
                        ? 'Weak'
                        : '';

    const strengthColor =
        strength === 1
            ? 'bg-emerald-500'
            : strength >= 0.7
                ? 'bg-blue-500'
                : strength >= 0.4
                    ? 'bg-amber-500'
                    : 'bg-red-500';

    if (!password) return null;

    return (
        <div className="mt-3 space-y-3">
            {/* Strength bar */}
            <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--text-muted)]">
                        Password strength
                    </span>
                    <span
                        className={`text-xs font-medium ${strength === 1
                                ? 'text-emerald-400'
                                : strength >= 0.7
                                    ? 'text-blue-400'
                                    : strength >= 0.4
                                        ? 'text-amber-400'
                                        : 'text-red-400'
                            }`}
                    >
                        {strengthLabel}
                    </span>
                </div>
                <div className="h-1.5 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
                        style={{ width: `${strength * 100}%` }}
                    />
                </div>
            </div>

            {/* Rules checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {RULES.map((rule) => {
                    const met = validation[rule.key];
                    return (
                        <div
                            key={rule.key}
                            className="flex items-center gap-2 text-xs"
                        >
                            {met ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                            ) : (
                                <X className="h-3.5 w-3.5 text-[var(--text-muted)] flex-shrink-0" />
                            )}
                            <span
                                className={met ? 'text-emerald-400' : 'text-[var(--text-muted)]'}
                            >
                                {rule.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
