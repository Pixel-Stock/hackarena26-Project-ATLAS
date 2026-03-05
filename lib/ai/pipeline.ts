import { analyzeReceiptWithGemini, analyzeMultipleImages } from './gemini';
import { getATLASModel } from './custom-model';
import { logger } from '@/lib/utils/logger';
import type { ScanResult, ScanLineItem, PipelineResult, GeminiResponse, MLModelResult } from '@/types';

/* ============================================================
   ATLAS — Dual-Model Pipeline Orchestrator
   Runs both Gemini and custom ML in parallel.
   Picks the result with higher confidence.
   ============================================================ */

const MIN_CONFIDENCE_THRESHOLD = 0.60;

/**
 * Run the dual-model OCR pipeline.
 * Both models process the image in parallel.
 * The result with higher confidence wins.
 */
export async function runPipeline(
    imageBuffer: Buffer,
    mimeType: string,
    isTornReceipt: boolean = false,
    additionalImages: { buffer: Buffer; mimeType: string }[] = []
): Promise<PipelineResult> {
    const startTime = Date.now();
    logger.info('Pipeline', 'Starting dual-model pipeline');

    // Prepare image inputs
    const allImages = [{ buffer: imageBuffer, mimeType }, ...additionalImages];

    // Run both models in parallel
    const [geminiResult, mlResult] = await Promise.all([
        runGemini(allImages, isTornReceipt),
        runCustomML(imageBuffer),
    ]);

    const geminiConfidence = geminiResult.overall_confidence;
    const mlConfidence = mlResult.overall_confidence;

    logger.info('Pipeline', 'Model results', {
        gemini_confidence: geminiConfidence,
        ml_confidence: mlConfidence,
    });

    // Check if both models have low confidence
    if (geminiConfidence < MIN_CONFIDENCE_THRESHOLD && mlConfidence < MIN_CONFIDENCE_THRESHOLD) {
        throw new PipelineError(
            'Image quality too low, please retake the photo. Both models returned low confidence.',
            Math.max(geminiConfidence, mlConfidence)
        );
    }

    // Pick the winner: higher confidence
    const useGemini = geminiConfidence >= mlConfidence;
    const winnerData = useGemini ? geminiResult : mlResult;
    const modelUsed = useGemini ? 'gemini' as const : 'custom_ml' as const;

    const winner: ScanResult = {
        merchant: useGemini
            ? (winnerData as GeminiResponse).merchant_name
            : (winnerData as MLModelResult).merchant_name,
        date: useGemini
            ? (winnerData as GeminiResponse).receipt_date
            : null,
        total: useGemini
            ? (winnerData as GeminiResponse).total_amount
            : (winnerData as MLModelResult).line_items.reduce((s, i) => s + i.total_price, 0),
        currency: useGemini
            ? (winnerData as GeminiResponse).currency
            : 'INR',
        items: useGemini
            ? (winnerData as GeminiResponse).line_items.map(mapGeminiItem)
            : (winnerData as MLModelResult).line_items,
        overall_confidence: winnerData.overall_confidence,
        model_used: modelUsed,
        raw_text: useGemini
            ? JSON.stringify((winnerData as GeminiResponse).line_items)
            : '',
    };

    const elapsed = Date.now() - startTime;
    logger.info('Pipeline', `Pipeline complete in ${elapsed}ms`, {
        model_used: modelUsed,
        confidence: winner.overall_confidence,
        items: winner.items.length,
    });

    return {
        winner,
        gemini_confidence: geminiConfidence,
        ml_confidence: mlConfidence,
        model_used: modelUsed,
    };
}

/**
 * Run Gemini Vision API.
 */
async function runGemini(
    images: { buffer: Buffer; mimeType: string }[],
    isTornReceipt: boolean
): Promise<GeminiResponse> {
    try {
        if (isTornReceipt && images.length > 1) {
            return await analyzeMultipleImages(images);
        }
        return await analyzeReceiptWithGemini(images[0].buffer, images[0].mimeType);
    } catch (error) {
        logger.error('Pipeline', 'Gemini failed, returning zero confidence', error);
        return {
            merchant_name: '',
            receipt_date: null,
            total_amount: 0,
            currency: 'INR',
            line_items: [],
            subtotal: null,
            tax: null,
            discount: null,
            overall_confidence: 0,
        };
    }
}

/**
 * Run custom ML model.
 */
async function runCustomML(imageBuffer: Buffer): Promise<MLModelResult> {
    try {
        const model = await getATLASModel();
        return await model.predict(imageBuffer);
    } catch (error) {
        logger.error('Pipeline', 'Custom ML failed, returning zero confidence', error);
        return {
            merchant_name: '',
            line_items: [],
            overall_confidence: 0,
            model_version: 'error',
        };
    }
}

/**
 * Map Gemini line item to ScanLineItem format.
 */
function mapGeminiItem(item: {
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    category: string;
    confidence: number;
}): ScanLineItem {
    return {
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        category: item.category,
        confidence: item.confidence,
    };
}

/**
 * Custom error class for pipeline failures.
 */
export class PipelineError extends Error {
    confidence: number;

    constructor(message: string, confidence: number) {
        super(message);
        this.name = 'PipelineError';
        this.confidence = confidence;
    }
}
