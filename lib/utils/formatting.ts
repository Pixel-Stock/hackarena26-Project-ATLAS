/* ============================================================
   ATLAS — Utility Functions: Formatting
   Currency, date, number formatters
   ============================================================ */

/**
 * Format amount as currency string.
 * Default: INR with ₹ symbol.
 */
export function formatCurrency(
    amount: number,
    currency: string = 'INR'
): string {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format a date string to a human-readable format.
 */
export function formatDate(
    dateString: string | null,
    format: 'short' | 'long' | 'relative' = 'short'
): string {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);

    if (isNaN(date.getTime())) return 'Invalid date';

    if (format === 'relative') {
        return getRelativeTime(date);
    }

    if (format === 'long') {
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(date);
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

/**
 * Get relative time string (e.g., "2 hours ago", "3 days ago").
 */
function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return formatDate(date.toISOString(), 'short');
}

/**
 * Format a percentage with +/- prefix and arrow.
 */
export function formatPercentChange(change: number): {
    text: string;
    isPositive: boolean;
    isNeutral: boolean;
} {
    if (change === 0) {
        return { text: '0%', isPositive: false, isNeutral: true };
    }

    const prefix = change > 0 ? '+' : '';
    return {
        text: `${prefix}${change.toFixed(1)}%`,
        isPositive: change > 0,
        isNeutral: false,
    };
}

/**
 * Format a confidence score as percentage.
 */
export function formatConfidence(confidence: number | null): string {
    if (confidence === null || confidence === undefined) return 'N/A';
    return `${Math.round(confidence * 100)}%`;
}

/**
 * Truncate text with ellipsis.
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format file size in human-readable format.
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}
