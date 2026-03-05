# ATLAS Phase 2 — CrowdTag Mesh Intelligence + ML Fine-Tuning
> Complete implementation guide. Read every section before running anything.

---

## Table of Contents

1. [What Phase 2 Adds](#what-phase-2-adds)
2. [File Reference](#file-reference)
3. [Prerequisites](#prerequisites)
4. [Step 1 — Supabase Schema](#step-1--supabase-schema)
5. [Step 2 — Drop TypeScript Files](#step-2--drop-typescript-files)
6. [Step 3 — Google Places API Key](#step-3--google-places-api-key)
7. [Step 4 — Seed Merchants](#step-4--seed-merchants)
8. [Step 5 — ML Fine-Tuning](#step-5--ml-fine-tuning)
9. [Step 6 — Update Inference Server](#step-6--update-inference-server)
10. [Step 7 — Deploy to Production](#step-7--deploy-to-production)
11. [How CrowdTag Works](#how-crowdtag-works)
12. [Database Schema Reference](#database-schema-reference)
13. [Supabase Functions Reference](#supabase-functions-reference)
14. [TypeScript API Reference](#typescript-api-reference)
15. [Trust Score System](#trust-score-system)
16. [Confidence Scoring](#confidence-scoring)
17. [Drift Detection](#drift-detection)
18. [Admin Panel Integration](#admin-panel-integration)
19. [Environment Variables](#environment-variables)
20. [Full File Structure](#full-file-structure)
21. [Testing](#testing)
22. [Monitoring & Observability](#monitoring--observability)
23. [Troubleshooting](#troubleshooting)
24. [Phase 1 → Phase 2 Migration Checklist](#phase-1--phase-2-migration-checklist)
25. [What Phase 3 Looks Like](#what-phase-3-looks-like)

---

## What Phase 2 Adds

Phase 1 shipped a working receipt scanner powered entirely by Gemini Vision + a custom ML model.
Phase 2 makes the entire system smarter with every single scan.

| Feature | Phase 1 | Phase 2 |
|---------|---------|---------|
| Receipt OCR | ✅ Gemini Vision | ✅ Gemini Vision |
| ML Model | ✅ Classification only | ✅ Fine-tuned, higher accuracy |
| Merchant categorization | ✅ AI on every scan | ✅ AI + CrowdTag pre-resolution |
| Merchant memory | ❌ No | ✅ Persistent, self-improving |
| Google Places seed data | ❌ No | ✅ Day-one global coverage |
| Collective intelligence | ❌ Stub only | ✅ Full vote system |
| Trust-weighted voting | ❌ No | ✅ 4-tier system |
| Drift detection | ❌ No | ✅ Self-correcting |
| Admin CrowdTag analytics | ❌ No | ✅ Full dashboard views |
| Manual correction feedback | ❌ No | ✅ Logged as high-weight vote |

**The key Phase 2 unlock:** Once a merchant gets 30+ votes at 75%+ confidence, every future scan at that merchant resolves instantly — zero AI call, zero latency, zero API cost. The more users, the smarter and cheaper the system gets.

---

## File Reference

| File | Purpose | Where it goes |
|------|---------|---------------|
| `crowdtag-schema.sql` | Complete Supabase schema: 4 tables, 6 functions, triggers, 4 views, all RLS policies | Supabase SQL Editor |
| `crowdtag.ts` | Full TypeScript CrowdTag engine — all functions the app calls | `lib/ai/crowdtag.ts` |
| `pipeline-v2.ts` | Updated dual-model pipeline with CrowdTag pre-resolution | `lib/ai/pipeline.ts` (replaces Phase 1) |
| `seed-places.ts` | Google Places API seeder — pre-populates merchant database | `scripts/seed-places.ts` |
| `fine_tune.py` | Phase 2 ML fine-tuning — unfreezes MobileNetV2, label smoothing, stronger augmentation | Project root alongside `train.py` |

---

## Prerequisites

Before starting Phase 2, confirm ALL of the following:

- [ ] Phase 1 is fully deployed and working (receipts scan successfully end-to-end)
- [ ] `train.py` has completed Phase 1 training → `models/best_model_phase1.h5` exists
- [ ] Supabase project is live with Phase 1 tables (`profiles`, `receipts`, `line_items`, `categories`)
- [ ] Phase 1 RLS policies are active on all tables
- [ ] `lib/ai/crowdtag-stub.ts` exists (the Phase 1 stub we are replacing)
- [ ] Node.js ≥ 18, Python ≥ 3.10, `tsx` installed globally (`npm i -g tsx`)
- [ ] Google Cloud account with Ultimate pack (Places API available)

---

## Step 1 — Supabase Schema

### Run the SQL

1. Open your Supabase project dashboard
2. Go to **SQL Editor** → **New Query**
3. Paste the entire contents of `crowdtag-schema.sql`
4. Click **Run** (Ctrl+Enter)

The script is fully idempotent — safe to re-run multiple times. Uses `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, and `ON CONFLICT DO NOTHING` throughout.

### Verify it worked

Run these in SQL Editor to confirm everything was created:

```sql
-- Should return 4 rows
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('merchant_fingerprints', 'crowdtag_votes', 'user_trust_scores', 'crowdtag_events');

-- Should return 4 rows
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('crowdtag_admin_summary', 'crowdtag_category_distribution', 'crowdtag_top_merchants', 'crowdtag_trust_leaderboard');

-- Should return 6 rows
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'normalize_merchant_key', 'upsert_merchant_vote', 'check_merchant_drift',
  'resolve_merchant_for_user', 'update_user_trust_score', 'seed_merchant_from_places'
);
```

All three queries must return the expected counts. If any are missing, re-run the SQL and check for error output.

### What the schema creates

**Tables:**
- `merchant_fingerprints` — one row per merchant. Stores all vote data, confidence score, resolved status, drift state, category distribution
- `crowdtag_votes` — one row per vote. Individual vote log with `weighted_vote` as a generated column (`confidence × trust_weight`)
- `user_trust_scores` — one row per user. Trust tier, accuracy rate, total scan count
- `crowdtag_events` — append-only event log. Captures `merchant_resolved`, `drift_detected`, `merchant_seeded`, `vote_logged`

**Postgres Functions (RPCs called from TypeScript):**
- `normalize_merchant_key(name, city)` — deterministic key generator, immutable
- `upsert_merchant_vote(...)` — main workhorse, called after every scan
- `check_merchant_drift(key)` — drift detection, called every 10th vote
- `resolve_merchant_for_user(name, city)` — lookup before scan, returns cached category if resolved
- `update_user_trust_score(user_id)` — recalculates tier and weight
- `seed_merchant_from_places(...)` — called only by the seeder script

**Views (for admin panel — query directly from Supabase client):**
- `crowdtag_admin_summary` — aggregate stats across all merchants
- `crowdtag_category_distribution` — merchant + vote count grouped by category
- `crowdtag_top_merchants` — top 100 merchants by total votes
- `crowdtag_trust_leaderboard` — top 50 users by trust score

---

## Step 2 — Drop TypeScript Files

```bash
# From the atlas_phase2/ directory:

# Replace Phase 1 pipeline with Phase 2
cp pipeline-v2.ts   ../atlas/lib/ai/pipeline.ts

# Add CrowdTag engine
cp crowdtag.ts      ../atlas/lib/ai/crowdtag.ts

# Add seeder script
mkdir -p ../atlas/scripts
cp seed-places.ts   ../atlas/scripts/seed-places.ts

# DELETE the Phase 1 stub — fully replaced by crowdtag.ts
rm ../atlas/lib/ai/crowdtag-stub.ts
```

### Verify no stale imports remain

```bash
# Run from your atlas/ root — should return 0 results
grep -r "crowdtag-stub" src/ lib/ app/ --include="*.ts" --include="*.tsx"
```

### What changed in pipeline.ts (Phase 1 → Phase 2)

The only behavioral addition is **Step 0** — a CrowdTag lookup that runs after Gemini extracts the merchant name:

```typescript
// PHASE 2 ONLY — resolve merchant BEFORE running AI categorization
const resolution = await resolveMerchant(gemini.merchant_name, gemini.city);
if (resolution.is_resolved) {
  // Community has already decided this merchant's category
  // Skip Gemini categorization → use cached community category instantly
  crowdtagHit = true;
}
```

Everything else (dual-model, confidence scoring, torn receipt mode, quality gate, error handling) is identical to Phase 1. It's a drop-in replacement with one additive feature.

---

## Step 3 — Google Places API Key

### Enable the API

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select your project (the one with your Ultimate pack)
3. Go to **APIs & Services** → **Library**
4. Search **"Places API (New)"** — specifically the *New* version, not legacy
5. Click **Enable**

### Create a restricted API key

1. Go to **APIs & Services** → **Credentials**
2. **Create Credentials** → **API Key**
3. Click **Edit Key** on the new key
4. **API restrictions** → **Restrict key** → select **Places API (New)**
5. **Application restrictions** → **IP addresses** → add your server's IP (leave open for local dev)
6. **Save**

### Add to environment

```env
# .env.local
GOOGLE_PLACES_API_KEY=AIzaSy...your_key_here
```

### Test it works

```bash
curl "https://maps.googleapis.com/maps/api/geocode/json?address=Pune,IN&key=YOUR_KEY"
# Should return: "status": "OK" with lat/lng coordinates for Pune
```

---

## Step 4 — Seed Merchants

Pre-populates `merchant_fingerprints` with real merchant data. Run this **once before launch**. Seeded merchants start at 0.70 confidence with 5 virtual votes — enough to appear in CrowdTag lookups but low enough that any real user votes override them.

### Install seeder dependencies

```bash
cd atlas/
npm install @supabase/supabase-js
npm install -D tsx typescript
```

### Test run — single city first

```bash
GOOGLE_PLACES_API_KEY=your_key \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
npx tsx scripts/seed-places.ts --cities "Pune" --limit 50
```

Expected output:
```
═══════════════════════════════════════════
  ATLAS CrowdTag — Google Places Seeder
  Cities  : Pune
  Country : IN
  Limit   : 50 per city
═══════════════════════════════════════════

🏙️  Seeding: Pune, IN
   📍 "supermarket" → 20 results
   📍 "grocery store" → 18 results
   📍 "pharmacy" → 20 results
   📍 "restaurant" → 20 results
   📍 "cafe" → 15 results
   ...

═══════════════════════════════════════════
  SEEDING COMPLETE
  Fetched  : 412
  Seeded   : 187 (new merchants)
  Skipped  : 0   (already existed)
  Errors   : 0

  By Category:
    Food & Dining             68
    Groceries                 41
    Health & Medicine         29
    Takeout & Delivery        22
    Personal Care             14
    Transport                  8
    Other                      5
═══════════════════════════════════════════
```

### Production run — all major Indian cities

```bash
GOOGLE_PLACES_API_KEY=your_key \
SUPABASE_URL=your_url \
SUPABASE_SERVICE_ROLE_KEY=your_service_key \
npx tsx scripts/seed-places.ts \
  --cities "Mumbai,Delhi,Bangalore,Pune,Chennai,Hyderabad,Kolkata,Ahmedabad,Jaipur,Surat" \
  --country IN \
  --limit 150
```

Seeds ~1,500 merchants across 10 cities. Takes 20–30 minutes due to Google's rate limits (2s delay between paginated requests is mandatory).

### Important notes

- **Idempotent:** Re-running never overwrites real user votes. Uses `ON CONFLICT (merchant_key) DO NOTHING`
- **Service role key required:** Bypasses RLS to write directly. Never use service role key client-side
- **Free tier safe:** Google Places API (New) gives 5,000 free requests/month. 10 cities × 14 queries = ~140 requests — well within limits
- **Re-seed anytime:** New city or new merchants? Run seeder again. Existing records are never touched

---

## Step 5 — ML Fine-Tuning

Run after Phase 1 training is complete. `models/best_model_phase1.h5` must exist.

### Key differences from Phase 1 training

| Setting | Phase 1 `train.py` | Phase 2 `fine_tune.py` |
|---------|-------------------|----------------------|
| MobileNetV2 layers | All frozen | Unfrozen from layer 100+ |
| Learning rate | `1e-4` | `1e-5` (10x lower) |
| BatchNorm layers | N/A | Always stays frozen |
| Batch size | 32 | 16 (more VRAM per unfrozen layer) |
| Augmentation | Standard | Stronger (rotation ±25°, brightness 0.4–1.6) |
| Label smoothing | None | 0.1 (better confidence calibration) |
| Gradient clipping | None | `clipnorm=1.0` for stability |

**Critical: Why BatchNorm must stay frozen** — BatchNorm layers accumulate running statistics during training. Unfreezing them during fine-tuning corrupts these statistics instantly and causes catastrophic accuracy drops. The script handles this automatically, but never modify this behavior.

**Critical: Why LR must be 10x lower** — MobileNetV2 weights encode ImageNet training. A high LR overwrites them (catastrophic forgetting). Fine-tuning at `1e-5` nudges them gently toward receipt-specific features instead.

### Standard run

```bash
python fine_tune.py \
  --base_model    ./models/best_model_phase1.h5 \
  --dataset       ./dataset \
  --output        ./models \
  --unfreeze_from 100 \
  --epochs        15 \
  --lr            0.00001 \
  --batch         16
```

### Low VRAM run (8GB GPU or less)

```bash
python fine_tune.py \
  --base_model    ./models/best_model_phase1.h5 \
  --dataset       ./dataset \
  --output        ./models \
  --unfreeze_from 120 \
  --epochs        10 \
  --lr            0.000005 \
  --batch         8
```

### CPU-only run (slow but works, ~2–3 hours)

```bash
python fine_tune.py \
  --base_model    ./models/best_model_phase1.h5 \
  --dataset       ./dataset \
  --output        ./models \
  --unfreeze_from 130 \
  --epochs        8 \
  --lr            0.000005 \
  --batch         8
```

### Fine-tune outputs

```
models/
  best_model_finetuned.h5                   ← Best checkpoint during training
  atlas_receipt_model_finetuned.h5          ← Final Keras model
  atlas_receipt_savedmodel_finetuned/       ← SavedModel (needed for ONNX/TFLite conversion)
  tfjs_finetuned/
    model.json                              ← TF.js browser model
    group1-shard*.bin
  atlas_receipt_model_finetuned.tflite      ← Mobile (React Native)
  atlas_receipt_model_finetuned.onnx        ← Server inference (primary)
  training_log_finetune.csv                ← Per-epoch loss + accuracy
  model_metadata.json                       ← Updated with fine-tune stats
```

### Expected performance gains

| Metric | Phase 1 Target | Phase 2 Target |
|--------|---------------|----------------|
| Test accuracy | > 92% | > 95% |
| AUC-ROC | > 0.96 | > 0.98 |
| High confidence % | > 75% | > 85% |
| Inference time (ONNX CPU) | < 200ms | < 200ms (unchanged) |

If fine-tuned accuracy is **lower** than Phase 1 — your LR is too high. Re-run with `--lr 0.000001`.

---

## Step 6 — Update Inference Server

Swap the ONNX model to the fine-tuned version:

```bash
# Stop current server (Ctrl+C)

# Start with fine-tuned model
MODEL_PATH=./models/atlas_receipt_model_finetuned.onnx \
METADATA_PATH=./models/model_metadata.json \
CLASS_LABELS_PATH=./models/class_labels.json \
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4

# Verify
curl http://localhost:8001/health
# → { "status": "ok", "model_loaded": true, "model_version": "1.0.0" }
```

### Update TF.js browser model

```bash
cp -r models/tfjs_finetuned/* ../atlas/public/models/atlas-receipt-v1/
```

---

## Step 7 — Deploy to Production

### Inference server on Railway

Create a `Dockerfile` at your project root:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .
COPY models/atlas_receipt_model_finetuned.onnx  ./models/
COPY models/model_metadata.json                 ./models/
COPY models/class_labels.json                   ./models/

EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "4"]
```

Then in Railway dashboard:
1. New project → connect GitHub repo
2. Set env vars: `MODEL_PATH`, `METADATA_PATH`, `CLASS_LABELS_PATH`, `LOG_LEVEL=INFO`
3. Deploy — Railway auto-detects the Dockerfile
4. Copy the Railway public URL

### Update Next.js on Vercel

Add to Vercel environment variables:
```
SUPABASE_SERVICE_ROLE_KEY      → Production + Preview
GOOGLE_PLACES_API_KEY          → Production + Preview
ATLAS_ML_SERVER_URL            → Production (Railway URL)
```

Push the updated `lib/ai/pipeline.ts` and `lib/ai/crowdtag.ts` to GitHub. Vercel redeploys automatically.

---

## How CrowdTag Works

### Full annotated flow

```
User scans receipt image
         │
         ▼
   [pipeline-v2.ts]
         │
         ├── Gemini Vision + Custom ML run in parallel (Promise.allSettled)
         │
         ▼
   Gemini extracts: merchant_name, city, line_items, totals
         │
         ▼
   resolveMerchant("Dominos Pizza", "Pune")
         │
         └── Supabase RPC: resolve_merchant_for_user()
                   └── normalize_merchant_key() → "dominos_pizza_pune"
                             │
                    IS RESOLVED? (is_resolved=TRUE AND confidence ≥ 0.75)
                             │
                    YES ─────┤
                    (30+ community votes)
                             │
                             ▼
                    Use community category instantly
                    crowdtag_hit = true
                    Skip AI categorization → "Takeout & Delivery" ✅
                    Zero latency. Zero API cost.
                             │
                    NO ──────┤
                    (new merchant, insufficient votes)
                             │
                             ▼
                    Run Gemini line-item categorization
                    Apply ML category hint for "Other" items

                             │
         ┌───────────────────┘
         │
         ▼
   Result returned to user
         │
         ▼ (non-blocking — never delays the user response)
   logMerchantVote({
     merchantName: "Dominos Pizza",
     city:         "Pune",
     category:     "Takeout & Delivery",
     userId:       "user-uuid",
     confidence:   0.91,
     receiptId:    "receipt-uuid"
   })
         │
         ▼
   Supabase RPC: upsert_merchant_vote()
         │
         ├── Get user trust_weight (0.5 → 2.5 based on tier)
         ├── Log vote to crowdtag_votes
         ├── Update category_votes JSONB: { "Takeout & Delivery": 127.4 }
         ├── weighted_vote = confidence × trust_weight
         ├── Recalculate confidence_score = dominant_weight / total_weight
         ├── If total_votes ≥ 30 AND confidence ≥ 0.75 → auto-resolve
         │       Set is_resolved = TRUE
         │       Log 'merchant_resolved' event
         │
         ├── Every 10th vote → check_merchant_drift()
         │       Last 20 votes contradict dominant?
         │       YES → is_resolved = FALSE, confidence × 0.5, log 'drift_detected'
         │
         └── update_user_trust_score()
                   Recalculate tier + weight for this user
```

### Multi-category merchants

Some merchants sell across multiple categories (e.g. a medical store sells medicine AND personal care). CrowdTag handles this natively:

- `is_multi_category = TRUE` when any secondary category has ≥15% of weighted votes
- `category_distribution` stores the percentage breakdown: `{ "Health & Medicine": 65.0, "Personal Care": 35.0 }`
- `pipeline-v2.ts` distributes "Other" line items proportionally across those categories

Example — DMart bill with 80 items:
- 52 items → Gemini correctly categorizes as Groceries / Home / Food
- 28 items → categorized as "Other" by Gemini
- CrowdTag resolves DMart as multi-category: 60% Groceries / 25% Home / 15% Personal Care
- Pipeline distributes the 28 "Other" items across those 3 categories proportionally

---

## Database Schema Reference

### merchant_fingerprints

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `merchant_key` | TEXT UNIQUE | Normalized key: `lowercase_name_city` |
| `display_name` | TEXT | Original name for UI display |
| `city` | TEXT | City where merchant operates |
| `country` | TEXT | ISO country code (default: `IN`) |
| `category_votes` | JSONB | Weighted vote totals per category: `{"Groceries": 45.2}` |
| `dominant_category` | TEXT | Category with highest weighted votes |
| `confidence_score` | DECIMAL(5,4) | `dominant_weight / total_weight` (0.0–1.0) |
| `total_votes` | INTEGER | Raw count of individual votes |
| `is_resolved` | BOOLEAN | TRUE when ≥30 votes AND confidence ≥0.75 |
| `resolved_at` | TIMESTAMPTZ | When auto-resolution first triggered |
| `recent_votes` | JSONB | Last 50 votes as array (used for drift detection) |
| `drift_detected` | BOOLEAN | TRUE if community drift was found |
| `drift_detected_at` | TIMESTAMPTZ | When drift was last detected |
| `last_drift_check` | TIMESTAMPTZ | When drift was last checked |
| `seeded_from_places_api` | BOOLEAN | TRUE for seeder-created records |
| `places_api_types` | TEXT[] | Raw Google Places type array |
| `places_place_id` | TEXT | Google Places unique ID |
| `category_distribution` | JSONB | Percentage breakdown: `{"Groceries": 75.0, "Personal Care": 25.0}` |
| `is_multi_category` | BOOLEAN | TRUE when any secondary category ≥15% of votes |
| `created_at` | TIMESTAMPTZ | Row creation timestamp |
| `updated_at` | TIMESTAMPTZ | Auto-updated by trigger on every write |

### crowdtag_votes

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `merchant_key` | TEXT | FK → merchant_fingerprints |
| `user_id` | UUID | FK → profiles |
| `category` | TEXT | The category this vote is for |
| `confidence` | DECIMAL(5,4) | Model confidence at time of scan (0.0–1.0) |
| `trust_weight` | DECIMAL(4,3) | User's trust score at time of vote |
| `weighted_vote` | DECIMAL(6,4) | Generated: `confidence × trust_weight` |
| `is_manual` | BOOLEAN | TRUE if user manually corrected the category |
| `receipt_id` | UUID | FK → receipts (nullable, prevents double-voting) |
| `created_at` | TIMESTAMPTZ | Vote timestamp |

### user_trust_scores

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID | PK + FK → profiles |
| `trust_score` | DECIMAL(4,3) | Current vote weight multiplier (0.5–2.5) |
| `total_scans` | INTEGER | Lifetime total scans |
| `correct_votes` | INTEGER | Votes that matched eventual resolved category |
| `incorrect_votes` | INTEGER | Votes that contradicted resolved category |
| `accuracy_rate` | DECIMAL(5,4) | `correct_votes / total_scans` |
| `tier` | TEXT | `new` / `experienced` / `validated` / `expert` |
| `last_updated` | TIMESTAMPTZ | Last recalculation timestamp |

### crowdtag_events

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `event_type` | TEXT | `merchant_resolved` / `drift_detected` / `merchant_seeded` / `vote_logged` |
| `merchant_key` | TEXT | Which merchant this event is about |
| `payload` | JSONB | Event-specific data (category, confidence, vote count, etc.) |
| `created_at` | TIMESTAMPTZ | Event timestamp |

---

## Supabase Functions Reference

### `normalize_merchant_key(name, city)`
Deterministic, immutable. Produces collision-resistant merchant keys.
```sql
SELECT normalize_merchant_key('Domino''s Pizza!!', 'Pune');  -- → "dominos_pizza_pune"
SELECT normalize_merchant_key('McDonald''s',        'Mumbai'); -- → "mcdonalds_mumbai"
SELECT normalize_merchant_key('Reliance Fresh',     'Delhi');  -- → "reliance_fresh_delhi"
```

### `upsert_merchant_vote(p_merchant_name, p_city, p_category, p_user_id, p_confidence, p_receipt_id, p_is_manual)`
Main vote function. Called after every successful scan via `logMerchantVote()` in `crowdtag.ts`.
Returns:
```json
{
  "merchant_key":      "dominos_pizza_pune",
  "dominant_category": "Takeout & Delivery",
  "confidence":        0.8923,
  "is_resolved":       true,
  "total_votes":       31
}
```

### `resolve_merchant_for_user(p_merchant_name, p_city)`
Lookup function called before Gemini categorization in `pipeline-v2.ts`.
Returns:
```json
{
  "found":                 true,
  "merchant_key":          "dominos_pizza_pune",
  "is_resolved":           true,
  "dominant_category":     "Takeout & Delivery",
  "confidence":            0.8923,
  "total_votes":           31,
  "is_multi_category":     false,
  "category_distribution": { "Takeout & Delivery": 100 },
  "seeded":                false
}
```

### `check_merchant_drift(p_merchant_key)`
Called every 10th vote on resolved merchants. Returns:
```json
{
  "drift_detected":    true,
  "contra_votes":      20,
  "dominant_category": "Takeout & Delivery",
  "merchant_key":      "dominos_pizza_pune"
}
```

### `update_user_trust_score(p_user_id)`
Recalculates and persists trust tier + score. Returns:
```json
{
  "updated":      true,
  "trust_score":  1.35,
  "tier":         "experienced",
  "accuracy":     0.87,
  "total_scans":  47
}
```

### `seed_merchant_from_places(p_name, p_city, p_country, p_category, p_place_id, p_types)`
Called only by `seed-places.ts`. Creates merchant with 5 virtual votes at 0.70 confidence. Skips silently if `merchant_key` already exists.

---

## TypeScript API Reference

### `resolveMerchant(merchantName, city?)`
```typescript
import { resolveMerchant } from "@/lib/ai/crowdtag";

const resolution = await resolveMerchant("Dominos Pizza", "Pune");
if (resolution.found && resolution.is_resolved) {
  console.log(resolution.dominant_category); // "Takeout & Delivery"
  console.log(resolution.confidence);        // 0.8923
  console.log(resolution.is_multi_category); // false
}
```

### `logMerchantVote(params)` — non-blocking
```typescript
import { logMerchantVote } from "@/lib/ai/crowdtag";

logMerchantVote({
  merchantName: "Dominos Pizza",
  city:         "Pune",
  category:     "Takeout & Delivery",
  userId:       "user-uuid",
  confidence:   0.91,
  receiptId:    "receipt-uuid",  // prevents double-voting on same receipt
  isManual:     false,
}).catch(console.error);  // always .catch() — must never block main response
```

### `logManualCorrection(params)` — from pipeline-v2.ts
```typescript
import { logManualCorrection } from "@/lib/ai/pipeline";

// Call this when user corrects a category in the line item review table in the UI
await logManualCorrection({
  merchantName:      "Sharma Medical Store",
  city:              "Pune",
  correctedCategory: "Health & Medicine",
  userId:            "user-uuid",
  receiptId:         "receipt-uuid",
});
// Manual corrections get confidence=1.0 × trust_weight — highest possible vote signal
```

### `checkMerchantDrift(merchantKey)`
```typescript
import { checkMerchantDrift } from "@/lib/ai/crowdtag";

const drift = await checkMerchantDrift("dominos_pizza_pune");
if (drift.drift_detected) {
  console.log(`Drift on ${drift.merchant_key}: ${drift.contra_votes} contradicting votes`);
}
```

### `getUserTrustScore(userId)`
```typescript
import { getUserTrustScore } from "@/lib/ai/crowdtag";

const score = await getUserTrustScore("user-uuid");
// { trust_score: 1.5, tier: "experienced", accuracy: 0.89, total_scans: 67 }
```

### `getCrowdTagConfidenceTier(confidence)`
```typescript
import { getCrowdTagConfidenceTier } from "@/lib/ai/crowdtag";

const tier = getCrowdTagConfidenceTier(0.91);
// {
//   tier:  "community_verified",
//   label: "Community Verified",
//   color: "#10b981",
//   icon:  "shield-check"
// }
// Use these values directly to render confidence badges in the UI
```

### `searchMerchants(query, limit?)`
```typescript
import { searchMerchants } from "@/lib/ai/crowdtag";

const results = await searchMerchants("dominos", 5);
// Array of TopMerchant objects — use for autocomplete in search UI
```

---

## Trust Score System

Every user has a trust score that determines how much their votes count. New accounts cannot spam the system into wrong answers.

### Tier thresholds

| Tier | Conditions | Vote Weight | Notes |
|------|-----------|-------------|-------|
| **New** | 0–9 scans | 0.5x | Half-weight. Standard new user. |
| **Experienced** | 10–99 scans, any accuracy | 1.0–1.5x | Linear interpolation between 10 and 99 scans. |
| **Validated** | 100+ scans AND ≥85% accuracy | 2.0x | Votes count 4x a new user. |
| **Expert** | 500+ scans AND ≥92% accuracy | 2.5x | Votes count 5x a new account. |

**Accuracy** = votes that agreed with the eventual resolved dominant category / total votes cast.

### Manual corrections carry maximum weight

When a user manually corrects a category in the line item review UI, the system treats it as `confidence = 1.0`. Combined with trust weight:
- New user manual correction: `1.0 × 0.5 = 0.5` weighted vote
- Validated user manual correction: `1.0 × 2.0 = 2.0` weighted vote — the strongest signal possible

### Anti-spam math

A new account has 0.5x weight. To equal 10 validated users (2.0x each = 20.0 total weight), a spammer would need `20.0 / 0.5 = 40` new accounts — all pointing to the same merchant category. Plus the 30-vote minimum threshold means even 40 coordinated new accounts only gets to `40 × 0.5 = 20` weighted votes, which won't resolve the merchant if legitimate users are voting differently.

---

## Confidence Scoring

### How CrowdTag confidence is calculated

After every vote, the Postgres function recalculates in real-time:

```
confidence = dominant_category_weighted_votes / total_weighted_votes

Example:
  "Takeout & Delivery" = 45.2 weighted votes
  "Food & Dining"      =  8.1 weighted votes
  "Other"              =  1.0 weighted votes
  Total                = 54.3 weighted votes

  confidence = 45.2 / 54.3 = 0.8324
```

### Auto-resolution threshold

A merchant auto-resolves when **both** conditions are true simultaneously:
- `total_votes >= 30` — prevents resolution from a handful of coordinated votes
- `confidence_score >= 0.75` — prevents resolution on split opinions

### CrowdTag confidence tiers for UI

| Score | Tier | Display Label | Color |
|-------|------|--------------|-------|
| ≥ 0.85 | `community_verified` | Community Verified | `#10b981` green |
| 0.70–0.84 | `building` | Building Consensus | `#f59e0b` amber |
| 0.50–0.69 | `seeded` | Pre-Verified | `#6b7280` gray |
| < 0.50 | `unverified` | Unverified | `#ef4444` red |

Use `getCrowdTagConfidenceTier(confidence)` to get these values — it returns the color and icon name too, ready to use in your UI components.

---

## Drift Detection

### What it catches

After a merchant is resolved (e.g. "Reliance Fresh" → Groceries), real-world changes can invalidate the category. A store might rebrand, change its product mix, or the original votes might have been wrong. Drift detection catches this automatically without any admin intervention.

### How it triggers

Every 10th vote on a resolved merchant triggers `check_merchant_drift()`:

1. Reads the last 20 entries in `recent_votes` JSONB array
2. Counts how many contradict the `dominant_category`
3. If all 20 recent votes disagree → drift detected:
   - `is_resolved = FALSE` → merchant re-enters community voting
   - `confidence_score = confidence_score × 0.5` → confidence penalized
   - `drift_detected = TRUE` + `drift_detected_at = NOW()`
   - Event logged to `crowdtag_events` as `drift_detected`

### What happens after drift

The merchant goes back into the normal voting flow. As new correct votes come in, confidence rebuilds. If it crosses the threshold again (30 votes, 75% confidence), it auto-resolves again with the new dominant category. Entirely automatic. No admin needed for standard cases.

### Admin dashboard for drift

Use `getDriftedMerchants()` to surface drifted merchants in the admin panel. Admins can review them and decide if manual intervention is needed.

---

## Admin Panel Integration

All of these functions are server-side only — call them in Server Components or API routes:

```typescript
import {
  getCrowdTagAdminSummary,
  getCategoryDistribution,
  getTopMerchants,
  getRecentEvents,
  getDriftedMerchants,
} from "@/lib/ai/crowdtag";

// Summary stats cards
const summary = await getCrowdTagAdminSummary();
// {
//   total_merchants:          1240,
//   resolved_merchants:         87,
//   seeded_merchants:          620,
//   drift_merchants:             3,
//   multi_category_merchants:   14,
//   avg_confidence:         0.7912,
//   avg_votes_per_merchant:    8.4,
//   total_votes_cast:        10413
// }

// Category pie chart data
const distribution = await getCategoryDistribution();
// [
//   { dominant_category: "Food & Dining", merchant_count: 340, total_votes: 12400, avg_confidence: 0.83 },
//   { dominant_category: "Groceries",     merchant_count: 280, total_votes:  9800, avg_confidence: 0.91 },
// ]

// Top merchants table
const topMerchants = await getTopMerchants(20);

// Live event feed
const events = await getRecentEvents(50);
// [{ event_type: "merchant_resolved", merchant_key: "dominos_pizza_pune", payload: {...} }, ...]

// Merchants needing attention (drifted)
const drifted = await getDriftedMerchants();
```

### Supabase Realtime live event feed

Add this to your admin panel client component for a real-time event stream:

```typescript
"use client";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function CrowdTagLiveFeed() {
  const [events, setEvents] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("crowdtag_live")
      .on("postgres_changes", {
        event:  "INSERT",
        schema: "public",
        table:  "crowdtag_events",
      }, (payload) => {
        setEvents(prev => [payload.new, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div>
      {events.map(e => (
        <div key={e.id}>{e.event_type} — {e.merchant_key}</div>
      ))}
    </div>
  );
}
```

---

## Environment Variables

### Complete `.env.local` after Phase 2

```env
# ── Supabase (Phase 1) ─────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# ── Supabase Service Role (Phase 2 — server-side ONLY) ────────
# Used by seed-places.ts. NEVER prefix with NEXT_PUBLIC_.
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# ── Gemini Vision (Phase 1) ────────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key

# ── Google Places (Phase 2) ────────────────────────────────────
GOOGLE_PLACES_API_KEY=your_places_api_key

# ── ML Inference Server (Phase 1 — updated URL for prod) ──────
ATLAS_ML_SERVER_URL=http://localhost:8001
# Production: https://your-atlas-model.railway.app
```

### `.env.example` — what to commit to git

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GOOGLE_PLACES_API_KEY=
ATLAS_ML_SERVER_URL=http://localhost:8001
```

---

## Full File Structure

After Phase 2, your project looks like this:

```
atlas/
  lib/
    ai/
      gemini.ts              ← Phase 1 (unchanged)
      custom-model.ts        ← Phase 1 (unchanged)
      crowdtag.ts            ← Phase 2 NEW (replaces stub)
      pipeline.ts            ← Phase 2 UPDATED (was pipeline-v2.ts)
      crowdtag-stub.ts       ← DELETED
  scripts/
    seed-places.ts           ← Phase 2 NEW
  public/
    models/
      atlas-receipt-v1/
        model.json           ← Fine-tuned TF.js model
        group1-shard*.bin

# Alongside Next.js project (Python ML workspace):
  train.py                   ← Phase 1 (unchanged)
  fine_tune.py               ← Phase 2 NEW
  server.py                  ← Phase 1 (unchanged, updated model path)
  requirements.txt           ← Phase 1 (unchanged)
  models/
    best_model_phase1.h5
    best_model_finetuned.h5
    atlas_receipt_model_finetuned.h5
    atlas_receipt_savedmodel_finetuned/
    tfjs_finetuned/
      model.json
      group1-shard*.bin
    atlas_receipt_model_finetuned.tflite
    atlas_receipt_model_finetuned.onnx
    class_labels.json
    model_metadata.json
```

---

## Testing

### Test CrowdTag vote → resolution flow

```typescript
// Run this in a test file or directly in Supabase SQL Editor
// to verify the full vote → resolve → lookup loop works

// 1. Should not find new merchant
const r1 = await resolveMerchant("Test Merchant Phase2", "TestCity");
console.assert(r1.found === false, "Should not exist yet");

// 2. Cast 30 votes for "Groceries"
for (let i = 0; i < 30; i++) {
  await logMerchantVote({
    merchantName: "Test Merchant Phase2",
    city:         "TestCity",
    category:     "Groceries",
    userId:       `test-user-${i}`,
    confidence:   0.88,
  });
}

// 3. Should now be resolved
const r2 = await resolveMerchant("Test Merchant Phase2", "TestCity");
console.assert(r2.is_resolved === true, "Should be resolved");
console.assert(r2.dominant_category === "Groceries", "Should be Groceries");
console.assert(r2.confidence >= 0.75, "Should be above threshold");

// 4. Simulate drift — 20 contradicting votes
for (let i = 0; i < 20; i++) {
  await logMerchantVote({
    merchantName: "Test Merchant Phase2",
    city:         "TestCity",
    category:     "Electronics",  // contradicts Groceries
    userId:       `drift-user-${i}`,
    confidence:   0.82,
  });
}

// 5. Force drift check
const drift = await checkMerchantDrift("test_merchant_phase2_testcity");
console.assert(drift.drift_detected === true, "Drift should be detected");

console.log("✅ All CrowdTag tests passed");
```

### Test fine-tuned model loads and runs

```bash
python -c "
import tensorflow as tf
import numpy as np

model = tf.keras.models.load_model('./models/best_model_finetuned.h5')
img = np.random.rand(1, 224, 224, 3).astype(np.float32)
pred = model.predict(img)
print('Output shape:', pred.shape)
print('Max confidence:', float(pred.max()))
print('✅ Fine-tuned model loads correctly')
"
```

### Test inference server with real receipt image

```bash
curl -X POST http://localhost:8001/predict \
  -F "file=@/path/to/your/receipt.jpg" | python -m json.tool

# Expected:
# {
#   "predicted_class":  "grocery",
#   "confidence":       0.9312,
#   "confidence_tier":  "high",
#   "action":           "auto_accept",
#   "inference_time_ms": 147.2,
#   "server_available": true,
#   "model_version":    "1.0.0"
# }
```

---

## Monitoring & Observability

### Key Supabase queries for health monitoring

```sql
-- CrowdTag resolution rate (target: growing over time)
SELECT
  total_merchants,
  resolved_merchants,
  ROUND(resolved_merchants::DECIMAL / NULLIF(total_merchants, 0) * 100, 1) AS resolution_pct,
  total_votes_cast,
  avg_confidence
FROM crowdtag_admin_summary;

-- Drift rate (should stay below 2%)
SELECT
  ROUND(drift_merchants::DECIMAL / NULLIF(resolved_merchants, 0) * 100, 2) AS drift_rate_pct
FROM crowdtag_admin_summary;

-- Daily vote volume (growth metric)
SELECT
  DATE(created_at) AS date,
  COUNT(*)         AS votes,
  COUNT(DISTINCT user_id) AS unique_voters
FROM crowdtag_votes
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Top performing categories by resolution rate
SELECT
  dominant_category,
  merchant_count,
  resolved_count,
  ROUND(resolved_count::DECIMAL / NULLIF(merchant_count, 0) * 100, 1) AS resolution_pct
FROM crowdtag_category_distribution
ORDER BY resolution_pct DESC;

-- Users by trust tier
SELECT tier, COUNT(*), AVG(accuracy_rate), AVG(total_scans)
FROM user_trust_scores
GROUP BY tier
ORDER BY trust_score DESC;
```

### ML server health check (add to cron or admin panel)

```typescript
import { getMLServerStatus } from "@/lib/ai/custom-model";

const status = await getMLServerStatus();
// { healthy: true, version: "1.0.0", model_loaded: true }

if (!status.healthy) {
  // Alert — Gemini will be used for all scans until ML server recovers
  // No user impact, but worth knowing
}
```

---

## Troubleshooting

### "merchant_fingerprints table not found"
The SQL schema hasn't been run yet, or it failed silently. Check the Supabase SQL Editor for errors. Re-run `crowdtag-schema.sql` — it is safe to run multiple times.

### "permission denied for table merchant_fingerprints"
RLS is enabled but the Supabase client isn't authenticated. In API routes and Server Components, always use `lib/supabase/server.ts`, not the browser client. The browser client only works on client components and respects RLS with the current user's session.

### Seeder exits with "GOOGLE_PLACES_API_KEY not set"
The env var isn't in scope. Use explicit export:
```bash
export GOOGLE_PLACES_API_KEY=your_key
export SUPABASE_URL=your_url
export SUPABASE_SERVICE_ROLE_KEY=your_key
npx tsx scripts/seed-places.ts --cities "Pune"
```

### Seeder runs but nothing appears in merchant_fingerprints
You may be running with the anon key instead of service role key. The anon key respects RLS which blocks inserts from the seeder context. Double-check `SUPABASE_SERVICE_ROLE_KEY` is set correctly.

### Fine-tuned model accuracy lower than Phase 1
Your learning rate is too high. Re-run with `--lr 0.000001`. Also verify the "Trainable params" log line — it should be well below total params (BatchNorm layers must stay frozen).

### ONNX export fails with "tf2onnx not found"
```bash
pip install tf2onnx onnx --break-system-packages
python fine_tune.py ...  # re-run
```

### CrowdTag votes being logged but merchant never resolves
Check that `total_votes >= 30` AND `confidence_score >= 0.75` are both true. Run this in SQL Editor to see the current state:
```sql
SELECT merchant_key, total_votes, confidence_score, is_resolved, dominant_category
FROM merchant_fingerprints
WHERE merchant_key = 'your_merchant_key';
```
If total_votes is correct but confidence is low, votes are split across multiple categories — normal behavior for a genuinely ambiguous merchant.

### CrowdTag hit rate stays at 0% after seeding
Seeded merchants start with 5 virtual votes at 0.70 confidence — they appear in `resolve_merchant_for_user()` but `is_resolved` is `TRUE` only for seeded merchants. Check:
```sql
SELECT COUNT(*) FROM merchant_fingerprints WHERE seeded_from_places_api = TRUE AND is_resolved = TRUE;
```
If 0 — the seeder ran but the `seed_merchant_from_places` function has an issue. Re-run `crowdtag-schema.sql` and try seeding again.

### ML server confidence always 0 (Gemini always wins)
The ML server is unreachable. Check:
```bash
curl http://localhost:8001/health
```
If connection refused → server isn't running. If `model_loaded: false` → the ONNX file path is wrong. Verify `MODEL_PATH` env var points to the correct `.onnx` file.

---

## Phase 1 → Phase 2 Migration Checklist

Complete in this exact order:

- [ ] Run `crowdtag-schema.sql` in Supabase SQL Editor
- [ ] Verify 4 tables, 4 views, 6 functions created (Step 1 verification queries)
- [ ] Copy `crowdtag.ts` → `lib/ai/crowdtag.ts`
- [ ] Copy `pipeline-v2.ts` → `lib/ai/pipeline.ts`
- [ ] Delete `lib/ai/crowdtag-stub.ts`
- [ ] Copy `seed-places.ts` → `scripts/seed-places.ts`
- [ ] Run `grep -r "crowdtag-stub"` — confirm 0 results
- [ ] Enable Places API (New) in Google Cloud Console
- [ ] Create restricted Places API key
- [ ] Add `GOOGLE_PLACES_API_KEY` to `.env.local`
- [ ] Run seeder for Pune only (test) — verify 100+ merchants seeded
- [ ] Check Supabase `merchant_fingerprints` table — rows present
- [ ] Run seeder for all target cities
- [ ] Complete Phase 1 ML training (`train.py`) if not already done
- [ ] Run `fine_tune.py` using Phase 1 model as base
- [ ] Confirm fine-tuned test accuracy exceeds Phase 1 accuracy
- [ ] Update inference server: `MODEL_PATH=...finetuned.onnx uvicorn server:app`
- [ ] Run server health check: `curl localhost:8001/health` → `model_loaded: true`
- [ ] Copy `tfjs_finetuned/` → `public/models/atlas-receipt-v1/`
- [ ] Add all Phase 2 env vars to Vercel dashboard
- [ ] Add Phase 2 env vars to Railway dashboard
- [ ] Push to GitHub → Vercel auto-deploys
- [ ] Deploy updated ML server image to Railway
- [ ] End-to-end test: scan a receipt → verify vote logged in `crowdtag_votes`
- [ ] Admin panel test: verify CrowdTag stats populate correctly
- [ ] Monitor Supabase logs for 24 hours: no RLS errors, no slow queries on `merchant_fingerprints`

---

## What Phase 3 Looks Like

Phase 2 builds the intelligence layer. Phase 3 monetizes it and expands it.

**B2B Data API** — sell anonymized merchant spending intelligence. The `merchant_fingerprints` table with `category_distribution` + `total_votes` IS the product. FMCG brands pay to know that 78% of Dominos orders in Pune happen between 7–10pm. Urban planners pay to know which neighborhoods have the highest grocery density.

**CrowdTag Admin Resolution** — admin UI to manually override drifted merchants, set categories directly, and merge duplicate merchant keys from different spelling variants.

**Geographic expansion** — the seeder already accepts `--country` flag. Seed UAE, UK, USA with: `npx tsx seed-places.ts --cities "Dubai,Abu Dhabi" --country AE`

**Real-time CrowdTag push** — Supabase Realtime notification to the user's app when a merchant they've previously scanned just got resolved by the community. "🎉 Sharma Medical Store near you was just verified as Health & Medicine by 31 users."

**User CrowdTag badges** — surface Trust Score tier in the user profile screen. "You're an Experienced Voter — your scans help 1,200 users in Pune."

**Merchant claim system** — business owners claim their merchant listing, verify ownership via Google Business, and set their category directly. Verified owner claims get a 3.0x trust weight — the highest in the system.

---

*ATLAS Engineering — Phase 2: CrowdTag Mesh Intelligence + ML Fine-Tuning*

*For Phase 1 setup, see `atlas_model/README.md`*
