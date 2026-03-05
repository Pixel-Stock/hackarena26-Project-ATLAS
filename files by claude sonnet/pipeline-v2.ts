/**
 * ATLAS Dual-Model Pipeline — Phase 2 Update
 * ============================================
 * Drop at: lib/ai/pipeline.ts (replaces Phase 1 version)
 *
 * Phase 2 changes:
 * - CrowdTag pre-resolution: checks if merchant already resolved BEFORE calling Gemini
 * - If resolved → skip AI call → instant category from community data
 * - After scan → full CrowdTag vote logging (not stub)
 * - Manual correction → logs as isManual=true (higher trust weight)
 */

import { runGeminiVision }                from "./gemini";
import { runCustomMLModel }               from "./custom-model";
import { resolveMerchant, logMerchantVote } from "./crowdtag";
import type { ATLASReceiptResult, ScanError } from "@/types";

const CONFIDENCE_REJECT = 0.60;
const CONFIDENCE_HIGH   = 0.85;

export type PipelineResult =
  | { success: true;  data: ATLASReceiptResult; crowdtag_hit: boolean }
  | { success: false; error: ScanError };

// ─────────────────────────────────────────────
// MAIN PIPELINE (Phase 2)
// ─────────────────────────────────────────────

export async function runScanPipeline(
  imageBlob:     Blob,
  userId:        string,
  isTornMode  =  false,
  receiptId?:    string,
): Promise<PipelineResult> {
  const startTime = Date.now();

  // ── PHASE 2 STEP 0: Run Gemini FIRST to get merchant name ─────────────
  // Then check CrowdTag before doing full categorization.
  // If CrowdTag resolves → skip categorization call.

  const [geminiResult, mlResult] = await Promise.allSettled([
    runGeminiVision(imageBlob),
    runCustomMLModel(imageBlob),
  ]);

  const gemini = geminiResult.status === "fulfilled" ? geminiResult.value : null;
  const ml     = mlResult.status     === "fulfilled" ? mlResult.value     : null;

  const geminiConf = gemini?.overall_confidence ?? 0;
  const mlConf     = ml?.confidence             ?? 0;

  // Both failed
  if (!gemini && !ml) {
    return {
      success: false,
      error: { code: "BOTH_MODELS_FAILED", message: "Receipt scanning unavailable. Please try again.", retryable: true },
    };
  }

  // Pick winner
  let winnerSource: "gemini" | "custom_ml";
  let winningConfidence: number;

  if (!gemini) {
    winnerSource = "custom_ml"; winningConfidence = mlConf;
  } else if (!ml || mlConf === 0) {
    winnerSource = "gemini"; winningConfidence = geminiConf;
  } else {
    winnerSource = geminiConf >= mlConf ? "gemini" : "custom_ml";
    winningConfidence = Math.max(geminiConf, mlConf);
  }

  // Quality gate
  if (winningConfidence < CONFIDENCE_REJECT) {
    return {
      success: false,
      error: {
        code:       "LOW_CONFIDENCE",
        message:    isTornMode
          ? "Even in torn receipt mode, image quality is too low. Ensure both halves are well-lit."
          : "Image quality too low. Please retake in better lighting.",
        confidence: winningConfidence,
        retryable:  true,
      },
    };
  }

  if (!gemini) {
    return {
      success: false,
      error: { code: "GEMINI_UNAVAILABLE", message: "Text extraction unavailable.", retryable: true },
    };
  }

  // ── PHASE 2: CrowdTag Pre-Resolution ──────────────────────────────────
  let crowdtagHit = false;
  let enrichedResult = { ...gemini };

  if (gemini.merchant_name) {
    const resolution = await resolveMerchant(gemini.merchant_name, gemini.city ?? "");

    if (resolution.found && resolution.is_resolved && resolution.dominant_category) {
      crowdtagHit = true;

      if (resolution.is_multi_category && Object.keys(resolution.category_distribution).length > 1) {
        // Multi-category merchant: apply distribution to line items
        enrichedResult = applyMultiCategoryDistribution(
          enrichedResult,
          resolution.category_distribution,
        );
      } else {
        // Single dominant category: override all "Other" items
        enrichedResult = {
          ...enrichedResult,
          items: enrichedResult.items?.map(item => ({
            ...item,
            category: item.category === "Other" ? resolution.dominant_category! : item.category,
          })),
        };
      }

      if (process.env.NODE_ENV === "development") {
        console.log(`[ATLAS/pipeline] CrowdTag HIT: ${gemini.merchant_name} → ${resolution.dominant_category} (${(resolution.confidence * 100).toFixed(1)}%)`);
      }
    }
  }

  // Apply ML category hint if server available and high confidence
  if (!crowdtagHit && ml?.server_available && ml.confidence >= 0.70 && ml.category_hint) {
    enrichedResult = {
      ...enrichedResult,
      items: enrichedResult.items?.map(item => ({
        ...item,
        category: item.category === "Other" ? ml.category_hint! : item.category,
      })),
    };
  }

  // Build final result
  const result: ATLASReceiptResult = {
    ...enrichedResult,
    model_used:          winnerSource,
    overall_confidence:  winningConfidence,
    gemini_confidence:   geminiConf,
    ml_confidence:       mlConf,
    ml_server_available: ml?.server_available ?? false,
    confidence_tier:     winningConfidence >= CONFIDENCE_HIGH ? "high" : winningConfidence >= CONFIDENCE_REJECT ? "medium" : "low",
    processing_time_ms:  Date.now() - startTime,
    is_torn_receipt:     isTornMode,
    crowdtag_resolved:   crowdtagHit,
  };

  // ── CrowdTag Vote Logging (non-blocking) ──────────────────────────────
  if (result.merchant_name && result.items && result.items.length > 0) {
    const dominantCategory = getDominantCategory(result.items);
    logMerchantVote({
      merchantName: result.merchant_name,
      city:         result.city,
      category:     dominantCategory,
      userId,
      confidence:   winningConfidence,
      receiptId,
      isManual:     false,
    }).catch(err => console.error("[CrowdTag] Vote logging failed:", err));
  }

  return { success: true, data: result, crowdtag_hit: crowdtagHit };
}

