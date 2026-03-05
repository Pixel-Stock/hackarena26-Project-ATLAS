/**
 * ATLAS CrowdTag — Full Implementation
 * ======================================
 * Drop at: lib/ai/crowdtag.ts
 * Replace: lib/ai/crowdtag-stub.ts (delete the stub, import from here)
 *
 * This is the real Phase 2 CrowdTag engine.
 * Every function here maps to a Supabase RPC defined in crowdtag-schema.sql
 */

import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface MerchantResolution {
  found:                boolean;
  merchant_key:         string;
  is_resolved:          boolean;
  dominant_category:    string | null;
  confidence:           number;
  total_votes:          number;
  is_multi_category:    boolean;
  category_distribution: Record<string, number>;  // { "Groceries": 75.0, "Snacks": 25.0 }
  seeded:               boolean;
}

export interface VoteResult {
  merchant_key:      string;
  dominant_category: string;
  confidence:        number;
  is_resolved:       boolean;
  total_votes:       number;
}

export interface TrustScoreResult {
  updated:      boolean;
  trust_score:  number;
  tier:         "new" | "experienced" | "validated" | "expert";
  accuracy:     number;
  total_scans:  number;
}

export interface CrowdTagAdminSummary {
  total_merchants:       number;
  resolved_merchants:    number;
  seeded_merchants:      number;
  drift_merchants:       number;
  multi_category_merchants: number;
  avg_confidence:        number;
  avg_votes_per_merchant: number;
  total_votes_cast:      number;
}

export interface CategoryDistribution {
  dominant_category: string;
  merchant_count:    number;
  total_votes:       number;
  avg_confidence:    number;
  resolved_count:    number;
}

export interface TopMerchant {
  display_name:         string;
  city:                 string;
  dominant_category:    string;
  confidence_score:     number;
  total_votes:          number;
  is_resolved:          boolean;
  is_multi_category:    boolean;
  category_distribution: Record<string, number>;
  updated_at:           string;
}

// ─────────────────────────────────────────────
// CONFIDENCE TIERS
// ─────────────────────────────────────────────

export function getCrowdTagConfidenceTier(confidence: number): {
  tier:   "community_verified" | "building" | "seeded" | "unverified";
  label:  string;
  color:  string;
  icon:   string;
} {
  if (confidence >= 0.85) return { tier: "community_verified", label: "Community Verified",  color: "#10b981", icon: "shield-check" };
  if (confidence >= 0.70) return { tier: "building",           label: "Building Consensus",  color: "#f59e0b", icon: "users"        };
  if (confidence >= 0.50) return { tier: "seeded",             label: "Pre-Verified",        color: "#6b7280", icon: "database"     };
  return                          { tier: "unverified",        label: "Unverified",          color: "#ef4444", icon: "help-circle"  };
}

// ─────────────────────────────────────────────
// 1. RESOLVE MERCHANT (called BEFORE Gemini scan)
// ─────────────────────────────────────────────

/**
 * Check if merchant is already resolved by CrowdTag.
 * If resolved → skip Gemini categorization and use cached category.
 * This is the key performance optimization — resolved merchants need no AI call.
 */
export async function resolveMerchant(
  merchantName: string,
  city:         string = "",
): Promise<MerchantResolution> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("resolve_merchant_for_user", {
    p_merchant_name: merchantName,
    p_city:          city,
  });

  if (error) {
    console.error("[CrowdTag] resolveMerchant error:", error);
    return {
      found:                false,
      merchant_key:         "",
      is_resolved:          false,
      dominant_category:    null,
      confidence:           0,
      total_votes:          0,
      is_multi_category:    false,
      category_distribution: {},
      seeded:               false,
    };
  }

  return data as MerchantResolution;
}

// ─────────────────────────────────────────────
// 2. LOG MERCHANT VOTE (called AFTER every scan)
// ─────────────────────────────────────────────

/**
 * Logs a vote for a merchant category.
 * Triggers auto-resolution if thresholds are met.
 * Triggers drift detection check.
 * Updates user trust score.
 *
 * This replaces the stub's logMerchantVote function.
 * Non-blocking — called with .catch() in pipeline.ts
 */
