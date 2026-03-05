'use client';

import { type HTMLAttributes } from 'react';

/* ============================================================
   ATLAS — Badge Component
   ============================================================ */

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
};

function Badge({
    variant = 'default',
    size = 'sm',
    className = '',
    children,
    ...props
}: BadgeProps) {
    return (
        <span
            className={`
        inline-flex items-center
        rounded-full
        border
        font-medium
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
            {...props}
        >
            {children}
        </span>
    );
}

export { Badge, type BadgeProps };
