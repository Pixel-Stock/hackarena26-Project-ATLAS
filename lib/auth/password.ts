import bcrypt from 'bcryptjs';
import type { PasswordValidation } from '@/types';

/* ============================================================
   ATLAS — Password Utilities
   bcrypt hashing with cost factor 12
   ============================================================ */

const BCRYPT_COST_FACTOR = 12;

/**
 * Hash a password using bcrypt with cost factor 12.
 * Only call this in API routes (Node.js runtime), not in middleware (Edge).
 */
export async function hashPassword(plaintext: string): Promise<string> {
    const salt = await bcrypt.genSalt(BCRYPT_COST_FACTOR);
    return bcrypt.hash(plaintext, salt);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(
    plaintext: string,
    hash: string
): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
}

/**
 * Validate password strength and return per-rule status.
 * Used for real-time password strength indicator in the UI.
 */
export function validatePasswordStrength(password: string): PasswordValidation {
    const minLength = password.length >= 8;
    const maxLength = password.length <= 32;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);

    return {
        minLength,
        maxLength,
        hasUppercase,
        hasLowercase,
        hasNumber,
        hasSpecialChar,
        isValid:
            minLength &&
            maxLength &&
            hasUppercase &&
            hasLowercase &&
            hasNumber &&
            hasSpecialChar,
    };
}

/**
 * Simple in-memory rate limiter for auth endpoints.
 * Maps IP → { count, resetAt }
 */
const rateLimitMap = new Map<
    string,
    { count: number; resetAt: number }
>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(ip: string): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
} {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetAt: now + WINDOW_MS };
    }

    if (entry.count >= MAX_ATTEMPTS) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count += 1;
    return {
        allowed: true,
        remaining: MAX_ATTEMPTS - entry.count,
        resetAt: entry.resetAt,
    };
}

/**
 * Clean up expired entries periodically to prevent memory leaks.
 * Called automatically every 5 minutes.
 */
function cleanupRateLimitMap(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
        if (now > entry.resetAt) {
            rateLimitMap.delete(key);
        }
    }
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupRateLimitMap, 5 * 60 * 1000);
}
