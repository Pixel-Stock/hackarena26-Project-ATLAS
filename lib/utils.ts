import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// merge tailwind classes without conflicts
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// format currency values
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

// format dates nicely
export function formatDate(date: string): string {
    return new Date(date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

// generate unique ids
export function generateId(): string {
    return crypto.randomUUID ? crypto.randomUUID() :
        Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// get remaining days in current month
export function getRemainingDaysInMonth(): number {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.getDate() - now.getDate();
}

// get current month as YYYY-MM
export function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// get month name from YYYY-MM
export function getMonthName(month: string): string {
    const [year, m] = month.split("-");
    return new Date(parseInt(year), parseInt(m) - 1).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
    });
}

// calculate percentage
export function calculatePercentage(part: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
}
