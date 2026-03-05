import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

/* ============================================================
   ATLAS — /api/admin/stats — Admin Statistics
   Uses service role to access cross-user data
   ============================================================ */

export async function GET() {
    try {
        const supabase = await createSupabaseServiceClient();

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);

        // Total users
        const { count: totalUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        // New users today
        const { count: newUsersToday } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', todayStart);

        // New users this week
        const { count: newUsersThisWeek } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', weekStart.toISOString());

        // Total receipts
        const { count: totalReceipts } = await supabase
            .from('receipts')
            .select('*', { count: 'exact', head: true });

        // Scans today
        const { count: scansToday } = await supabase
            .from('receipts')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', todayStart);

        // Average confidence & model split
        const { data: allReceipts } = await supabase
            .from('receipts')
            .select('overall_confidence, model_used');

        let totalConfidence = 0;
        let confidenceCount = 0;
        let geminiCount = 0;
        let mlCount = 0;

        (allReceipts ?? []).forEach((r) => {
            if (r.overall_confidence !== null) {
                totalConfidence += r.overall_confidence;
                confidenceCount++;
            }
            if (r.model_used === 'gemini') geminiCount++;
            if (r.model_used === 'custom_ml') mlCount++;
        });

        const totalModels = geminiCount + mlCount;

        // Top merchants
        const { data: merchantData } = await supabase
            .from('receipts')
            .select('merchant_name')
            .not('merchant_name', 'is', null);

        const merchantCounts = new Map<string, number>();
        (merchantData ?? []).forEach((r) => {
            if (r.merchant_name) {
                merchantCounts.set(r.merchant_name, (merchantCounts.get(r.merchant_name) ?? 0) + 1);
            }
        });

        const topMerchants = Array.from(merchantCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));

        // Category distribution
        const { data: lineItems } = await supabase
            .from('line_items')
            .select('category');

        const catCounts = new Map<string, number>();
        (lineItems ?? []).forEach((item) => {
            catCounts.set(item.category, (catCounts.get(item.category) ?? 0) + 1);
        });

        const totalItems = (lineItems ?? []).length;
        const categoryDistribution = Array.from(catCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([category, count]) => ({
                category,
                count,
                percent: totalItems > 0 ? (count / totalItems) * 100 : 0,
            }));

        // Low confidence count for error rate
        const lowConfidenceCount = (allReceipts ?? []).filter(
            (r) => r.overall_confidence !== null && r.overall_confidence < 0.6
        ).length;

        return NextResponse.json({
            total_users: totalUsers ?? 0,
            new_users_today: newUsersToday ?? 0,
            new_users_this_week: newUsersThisWeek ?? 0,
            total_receipts: totalReceipts ?? 0,
            scans_today: scansToday ?? 0,
            avg_confidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
            gemini_percent: totalModels > 0 ? (geminiCount / totalModels) * 100 : 0,
            custom_ml_percent: totalModels > 0 ? (mlCount / totalModels) * 100 : 0,
            top_merchants: topMerchants,
            category_distribution: categoryDistribution,
            error_rate: (allReceipts ?? []).length > 0
                ? (lowConfidenceCount / (allReceipts ?? []).length) * 100
                : 0,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch admin stats' },
            { status: 500 }
        );
    }
}
