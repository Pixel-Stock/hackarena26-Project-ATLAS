import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import vision from "@google-cloud/vision";

// Initialize Supabase (can use the public anon key for server-side if policies allow)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // 1. Convert file to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 2. Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `scans/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from("receipts")
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (uploadError) {
            console.error("Supabase Storage Error:", uploadError);
            return NextResponse.json({ error: "Failed to upload image to storage" }, { status: 500 });
        }

        const { data: { publicUrl } } = supabase.storage
            .from("receipts")
            .getPublicUrl(filePath);

        // 3. Initialize Google Vision Client
        let visionClient;

        try {
            if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
                // Check if it's base64 encoded or plain string
                let jsonStr = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
                if (!jsonStr.startsWith('{')) {
                    // Assume it's base64
                    jsonStr = Buffer.from(jsonStr, 'base64').toString('utf8');
                }
                const credentials = JSON.parse(jsonStr);
                visionClient = new vision.ImageAnnotatorClient({ credentials });
            } else {
                // If GOOGLE_APPLICATION_CREDENTIALS is set in env, the library handles it automatically
                visionClient = new vision.ImageAnnotatorClient();
            }
        } catch (e: any) {
            console.warn("Failed to initialize Google Vision Client. Returning dummy data.", e.message, e.stack);
            // Fallback to dummy data if vision is not configured
            return NextResponse.json({
                imageUrl: publicUrl,
                merchant: "Unknown (Vision API Not Configured)",
                amount: 0,
                text: "Google Cloud Vision API is not configured properly. Check GOOGLE_APPLICATION_CREDENTIALS_JSON or server logs."
            });
        }

        // 4. Perform OCR
        console.log("Sending image to Google Vision API...");
        let extractedText = '';
        try {
            const [result] = await visionClient.documentTextDetection(buffer);
            const fullTextAnnotation = result.fullTextAnnotation;
            extractedText = fullTextAnnotation ? fullTextAnnotation.text || "" : '';
        } catch (ocrErr: any) {
            console.error("Google Vision API Exception:", ocrErr.message, ocrErr.stack);
            return NextResponse.json({
                imageUrl: publicUrl,
                merchant: "Unknown (Vision API Failed)",
                amount: 0,
                text: "Google Cloud Vision API threw an error: " + ocrErr.message
            });
        }


        if (!extractedText) {
            return NextResponse.json({
                imageUrl: publicUrl,
                merchant: "Unknown",
                amount: 0,
                text: "No text found in image"
            });
        }

        // 5. Very basic parsing heuristic
        const lines = extractedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Assume first line is the merchant
        const merchant = lines.length > 0 ? lines[0] : "Unknown Merchant";

        // Try to find the highest currency value for amount
        let amount = 0;
        const priceRegex = /[\d]+[.,]\d{2}/g;

        const allPrices: number[] = [];
        for (const line of lines) {
            const matches = line.match(priceRegex);
            if (matches) {
                for (const m of matches) {
                    const parsed = parseFloat(m.replace(',', '.'));
                    if (!isNaN(parsed)) {
                        allPrices.push(parsed);
                    }
                }
            }
        }

        if (allPrices.length > 0) {
            // Usually the highest number is the total, but this is a naive assumption
            amount = Math.max(...allPrices);
        }

        return NextResponse.json({
            imageUrl: publicUrl,
            merchant,
            amount,
            text: extractedText
        });

    } catch (error) {
        console.error("OCR API Error:", error);
        return NextResponse.json({ error: "Server processing failed" }, { status: 500 });
    }
}
