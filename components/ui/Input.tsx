'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/* ============================================================
   ATLAS — Input Component
   ============================================================ */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    icon?: React.ReactNode;
    showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            label,
            error,
            hint,
            icon,
            showPasswordToggle = false,
            className = '',
            type,
            id,
            ...props
        },
        ref
    ) => {
        const [showPassword, setShowPassword] = useState(false);
        const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
        const isPassword = type === 'password';
        const effectiveType = isPassword && showPassword ? 'text' : type;

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        type={effectiveType}
                        className={`
              w-full
              bg-[var(--bg-secondary)]
              border border-[var(--border-subtle)]
              rounded-xl
              px-4 py-2.5
              text-sm text-[var(--text-primary)]
              placeholder:text-[var(--text-muted)]
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-[var(--accent-purple)] focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? 'pl-10' : ''}
              ${isPassword && showPasswordToggle ? 'pr-10' : ''}
              ${error ? 'border-[var(--error)] focus:ring-[var(--error)]' : ''}
              ${className}
            `}
                        {...props}
                    />
                    {isPassword && showPasswordToggle && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                            tabIndex={-1}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </button>
                    )}
                </div>
                {error && (
                    <p className="mt-1.5 text-xs text-[var(--error)]">{error}</p>
                )}
                {hint && !error && (
                    <p className="mt-1.5 text-xs text-[var(--text-muted)]">{hint}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
export { Input, type InputProps };
