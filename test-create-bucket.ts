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

async function tryCreateBucket() {
    console.log("Attempting to create receipts bucket automatically...");
    const { data, error } = await supabase.storage.createBucket("receipts", {
        public: true
    });
    console.log("Result:", data, "Error:", error);
}

tryCreateBucket();
