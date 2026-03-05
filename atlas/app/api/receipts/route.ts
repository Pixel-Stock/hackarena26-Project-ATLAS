import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/* ============================================================
   ATLAS — /api/receipts — GET all, POST new receipt
   ============================================================ */

export async function GET(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') ?? '0');
        const pageSize = parseInt(searchParams.get('pageSize') ?? '20');
        const sort = searchParams.get('sort') ?? 'created_at';
        const order = searchParams.get('order') ?? 'desc';

        const { data, count, error } = await supabase
            .from('receipts')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order(sort, { ascending: order === 'asc' })
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        return NextResponse.json({ data, total: count, page, pageSize });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch receipts' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { data, error } = await supabase
            .from('receipts')
            .insert({ ...body, user_id: user.id })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create receipt' },
            { status: 500 }
        );
    }
}
