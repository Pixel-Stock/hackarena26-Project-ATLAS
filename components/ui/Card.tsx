'use client';

import { type HTMLAttributes } from 'react';

/* ============================================================
   ATLAS — Card Component
   ============================================================ */

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    glass?: boolean;
}

const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
};

function Card({
    hover = false,
    padding = 'md',
    glass = false,
    className = '',
    children,
    ...props
}: CardProps) {
    return (
        <div
            className={`
        rounded-2xl
        border border-[var(--border-subtle)]
        ${glass ? 'glass' : 'bg-[var(--bg-card)]'}
        ${paddingStyles[padding]}
        ${hover ? 'card-hover cursor-pointer' : ''}
        shadow-sm
        ${className}
      `}
            {...props}
        >
            {children}
        </div>
    );
}

function CardHeader({
    className = '',
    children,
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`flex items-center justify-between mb-4 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

function CardTitle({
    className = '',
    children,
    ...props
}: HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={`font-display font-semibold text-lg text-[var(--text-primary)] ${className}`}
            {...props}
        >
            {children}
        </h3>
    );
}

function CardDescription({
    className = '',
    children,
    ...props
}: HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p
            className={`text-sm text-[var(--text-secondary)] ${className}`}
            {...props}
        >
            {children}
        </p>
    );
}

function CardContent({
    className = '',
    children,
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={className} {...props}>
            {children}
        </div>
    );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, type CardProps };
