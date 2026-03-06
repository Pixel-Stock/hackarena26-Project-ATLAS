// SnapBudget type definitions for all data models

export interface User {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
    created_at: string;
}

export interface Transaction {
    id: string;
    user_id: string;
    merchant: string;
    category: string;
    amount: number;
    date: string;
    notes: string;
    created_at: string;
}

export interface Category {
    id: string;
    user_id: string;
    name: string;
    icon: string;
    budget_limit: number;
    created_at: string;
}

export interface Budget {
    id: string;
    user_id: string;
    month: string; // YYYY-MM format
    budget_limit: number;
    created_at: string;
}

export interface Receipt {
    id: string;
    user_id: string;
    image_url: string;
    ocr_text: string;
    merchant: string;
    amount: number;
    created_at: string;
}

export interface Insight {
    id: string;
    title: string;
    description: string;
    type: "increase" | "decrease" | "info" | "warning" | "achievement";
    icon: string;
    value?: string;
    change?: number;
}

// chart data types
export interface CategorySpending {
    name: string;
    value: number;
    fill: string;
}

export interface MonthlySpending {
    month: string;
    amount: number;
}

export interface BudgetComparison {
    category: string;
    budget: number;
    actual: number;
}

export interface MerchantSpending {
    merchant: string;
    amount: number;
}