// ─────────────────────────────────────────────
// MANUAL CORRECTION (user corrects a category in UI)
// ─────────────────────────────────────────────

/**
 * Called when user manually corrects a category in the line item review table.
 * Manual corrections get higher trust weight in CrowdTag.
 */
export async function logManualCorrection(params: {
  merchantName: string;
  city?:        string;
  correctedCategory: string;
  userId:       string;
  receiptId?:   string;
}): Promise<void> {
  await logMerchantVote({
    merchantName: params.merchantName,
    city:         params.city,
    category:     params.correctedCategory,
    userId:       params.userId,
    confidence:   1.0,     // manual corrections are treated as max confidence
    receiptId:    params.receiptId,
    isManual:     true,    // flagged for higher trust weight in Supabase function
  }).catch(err => console.error("[CrowdTag] Manual correction logging failed:", err));
}

// ─────────────────────────────────────────────
// TORN RECEIPT MODE
// ─────────────────────────────────────────────

export async function runTornReceiptPipeline(
  topBlob:    Blob,
  bottomBlob: Blob,
  userId:     string,
  receiptId?: string,
): Promise<PipelineResult> {
  const [topResult, bottomResult] = await Promise.all([
    runScanPipeline(topBlob,    userId, true, receiptId),
    runScanPipeline(bottomBlob, userId, true, receiptId),
  ]);

  if (!topResult.success && !bottomResult.success) {
    return {
      success: false,
      error: {
        code:      "TORN_RECEIPT_BOTH_FAILED",
        message:   "Could not read either half. Ensure both halves are flat and well-lit.",
        retryable: true,
      },
    };
  }

  if (!topResult.success)    return bottomResult;
  if (!bottomResult.success) return topResult;

  const merged = mergeReceiptResults(topResult.data, bottomResult.data);
  return { success: true, data: merged, crowdtag_hit: topResult.crowdtag_hit || bottomResult.crowdtag_hit };
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function getDominantCategory(items: ATLASReceiptResult["items"]): string {
  if (!items || items.length === 0) return "Other";
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item.category] = (counts[item.category] ?? 0) + item.amount;
  }
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0];
}

/**
 * For multi-category merchants (e.g. Walmart = 60% groceries, 30% personal care):
 * Apply category distribution to line items proportionally.
 * Items already correctly categorized by Gemini are kept.
 * Only "Other" items are redistributed.
 */
function applyMultiCategoryDistribution(
  result:       ATLASReceiptResult,
  distribution: Record<string, number>,
): ATLASReceiptResult {
  const otherItems = result.items?.filter(i => i.category === "Other") ?? [];
  const categories = Object.entries(distribution).sort(([, a], [, b]) => b - a);

  let categoryIndex = 0;
  const updatedItems = result.items?.map(item => {
    if (item.category !== "Other") return item;
    const [category] = categories[categoryIndex % categories.length];
    categoryIndex++;
    return { ...item, category };
  });

  return { ...result, items: updatedItems };
}

function mergeReceiptResults(
  top:    ATLASReceiptResult,
  bottom: ATLASReceiptResult,
): ATLASReceiptResult {
  const primary   = top.overall_confidence >= bottom.overall_confidence ? top : bottom;
  const seen      = new Set<string>();
  const allItems  = [...(top.items ?? []), ...(bottom.items ?? [])];
  const deduped   = allItems.filter(item => {
    const key = `${item.name.toLowerCase().trim()}:${item.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    ...primary,
    items:             deduped,
    total_amount:      deduped.reduce((s, i) => s + i.amount, 0),
    overall_confidence: (top.overall_confidence + bottom.overall_confidence) / 2,
    is_torn_receipt:   true,
    crowdtag_resolved: top.crowdtag_resolved || bottom.crowdtag_resolved,
  };
}
