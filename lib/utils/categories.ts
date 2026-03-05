/* ============================================================
   ATLAS — Category Helpers
   Maps, colors, icons for spending categories
   ============================================================ */

export interface CategoryInfo {
    name: string;
    icon: string;
    color: string;
}

export const CATEGORIES: Record<string, CategoryInfo> = {
    'Food & Dining': { name: 'Food & Dining', icon: 'utensils', color: '#f97316' },
    'Groceries': { name: 'Groceries', icon: 'shopping-cart', color: '#22c55e' },
    'Health & Medicine': { name: 'Health & Medicine', icon: 'heart-pulse', color: '#ef4444' },
    'Personal Care': { name: 'Personal Care', icon: 'sparkles', color: '#a855f7' },
    'Home & Household': { name: 'Home & Household', icon: 'home', color: '#3b82f6' },
    'Electronics': { name: 'Electronics', icon: 'cpu', color: '#06b6d4' },
    'Clothing & Fashion': { name: 'Clothing & Fashion', icon: 'shirt', color: '#ec4899' },
    'Transport': { name: 'Transport', icon: 'car', color: '#eab308' },
    'Entertainment': { name: 'Entertainment', icon: 'film', color: '#8b5cf6' },
    'Education': { name: 'Education', icon: 'book-open', color: '#14b8a6' },
    'Takeout & Delivery': { name: 'Takeout & Delivery', icon: 'package', color: '#f59e0b' },
    'Other': { name: 'Other', icon: 'circle-dot', color: '#6b7280' },
};

export const CATEGORY_NAMES = Object.keys(CATEGORIES);

/**
 * Get category info by name, with fallback to "Other".
 */
export function getCategoryInfo(categoryName: string): CategoryInfo {
    return CATEGORIES[categoryName] ?? CATEGORIES['Other'];
}

/**
 * Get category color by name.
 */
export function getCategoryColor(categoryName: string): string {
    return getCategoryInfo(categoryName).color;
}

/**
 * Get all category colors as an array (for charts).
 */
export function getCategoryColors(): string[] {
    return CATEGORY_NAMES.map((name) => CATEGORIES[name].color);
}

/**
 * Normalize a merchant name for CrowdTag fingerprinting.
 * Lowercases, strips extra whitespace, removes common suffixes.
 */
export function normalizeMerchantKey(merchantName: string, city: string = ''): string {
    const normalized = merchantName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/(pvt|ltd|llc|inc|corp|limited|private)\s*/g, '')
        .trim();

    const cityPart = city
        ? '_' + city.toLowerCase().replace(/[^a-z0-9]/g, '')
        : '';

    return normalized.replace(/\s+/g, '_') + cityPart;
}

/**
 * CrowdTag stub: Log a merchant category vote.
 * Called after every successful scan. Phase 2 will add full logic.
 */
export async function logMerchantVote(
    merchantKey: string,
    category: string,
    _userId: string
): Promise<void> {
    // Phase 2: This will upsert the merchant_fingerprints table,
    // increment the category vote, recalculate dominant_category,
    // and update confidence_score.
    if (process.env.NODE_ENV === 'development') {
        console.log(`[CrowdTag] Vote logged: ${merchantKey} → ${category}`);
    }
}
