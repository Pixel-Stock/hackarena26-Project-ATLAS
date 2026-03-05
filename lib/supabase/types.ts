/* ============================================================
   ATLAS — Supabase Generated TypeScript Types
   These types mirror the database schema for type safety.
   ============================================================ */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    full_name: string;
                    email: string;
                    avatar_url: string | null;
                    role: 'user' | 'admin';
                    theme_preference: 'dark' | 'light' | 'system';
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    full_name: string;
                    email: string;
                    avatar_url?: string | null;
                    role?: 'user' | 'admin';
                    theme_preference?: 'dark' | 'light' | 'system';
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    full_name?: string;
                    email?: string;
                    avatar_url?: string | null;
                    role?: 'user' | 'admin';
                    theme_preference?: 'dark' | 'light' | 'system';
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            receipts: {
                Row: {
                    id: string;
                    user_id: string;
                    merchant_name: string | null;
                    receipt_date: string | null;
                    total_amount: number | null;
                    currency: string;
                    overall_confidence: number | null;
                    model_used: 'gemini' | 'custom_ml' | null;
                    raw_text: string | null;
                    is_torn_receipt: boolean;
                    notes: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    merchant_name?: string | null;
                    receipt_date?: string | null;
                    total_amount?: number | null;
                    currency?: string;
                    overall_confidence?: number | null;
                    model_used?: 'gemini' | 'custom_ml' | null;
                    raw_text?: string | null;
                    is_torn_receipt?: boolean;
                    notes?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    merchant_name?: string | null;
                    receipt_date?: string | null;
                    total_amount?: number | null;
                    currency?: string;
                    overall_confidence?: number | null;
                    model_used?: 'gemini' | 'custom_ml' | null;
                    raw_text?: string | null;
                    is_torn_receipt?: boolean;
                    notes?: string | null;
                    created_at?: string;
                };
            };
            line_items: {
                Row: {
                    id: string;
                    receipt_id: string;
                    item_name: string;
                    amount: number;
                    category: string;
                    confidence: number | null;
                    manually_corrected: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    receipt_id: string;
                    item_name: string;
                    amount: number;
                    category: string;
                    confidence?: number | null;
                    manually_corrected?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    receipt_id?: string;
                    item_name?: string;
                    amount?: number;
                    category?: string;
                    confidence?: number | null;
                    manually_corrected?: boolean;
                    created_at?: string;
                };
            };
            categories: {
                Row: {
                    id: string;
                    name: string;
                    icon: string | null;
                    color: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    icon?: string | null;
                    color?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    icon?: string | null;
                    color?: string | null;
                    created_at?: string;
                };
            };
            merchant_fingerprints: {
                Row: {
                    id: string;
                    merchant_key: string;
                    category_votes: Record<string, number>;
                    dominant_category: string | null;
                    confidence_score: number;
                    total_votes: number;
                    is_resolved: boolean;
                    seeded_from_places_api: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    merchant_key: string;
                    category_votes?: Record<string, number>;
                    dominant_category?: string | null;
                    confidence_score?: number;
                    total_votes?: number;
                    is_resolved?: boolean;
                    seeded_from_places_api?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    merchant_key?: string;
                    category_votes?: Record<string, number>;
                    dominant_category?: string | null;
                    confidence_score?: number;
                    total_votes?: number;
                    is_resolved?: boolean;
                    seeded_from_places_api?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
    };
}
