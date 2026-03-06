"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Transaction, Category, Budget, Receipt, User } from "./types";
import { supabase } from "./supabaseClient";
import { generateId, getCurrentMonth } from "./utils";
import { defaultUser } from "./seed-data";

// data store shape
interface DataStore {
    user: User;
    transactions: Transaction[];
    categories: Category[];
    budgets: Budget[];
    receipts: Receipt[];

    addTransaction: (t: Omit<Transaction, "id" | "user_id" | "created_at">) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;

    addCategory: (c: Omit<Category, "id" | "user_id" | "created_at">) => Promise<void>;
    updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;

    setBudget: (month: string, limit: number) => Promise<void>;
    getCurrentBudget: () => Budget | undefined;

    addReceipt: (r: Omit<Receipt, "id" | "user_id" | "created_at">) => Promise<void>;

    updateUser: (updates: Partial<User>) => Promise<void>;
}

const DataContext = createContext<DataStore | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
    const [isHydrated, setIsHydrated] = useState(false);
    const [user, setUser] = useState<User>(defaultUser);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch default user
            let currentUser = defaultUser;
            const { data: userData } = await supabase.from("users").select("*").limit(1).single();
            
            if (userData) {
                currentUser = userData as User;
                setUser(currentUser);
            } else {
                // Ensure a demo user exists
                const { data: newUserData, error } = await supabase.from("users").insert({
                    id: defaultUser.id,
                    name: defaultUser.name,
                    email: defaultUser.email,
                    avatar_url: defaultUser.avatar_url,
                    preferences: defaultUser.preferences
                }).select().single();
                
                if (newUserData) {
                    currentUser = newUserData as User;
                    setUser(currentUser);
                } else {
                    console.error("Failed to fetch or create generic user:", error);
                }
            }

            const [
                { data: txData },
                { data: catData },
                { data: budData },
                { data: recData }
            ] = await Promise.all([
                supabase.from("transactions").select("*").order("date", { ascending: false }),
                supabase.from("categories").select("*"),
                supabase.from("budgets").select("*"),
                supabase.from("receipts").select("*").order("created_at", { ascending: false }),
            ]);

            if (txData) setTransactions(txData as Transaction[]);
            
            if (catData && catData.length > 0) {
                setCategories(catData as Category[]);
            } else if (currentUser) {
                // Seed initial categories if empty
                const { seedCategories } = await import("./seed-data");
                const catsToInsert = seedCategories.map(c => ({
                    user_id: currentUser.id,
                    name: c.name,
                    icon: c.icon,
                    color: c.color
                }));
                const { data: newCats } = await supabase.from("categories").insert(catsToInsert).select();
                if (newCats) setCategories(newCats as Category[]);
            }

            if (budData) setBudgets(budData as Budget[]);
            if (recData) setReceipts(recData as Receipt[]);

            setIsHydrated(true);
        };

        fetchData();
    }, []);

    const addTransaction = useCallback(async (t: Omit<Transaction, "id" | "user_id" | "created_at">) => {
        const { data, error } = await supabase.from("transactions").insert({
            ...t,
            user_id: user.id,
        }).select().single();
        if (!error && data) {
            setTransactions(prev => [data as Transaction, ...prev]);
        } else {
            console.error("Failed to add transaction:", error);
        }
    }, [user.id]);

    const deleteTransaction = useCallback(async (id: string) => {
        const { error } = await supabase.from("transactions").delete().eq("id", id);
        if (!error) {
            setTransactions(prev => prev.filter(t => t.id !== id));
        }
    }, []);

    const addCategory = useCallback(async (c: Omit<Category, "id" | "user_id" | "created_at">) => {
        const { data, error } = await supabase.from("categories").insert({
            ...c,
            user_id: user.id,
        }).select().single();
        if (!error && data) {
            setCategories(prev => [...prev, data as Category]);
        }
    }, [user.id]);

    const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
        const { error } = await supabase.from("categories").update(updates).eq("id", id);
        if (!error) {
            setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
        }
    }, []);

    const deleteCategory = useCallback(async (id: string) => {
        const { error } = await supabase.from("categories").delete().eq("id", id);
        if (!error) {
            setCategories(prev => prev.filter(c => c.id !== id));
        }
    }, []);

    const setBudgetForMonth = useCallback(async (month: string, limit: number) => {
        const existing = budgets.find(b => b.month === month);
        if (existing) {
            const { error } = await supabase.from("budgets").update({ budget_limit: limit }).eq("id", existing.id);
            if (!error) {
                setBudgets(prev => prev.map(b => b.id === existing.id ? { ...b, budget_limit: limit } : b));
            }
        } else {
            const { data, error } = await supabase.from("budgets").insert({
                user_id: user.id,
                month,
                budget_limit: limit,
            }).select().single();
            if (!error && data) {
                setBudgets(prev => [...prev, data as Budget]);
            }
        }
    }, [budgets, user.id]);

    const getCurrentBudget = useCallback(() => {
        const currentMonth = getCurrentMonth();
        return budgets.find((b) => b.month === currentMonth);
    }, [budgets]);

    const addReceipt = useCallback(async (r: Omit<Receipt, "id" | "user_id" | "created_at">) => {
        const { data, error } = await supabase.from("receipts").insert({
            ...r,
            user_id: user.id,
        }).select().single();
        if (!error && data) {
            setReceipts(prev => [data as Receipt, ...prev]);
        } else {
            console.error("Failed to insert receipt:", error);
        }
    }, [user.id]);

    const updateUserProfile = useCallback(async (updates: Partial<User>) => {
        const { error } = await supabase.from("users").update(updates).eq("id", user.id);
        if (!error) {
            setUser(prev => ({ ...prev, ...updates }));
        }
    }, [user.id]);

    const value: DataStore = {
        user,
        transactions,
        categories,
        budgets,
        receipts,
        addTransaction,
        deleteTransaction,
        addCategory,
        updateCategory,
        deleteCategory,
        setBudget: setBudgetForMonth,
        getCurrentBudget,
        addReceipt,
        updateUser: updateUserProfile,
    };

    if (!isHydrated) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
                    <div className="text-muted-foreground font-medium">Connecting to Database...</div>
                </div>
            </div>
        );
    }

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataStore() {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useDataStore must be used within DataProvider");
    }
    return context;
}
