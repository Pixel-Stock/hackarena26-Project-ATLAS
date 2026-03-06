import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const envLines = envContent.split('\n');
for (const line of envLines) {
    if (line.includes('=')) {
        const [k, v] = line.split('=');
        process.env[k.trim()] = v.trim();
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabase() {
    const report: any = {};
    try {
        const { data: users, error: usersError } = await supabase.from('users').select('id').limit(1);
        report.db = { success: !!users, error: usersError?.message };
    } catch (e: any) { report.db = { success: false, error: e.message }; }

    try {
        const testBuffer = Buffer.from("test");
        const { data: upload, error: uploadError } = await supabase.storage.from("receipts").upload(`test-diagnostics-${Date.now()}.txt`, testBuffer);
        report.storage = { success: !!upload, error: uploadError?.message, name: uploadError?.name, status: (uploadError as any)?.statusCode };
    } catch (e: any) { report.storage = { success: false, error: e.message }; }

    fs.writeFileSync('diag2.json', JSON.stringify(report, null, 2), 'utf8');
}

checkDatabase();