export async function logMerchantVote(params: {
  merchantName: string;
  city?:        string;
  category:     string;
  userId:       string;
  confidence:   number;
  receiptId?:   string;
  isManual?:    boolean;
}): Promise<VoteResult | null> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("upsert_merchant_vote", {
    p_merchant_name: params.merchantName,
    p_city:          params.city ?? "",
    p_category:      params.category,
    p_user_id:       params.userId,
    p_confidence:    params.confidence,
    p_receipt_id:    params.receiptId ?? null,
    p_is_manual:     params.isManual ?? false,
  });

  if (error) {
    console.error("[CrowdTag] logMerchantVote error:", error);
    return null;
  }

  // Non-blocking: check drift in background after every 10th vote
  const result = data as VoteResult;
  if (result.total_votes % 10 === 0 && result.total_votes > 0) {
    checkMerchantDrift(result.merchant_key).catch(console.error);
  }

  // Non-blocking: update trust score
  updateUserTrustScore(params.userId).catch(console.error);

  return result;
}

// ─────────────────────────────────────────────
// 3. DRIFT DETECTION
// ─────────────────────────────────────────────

/**
 * Checks if recent votes contradict the resolved category.
 * If 20 consecutive votes disagree → re-opens voting (drift detected).
 */
export async function checkMerchantDrift(merchantKey: string): Promise<{
  drift_detected:    boolean;
  contra_votes:      number;
  dominant_category: string;
}> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("check_merchant_drift", {
    p_merchant_key: merchantKey,
  });

  if (error) {
    console.error("[CrowdTag] checkMerchantDrift error:", error);
    return { drift_detected: false, contra_votes: 0, dominant_category: "" };
  }

  return data;
}

// ─────────────────────────────────────────────
// 4. TRUST SCORE
// ─────────────────────────────────────────────

export async function updateUserTrustScore(userId: string): Promise<TrustScoreResult | null> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("update_user_trust_score", {
    p_user_id: userId,
  });

  if (error) {
    console.error("[CrowdTag] updateUserTrustScore error:", error);
    return null;
  }

  return data as TrustScoreResult;
}

export async function getUserTrustScore(userId: string): Promise<{
  trust_score:  number;
  tier:         string;
  accuracy:     number;
  total_scans:  number;
} | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("user_trust_scores")
    .select("trust_score, tier, accuracy_rate, total_scans")
    .eq("user_id", userId)
    .single();

  if (error) return null;

  return {
    trust_score:  data.trust_score,
    tier:         data.tier,
    accuracy:     data.accuracy_rate,
    total_scans:  data.total_scans,
  };
}

// ─────────────────────────────────────────────
// 5. MERCHANT SEARCH (for UI autocomplete)
// ─────────────────────────────────────────────

export async function searchMerchants(query: string, limit = 5): Promise<TopMerchant[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("merchant_fingerprints")
    .select("display_name, city, dominant_category, confidence_score, total_votes, is_resolved, is_multi_category, category_distribution, updated_at")
    .ilike("display_name", `%${query}%`)
    .order("total_votes", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as TopMerchant[];
}

// ─────────────────────────────────────────────
// 6. ADMIN ANALYTICS
// ─────────────────────────────────────────────

export async function getCrowdTagAdminSummary(): Promise<CrowdTagAdminSummary | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("crowdtag_admin_summary")
    .select("*")
    .single();

  if (error) return null;
  return data as CrowdTagAdminSummary;
}

export async function getCategoryDistribution(): Promise<CategoryDistribution[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("crowdtag_category_distribution")
    .select("*");

  if (error) return [];
  return (data ?? []) as CategoryDistribution[];
}

export async function getTopMerchants(limit = 20): Promise<TopMerchant[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("crowdtag_top_merchants")
    .select("*")
    .limit(limit);

  if (error) return [];
  return (data ?? []) as TopMerchant[];
}

export async function getRecentEvents(limit = 50): Promise<{
  event_type:   string;
  merchant_key: string;
  payload:      Record<string, unknown>;
  created_at:   string;
}[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("crowdtag_events")
    .select("event_type, merchant_key, payload, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}

export async function getDriftedMerchants(): Promise<{
  merchant_key:       string;
  display_name:       string;
  dominant_category:  string;
  confidence_score:   number;
  drift_detected_at:  string;
  total_votes:        number;
}[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("merchant_fingerprints")
    .select("merchant_key, display_name, dominant_category, confidence_score, drift_detected_at, total_votes")
    .eq("drift_detected", true)
    .order("drift_detected_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}
