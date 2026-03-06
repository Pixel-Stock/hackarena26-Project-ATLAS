import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { defaultUser, seedCategories, seedTransactions, seedBudgets, seedReceipts } from "@/lib/seed-data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
    try {
        // 1. Insert Default User
        const { error: userError } = await supabase.from("users").upsert({
            id: defaultUser.id,
            name: defaultUser.name,
            email: defaultUser.email,
            avatar_url: defaultUser.avatar_url,
            preferences: defaultUser.preferences
        });
        if (userError) throw new Error(`User error: ${userError.message}`);

        // 2. Insert Categories
        // first clear them if you want, or just upsert by ID. Our schema doesn't strictly have unique constraints other than id.
        const { error: catError } = await supabase.from("categories").upsert(seedCategories.map(c => ({
            ...c,
            user_id: defaultUser.id
        })));
        if (catError) throw new Error(`Categories error: ${catError.message}`);

        // 3. Insert Budgets
        const { error: budError } = await supabase.from("budgets").upsert(seedBudgets.map(b => ({
            ...b,
            user_id: defaultUser.id
        })));
        if (budError) throw new Error(`Budgets error: ${budError.message}`);

        // 4. Insert Transactions
        const { error: txnError } = await supabase.from("transactions").upsert(seedTransactions.map(t => ({
            ...t,
            user_id: defaultUser.id
        })));
        if (txnError) throw new Error(`Transactions error: ${txnError.message}`);

        // 5. Insert Receipts
        const { error: recError } = await supabase.from("receipts").upsert(seedReceipts.map(r => ({
            ...r,
            user_id: defaultUser.id
        })));
        if (recError) throw new Error(`Receipts error: ${recError.message}`);

        return NextResponse.json({ success: true, message: "Successfully seeded all data into Supabase!" });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
