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

async function testUpload() {
    console.log("Checking buckets...");
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    console.log("Buckets:", buckets, "Error:", bucketError);

    console.log("Attempting test upload...");
    const testBuffer = Buffer.from("test image content");
    const { data, error } = await supabase.storage.from("receipts").upload("test.txt", testBuffer, { upsert: true });
    console.log("Upload result:", data, "Error:", error);
}

testUpload();
