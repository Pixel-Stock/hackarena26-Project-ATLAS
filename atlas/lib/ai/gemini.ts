import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/lib/utils/logger';
import type { GeminiResponse } from '@/types';

/* ============================================================
   ATLAS — Gemini Vision API Wrapper
   Uses gemini-1.5-flash for receipt OCR and categorization
   ============================================================ */

const GEMINI_PROMPT = `You are a receipt parsing engine. Analyze this receipt image and extract ALL information with maximum precision.

Return ONLY a valid JSON object with this exact structure, no markdown, no explanation:
{
  "merchant_name": "string — the store or restaurant name",
  "receipt_date": "YYYY-MM-DD or null if unclear",
  "total_amount": number,
  "currency": "INR or USD or detected currency code",
  "line_items": [
    {
      "name": "item name exactly as printed",
      "quantity": number or 1 if not specified,
      "unit_price": number,
      "total_price": number,
      "category": "one of: Food & Dining, Groceries, Health & Medicine, Personal Care, Home & Household, Electronics, Clothing & Fashion, Transport, Entertainment, Education, Takeout & Delivery, Other",
      "confidence": number between 0.0 and 1.0
    }
  ],
  "subtotal": number or null,
  "tax": number or null,
  "discount": number or null,
  "overall_confidence": number between 0.0 and 1.0 — your confidence in the entire extraction
}

Rules:
- If the image is too blurry, torn, or unreadable, set overall_confidence below 0.5 and return best effort
- Categorize each item based on what it actually is, not the store type
- A pharmacy receipt might have medicine (Health), snacks (Food), and soap (Personal Care) — categorize each individually
- Never hallucinate items that aren't visible on the receipt
- Amounts should be numbers only, no currency symbols`;

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not set in environment variables');
        }
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

/**
 * Analyze a receipt image using Google Gemini Vision API.
 * Returns structured receipt data with confidence scores.
 */
export async function analyzeReceiptWithGemini(
    imageBuffer: Buffer,
    mimeType: string
): Promise<GeminiResponse> {
    const startTime = Date.now();
    logger.info('Gemini', 'Starting receipt analysis');

    try {
        const ai = getGenAI();
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const imagePart = {
            inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType,
            },
        };

        const result = await model.generateContent([GEMINI_PROMPT, imagePart]);
        const response = result.response;
        const text = response.text();

        // Clean response: strip markdown code fences if present
        const cleanedText = text
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .trim();

        const parsed: GeminiResponse = JSON.parse(cleanedText);

        // Validate key fields
        if (typeof parsed.overall_confidence !== 'number') {
            parsed.overall_confidence = 0.5;
        }
        if (!Array.isArray(parsed.line_items)) {
            parsed.line_items = [];
        }

        // Ensure each line item has required fields
        parsed.line_items = parsed.line_items.map((item) => ({
            name: item.name || 'Unknown Item',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            total_price: item.total_price || item.unit_price || 0,
            category: item.category || 'Other',
            confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
        }));

        const elapsed = Date.now() - startTime;
        logger.info('Gemini', `Analysis complete in ${elapsed}ms`, {
            merchant: parsed.merchant_name,
            items: parsed.line_items.length,
            confidence: parsed.overall_confidence,
        });

        return parsed;
    } catch (error) {
        logger.error('Gemini', 'Receipt analysis failed', error);
        throw new Error(
            `Gemini Vision API error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Merge results from two images (torn receipt mode).
 * Combines line items from both, deduplicates, and recalculates total.
 */
export async function analyzeMultipleImages(
    images: { buffer: Buffer; mimeType: string }[]
): Promise<GeminiResponse> {
    const results = await Promise.all(
        images.map((img) => analyzeReceiptWithGemini(img.buffer, img.mimeType))
    );

    // Merge: use first result as base, append unique items from others
    const merged = { ...results[0] };
    const existingNames = new Set(
        merged.line_items.map((item) => item.name.toLowerCase())
    );

    for (let i = 1; i < results.length; i++) {
        for (const item of results[i].line_items) {
            if (!existingNames.has(item.name.toLowerCase())) {
                merged.line_items.push(item);
                existingNames.add(item.name.toLowerCase());
            }
        }

        // Use merchant name from higher confidence result
        if (results[i].overall_confidence > merged.overall_confidence) {
            merged.merchant_name = results[i].merchant_name;
            merged.receipt_date = results[i].receipt_date;
        }
    }

    // Recalculate total
    merged.total_amount = merged.line_items.reduce(
        (sum, item) => sum + item.total_price,
        0
    );

    // Average confidence
    merged.overall_confidence =
        results.reduce((sum, r) => sum + r.overall_confidence, 0) / results.length;

    return merged;
}
