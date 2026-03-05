-- ============================================================
-- ATLAS CrowdTag Phase 2 — Complete Supabase Schema
-- ============================================================
-- Run this entire file in your Supabase SQL Editor.
-- It is safe to run multiple times (idempotent).
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. MERCHANT FINGERPRINTS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS merchant_fingerprints (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_key           TEXT UNIQUE NOT NULL,  -- normalized: lowercase, no punctuation, trimmed
  display_name           TEXT NOT NULL,          -- original merchant name for display
  city                   TEXT,
  country                TEXT DEFAULT 'IN',

  -- Vote tallies per category (JSONB: { "Groceries": 45, "Food & Dining": 12 })
  category_votes         JSONB DEFAULT '{}',

  -- Resolved state
  dominant_category      TEXT,
  confidence_score       DECIMAL(5,4) DEFAULT 0,
  total_votes            INTEGER DEFAULT 0,
  is_resolved            BOOLEAN DEFAULT FALSE,
  resolved_at            TIMESTAMPTZ,

  -- Drift detection
  recent_votes           JSONB DEFAULT '[]',    -- last 50 votes: [{category, timestamp, weight}]
  drift_detected         BOOLEAN DEFAULT FALSE,
  drift_detected_at      TIMESTAMPTZ,
  last_drift_check       TIMESTAMPTZ,

  -- Seeding
  seeded_from_places_api BOOLEAN DEFAULT FALSE,
  places_api_types       TEXT[],               -- raw Google Places types
  places_place_id        TEXT,

  -- Multi-category support
  category_distribution  JSONB DEFAULT '{}',   -- { "Groceries": 0.75, "Snacks": 0.25 }
  is_multi_category      BOOLEAN DEFAULT FALSE,

  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_key        ON merchant_fingerprints(merchant_key);
CREATE INDEX IF NOT EXISTS idx_merchant_resolved    ON merchant_fingerprints(is_resolved);
CREATE INDEX IF NOT EXISTS idx_merchant_country     ON merchant_fingerprints(country);
CREATE INDEX IF NOT EXISTS idx_merchant_city        ON merchant_fingerprints(city);
CREATE INDEX IF NOT EXISTS idx_merchant_category    ON merchant_fingerprints(dominant_category);


-- ─────────────────────────────────────────────
-- 2. INDIVIDUAL VOTES LOG
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crowdtag_votes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_key    TEXT NOT NULL REFERENCES merchant_fingerprints(merchant_key) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  confidence      DECIMAL(5,4) NOT NULL DEFAULT 0,  -- model confidence at time of scan
  trust_weight    DECIMAL(4,3) NOT NULL DEFAULT 0.5, -- user's trust score at time of vote
  weighted_vote   DECIMAL(6,4) GENERATED ALWAYS AS (confidence * trust_weight) STORED,
  is_manual       BOOLEAN DEFAULT FALSE,             -- true if user manually corrected category
  receipt_id      UUID REFERENCES receipts(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_votes_merchant  ON crowdtag_votes(merchant_key);
CREATE INDEX IF NOT EXISTS idx_votes_user      ON crowdtag_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_category  ON crowdtag_votes(category);
CREATE INDEX IF NOT EXISTS idx_votes_created   ON crowdtag_votes(created_at DESC);

-- Prevent double-voting on same receipt
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_unique_receipt
  ON crowdtag_votes(merchant_key, receipt_id)
  WHERE receipt_id IS NOT NULL;


-- ─────────────────────────────────────────────
-- 3. USER TRUST SCORES
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_trust_scores (
  user_id            UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  trust_score        DECIMAL(4,3) DEFAULT 0.500,  -- 0.5 new, 1.5 experienced, 2.0 validated
  total_scans        INTEGER DEFAULT 0,
  correct_votes      INTEGER DEFAULT 0,           -- votes that matched resolved dominant category
  incorrect_votes    INTEGER DEFAULT 0,
  accuracy_rate      DECIMAL(5,4) DEFAULT 0,
  tier               TEXT DEFAULT 'new'           -- new | experienced | validated | expert
                     CHECK (tier IN ('new', 'experienced', 'validated', 'expert')),
  last_updated       TIMESTAMPTZ DEFAULT NOW(),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 4. CROWDTAG ANALYTICS EVENTS (for admin panel)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crowdtag_events (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type    TEXT NOT NULL,  -- 'merchant_resolved' | 'drift_detected' | 'merchant_seeded' | 'vote_logged'
  merchant_key  TEXT,
  payload       JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_type    ON crowdtag_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON crowdtag_events(created_at DESC);


-- ─────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

ALTER TABLE merchant_fingerprints  ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowdtag_votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trust_scores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowdtag_events        ENABLE ROW LEVEL SECURITY;

-- Merchant fingerprints: read by everyone, write only via server functions
DROP POLICY IF EXISTS "Merchants readable by all authenticated" ON merchant_fingerprints;
CREATE POLICY "Merchants readable by all authenticated"
  ON merchant_fingerprints FOR SELECT
  USING (auth.role() = 'authenticated');

-- Votes: users read own votes, admins read all
DROP POLICY IF EXISTS "Users read own votes" ON crowdtag_votes;
CREATE POLICY "Users read own votes"
  ON crowdtag_votes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all votes" ON crowdtag_votes;
CREATE POLICY "Admins read all votes"
  ON crowdtag_votes FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Trust scores: users read own, admins read all
DROP POLICY IF EXISTS "Users read own trust score" ON user_trust_scores;
CREATE POLICY "Users read own trust score"
  ON user_trust_scores FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all trust scores" ON user_trust_scores;
CREATE POLICY "Admins read all trust scores"
  ON user_trust_scores FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Events: admin only
DROP POLICY IF EXISTS "Admins read events" ON crowdtag_events;
CREATE POLICY "Admins read events"
  ON crowdtag_events FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');


-- ─────────────────────────────────────────────
-- 6. CORE FUNCTION: normalize_merchant_key
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION normalize_merchant_key(raw_name TEXT, city TEXT DEFAULT '')
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  normalized TEXT;
BEGIN
  normalized := lower(trim(raw_name));
  -- Remove punctuation except alphanumeric and spaces
  normalized := regexp_replace(normalized, '[^a-z0-9\s]', '', 'g');
  -- Collapse multiple spaces
  normalized := regexp_replace(normalized, '\s+', '_', 'g');
  -- Append city if provided
  IF city IS NOT NULL AND city != '' THEN
    normalized := normalized || '_' || lower(regexp_replace(trim(city), '[^a-z0-9\s]', '', 'g'));
    normalized := regexp_replace(normalized, '\s+', '_', 'g');
  END IF;
  RETURN normalized;
END;
$$;


-- ─────────────────────────────────────────────
-- 7. CORE FUNCTION: upsert_merchant_vote
-- ─────────────────────────────────────────────
-- Called by ATLAS pipeline after every successful scan.
-- Handles: vote logging, confidence recalculation,
--          auto-resolution, drift detection trigger.

CREATE OR REPLACE FUNCTION upsert_merchant_vote(
  p_merchant_name  TEXT,
  p_city           TEXT,
  p_category       TEXT,
  p_user_id        UUID,
  p_confidence     DECIMAL,
  p_receipt_id     UUID DEFAULT NULL,
  p_is_manual      BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_key              TEXT;
  v_trust_weight     DECIMAL;
  v_merchant         merchant_fingerprints%ROWTYPE;
  v_votes            JSONB;
  v_total_weighted   DECIMAL;
  v_category_totals  JSONB;
  v_dominant         TEXT;
  v_dominant_weight  DECIMAL;
  v_new_confidence   DECIMAL;
  v_should_resolve   BOOLEAN;
  v_recent_votes     JSONB;
  v_result           JSONB;
BEGIN
  -- Normalize merchant key
  v_key := normalize_merchant_key(p_merchant_name, p_city);

  -- Get or create trust weight for this user
  SELECT COALESCE(trust_score, 0.5) INTO v_trust_weight
  FROM user_trust_scores
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    v_trust_weight := 0.5;
    INSERT INTO user_trust_scores (user_id, trust_score, total_scans)
    VALUES (p_user_id, 0.5, 1)
    ON CONFLICT (user_id) DO UPDATE
      SET total_scans = user_trust_scores.total_scans + 1,
          last_updated = NOW();
  ELSE
    UPDATE user_trust_scores
    SET total_scans = total_scans + 1,
        last_updated = NOW()
    WHERE user_id = p_user_id;
  END IF;

  -- Upsert merchant fingerprint
  INSERT INTO merchant_fingerprints (merchant_key, display_name, city, category_votes, total_votes)
  VALUES (v_key, p_merchant_name, p_city, jsonb_build_object(p_category, 0), 0)
  ON CONFLICT (merchant_key) DO NOTHING;

  -- Log the vote
  INSERT INTO crowdtag_votes (
    merchant_key, user_id, category, confidence, trust_weight, is_manual, receipt_id
  )
  VALUES (v_key, p_user_id, p_category, p_confidence, v_trust_weight, p_is_manual, p_receipt_id)
  ON CONFLICT (merchant_key, receipt_id)
    WHERE receipt_id IS NOT NULL
  DO NOTHING;

  -- Recalculate category votes (weighted sum per category)
  SELECT
    jsonb_object_agg(category, total_weight) INTO v_category_totals
  FROM (
    SELECT category, SUM(weighted_vote) as total_weight
    FROM crowdtag_votes
    WHERE merchant_key = v_key
    GROUP BY category
  ) t;

  -- Total weighted votes
  SELECT SUM(value::DECIMAL) INTO v_total_weighted
  FROM jsonb_each_text(v_category_totals);

  -- Find dominant category
  SELECT key INTO v_dominant
  FROM jsonb_each_text(v_category_totals)
  ORDER BY value::DECIMAL DESC
  LIMIT 1;

  SELECT value::DECIMAL INTO v_dominant_weight
  FROM jsonb_each_text(v_category_totals)
  WHERE key = v_dominant;

  -- Confidence = dominant_weight / total_weighted
  IF v_total_weighted > 0 THEN
    v_new_confidence := v_dominant_weight / v_total_weighted;
  ELSE
    v_new_confidence := 0;
  END IF;

  -- Category distribution (percentages)
  -- Auto-resolve if: ≥30 total votes AND confidence ≥ 0.75
  SELECT COUNT(*) INTO v_total_weighted FROM crowdtag_votes WHERE merchant_key = v_key;
  v_should_resolve := (v_total_weighted >= 30 AND v_new_confidence >= 0.75);

  -- Update recent_votes for drift detection (keep last 50)
  SELECT COALESCE(recent_votes, '[]'::jsonb) INTO v_recent_votes
  FROM merchant_fingerprints WHERE merchant_key = v_key;

  v_recent_votes := (
    jsonb_build_array(jsonb_build_object(
      'category',  p_category,
      'weight',    v_trust_weight * p_confidence,
      'timestamp', NOW()
    )) || v_recent_votes
  );
  -- Keep only last 50
  IF jsonb_array_length(v_recent_votes) > 50 THEN
    v_recent_votes := v_recent_votes -> 0;
  END IF;

  -- Update merchant fingerprint
  UPDATE merchant_fingerprints SET
    category_votes     = v_category_totals,
    dominant_category  = v_dominant,
    confidence_score   = v_new_confidence,
    total_votes        = (SELECT COUNT(*) FROM crowdtag_votes WHERE merchant_key = v_key),
    is_resolved        = v_should_resolve,
    resolved_at        = CASE WHEN v_should_resolve AND resolved_at IS NULL THEN NOW() ELSE resolved_at END,
    recent_votes       = v_recent_votes,
    category_distribution = (
      SELECT jsonb_object_agg(key, ROUND((value::DECIMAL / NULLIF(v_total_weighted, 0) * 100)::NUMERIC, 2))
      FROM jsonb_each_text(v_category_totals)
    ),
    is_multi_category  = (
      SELECT COUNT(*) > 1
      FROM jsonb_each_text(v_category_totals)
      WHERE value::DECIMAL >= (v_total_weighted * 0.15)  -- ≥15% counts as significant
    ),
    updated_at         = NOW()
  WHERE merchant_key = v_key;

  -- Log resolution event
  IF v_should_resolve THEN
    INSERT INTO crowdtag_events (event_type, merchant_key, payload)
    VALUES ('merchant_resolved', v_key, jsonb_build_object(
      'dominant_category', v_dominant,
      'confidence',        v_new_confidence,
      'total_votes',       (SELECT total_votes FROM merchant_fingerprints WHERE merchant_key = v_key)
    ))
    ON CONFLICT DO NOTHING;
  END IF;

  -- Log vote event
  INSERT INTO crowdtag_events (event_type, merchant_key, payload)
  VALUES ('vote_logged', v_key, jsonb_build_object(
    'category',     p_category,
    'confidence',   p_confidence,
    'is_manual',    p_is_manual
  ));

  v_result := jsonb_build_object(
    'merchant_key',       v_key,
    'dominant_category',  v_dominant,
    'confidence',         v_new_confidence,
    'is_resolved',        v_should_resolve,
    'total_votes',        (SELECT total_votes FROM merchant_fingerprints WHERE merchant_key = v_key)
  );

  RETURN v_result;
END;
$$;


-- ─────────────────────────────────────────────
-- 8. FUNCTION: check_merchant_drift
-- ─────────────────────────────────────────────
-- If 20 consecutive recent votes contradict the resolved category,
-- drop confidence and re-open voting.

CREATE OR REPLACE FUNCTION check_merchant_drift(p_merchant_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_merchant          merchant_fingerprints%ROWTYPE;
  v_recent            JSONB;
  v_dominant          TEXT;
  v_contra_count      INTEGER := 0;
  v_drift_threshold   INTEGER := 20;
  v_drift_detected    BOOLEAN := FALSE;
  v_result            JSONB;
BEGIN
  SELECT * INTO v_merchant FROM merchant_fingerprints WHERE merchant_key = p_merchant_key;

  IF NOT FOUND OR NOT v_merchant.is_resolved THEN
    RETURN jsonb_build_object('drift_detected', FALSE, 'reason', 'merchant not resolved');
  END IF;

  v_dominant := v_merchant.dominant_category;
  v_recent   := v_merchant.recent_votes;

  -- Count how many of the last N votes contradict the dominant category
  SELECT COUNT(*) INTO v_contra_count
  FROM jsonb_array_elements(v_recent) AS vote
  WHERE (vote->>'category') != v_dominant
  LIMIT v_drift_threshold;

  v_drift_detected := v_contra_count >= v_drift_threshold;

  IF v_drift_detected THEN
    -- Re-open voting: drop confidence below resolution threshold
    UPDATE merchant_fingerprints SET
      is_resolved       = FALSE,
      drift_detected    = TRUE,
      drift_detected_at = NOW(),
      confidence_score  = confidence_score * 0.5,  -- penalize confidence
      last_drift_check  = NOW(),
      updated_at        = NOW()
    WHERE merchant_key = p_merchant_key;

    -- Log event
    INSERT INTO crowdtag_events (event_type, merchant_key, payload)
    VALUES ('drift_detected', p_merchant_key, jsonb_build_object(
      'previous_category', v_dominant,
      'contra_votes',      v_contra_count,
      'threshold',         v_drift_threshold
    ));
  ELSE
    UPDATE merchant_fingerprints SET
      last_drift_check = NOW()
    WHERE merchant_key = p_merchant_key;
  END IF;

  v_result := jsonb_build_object(
    'drift_detected',    v_drift_detected,
    'contra_votes',      v_contra_count,
    'dominant_category', v_dominant,
    'merchant_key',      p_merchant_key
  );

  RETURN v_result;
END;
$$;


-- ─────────────────────────────────────────────
-- 9. FUNCTION: resolve_merchant_for_user
-- ─────────────────────────────────────────────
-- Called by ATLAS before running Gemini — if merchant is already
-- resolved, skip AI categorization and return cached category.

CREATE OR REPLACE FUNCTION resolve_merchant_for_user(p_merchant_name TEXT, p_city TEXT DEFAULT '')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_key      TEXT;
  v_merchant merchant_fingerprints%ROWTYPE;
BEGIN
  v_key := normalize_merchant_key(p_merchant_name, p_city);

  SELECT * INTO v_merchant
  FROM merchant_fingerprints
  WHERE merchant_key = v_key;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', FALSE, 'merchant_key', v_key);
  END IF;

  RETURN jsonb_build_object(
    'found',                TRUE,
    'merchant_key',         v_key,
    'is_resolved',          v_merchant.is_resolved,
    'dominant_category',    v_merchant.dominant_category,
    'confidence',           v_merchant.confidence_score,
    'total_votes',          v_merchant.total_votes,
    'is_multi_category',    v_merchant.is_multi_category,
    'category_distribution',v_merchant.category_distribution,
    'seeded',               v_merchant.seeded_from_places_api
  );
END;
$$;


-- ─────────────────────────────────────────────
-- 10. FUNCTION: update_user_trust_score
-- ─────────────────────────────────────────────
-- Called periodically (or after each scan) to recalculate trust score.
-- Tier thresholds:
--   new:          < 10 scans     → weight 0.5
--   experienced:  10–99 scans    → weight 1.0–1.5 (linear)
--   validated:    100+ scans, accuracy ≥ 0.85 → weight 2.0
--   expert:       500+ scans, accuracy ≥ 0.92 → weight 2.5

CREATE OR REPLACE FUNCTION update_user_trust_score(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_total_scans   INTEGER;
  v_correct_votes INTEGER;
  v_accuracy      DECIMAL;
  v_trust         DECIMAL;
  v_tier          TEXT;
BEGIN
  SELECT total_scans, correct_votes INTO v_total_scans, v_correct_votes
  FROM user_trust_scores WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('updated', FALSE, 'reason', 'user not found');
  END IF;

  -- Accuracy rate
  IF v_total_scans > 0 THEN
    v_accuracy := COALESCE(v_correct_votes::DECIMAL / NULLIF(v_total_scans, 0), 0);
  ELSE
    v_accuracy := 0;
  END IF;

  -- Tier + trust score calculation
  IF v_total_scans >= 500 AND v_accuracy >= 0.92 THEN
    v_tier  := 'expert';
    v_trust := 2.5;
  ELSIF v_total_scans >= 100 AND v_accuracy >= 0.85 THEN
    v_tier  := 'validated';
    v_trust := 2.0;
  ELSIF v_total_scans >= 10 THEN
    v_tier  := 'experienced';
    -- Linear interpolation: 10 scans → 1.0, 99 scans → 1.5
    v_trust := 1.0 + LEAST((v_total_scans - 10)::DECIMAL / 178.0, 0.5);
  ELSE
    v_tier  := 'new';
    v_trust := 0.5;
  END IF;

  UPDATE user_trust_scores SET
    trust_score   = v_trust,
    accuracy_rate = v_accuracy,
    tier          = v_tier,
    last_updated  = NOW()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'updated',      TRUE,
    'trust_score',  v_trust,
    'tier',         v_tier,
    'accuracy',     v_accuracy,
    'total_scans',  v_total_scans
  );
END;
$$;


-- ─────────────────────────────────────────────
-- 11. FUNCTION: seed_merchant_from_places
-- ─────────────────────────────────────────────
-- Called by the Places API seeder script (seed-places.ts)

CREATE OR REPLACE FUNCTION seed_merchant_from_places(
  p_name        TEXT,
  p_city        TEXT,
  p_country     TEXT,
  p_category    TEXT,
  p_place_id    TEXT,
  p_types       TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_key    TEXT;
  v_result JSONB;
BEGIN
  v_key := normalize_merchant_key(p_name, p_city);

  INSERT INTO merchant_fingerprints (
    merchant_key, display_name, city, country,
    dominant_category, confidence_score, total_votes,
    is_resolved, resolved_at,
    seeded_from_places_api, places_place_id, places_api_types,
    category_votes,
    category_distribution
  )
  VALUES (
    v_key, p_name, p_city, p_country,
    p_category, 0.70, 5,    -- seeded merchants start at 0.70 confidence, 5 virtual votes
    TRUE, NOW(),
    TRUE, p_place_id, p_types,
    jsonb_build_object(p_category, 5),
    jsonb_build_object(p_category, 100)
  )
  ON CONFLICT (merchant_key) DO NOTHING;    -- never overwrite real user votes with seed data

  INSERT INTO crowdtag_events (event_type, merchant_key, payload)
  VALUES ('merchant_seeded', v_key, jsonb_build_object(
    'category',  p_category,
    'place_id',  p_place_id,
    'source',    'google_places_api'
  ))
  ON CONFLICT DO NOTHING;

  v_result := jsonb_build_object('seeded', TRUE, 'merchant_key', v_key, 'category', p_category);
  RETURN v_result;
END;
$$;


-- ─────────────────────────────────────────────
-- 12. TRIGGER: auto-update timestamp
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS merchant_fingerprints_updated_at ON merchant_fingerprints;
CREATE TRIGGER merchant_fingerprints_updated_at
  BEFORE UPDATE ON merchant_fingerprints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────────
-- 13. ADMIN ANALYTICS VIEWS
-- ─────────────────────────────────────────────

CREATE OR REPLACE VIEW crowdtag_admin_summary AS
SELECT
  COUNT(*)                                          AS total_merchants,
  COUNT(*) FILTER (WHERE is_resolved)               AS resolved_merchants,
  COUNT(*) FILTER (WHERE seeded_from_places_api)    AS seeded_merchants,
  COUNT(*) FILTER (WHERE drift_detected)            AS drift_merchants,
  COUNT(*) FILTER (WHERE is_multi_category)         AS multi_category_merchants,
  ROUND(AVG(confidence_score)::NUMERIC, 4)          AS avg_confidence,
  ROUND(AVG(total_votes)::NUMERIC, 2)               AS avg_votes_per_merchant,
  SUM(total_votes)                                  AS total_votes_cast
FROM merchant_fingerprints;

CREATE OR REPLACE VIEW crowdtag_category_distribution AS
SELECT
  dominant_category,
  COUNT(*)                                       AS merchant_count,
  SUM(total_votes)                               AS total_votes,
  ROUND(AVG(confidence_score)::NUMERIC, 4)       AS avg_confidence,
  COUNT(*) FILTER (WHERE is_resolved)            AS resolved_count
FROM merchant_fingerprints
WHERE dominant_category IS NOT NULL
GROUP BY dominant_category
ORDER BY merchant_count DESC;

CREATE OR REPLACE VIEW crowdtag_top_merchants AS
SELECT
  display_name,
  city,
  dominant_category,
  confidence_score,
  total_votes,
  is_resolved,
  is_multi_category,
  category_distribution,
  updated_at
FROM merchant_fingerprints
ORDER BY total_votes DESC
LIMIT 100;

CREATE OR REPLACE VIEW crowdtag_trust_leaderboard AS
SELECT
  p.full_name,
  uts.tier,
  uts.trust_score,
  uts.total_scans,
  uts.accuracy_rate,
  uts.correct_votes,
  uts.last_updated
FROM user_trust_scores uts
JOIN profiles p ON p.id = uts.user_id
ORDER BY uts.trust_score DESC, uts.total_scans DESC
LIMIT 50;


-- ─────────────────────────────────────────────
-- 14. SEED CATEGORIES TABLE (if not exists)
-- ─────────────────────────────────────────────

INSERT INTO categories (name, icon, color) VALUES
  ('Food & Dining',       'utensils',      '#f97316'),
  ('Groceries',           'shopping-cart', '#22c55e'),
  ('Health & Medicine',   'heart-pulse',   '#ef4444'),
  ('Personal Care',       'sparkles',      '#a855f7'),
  ('Home & Household',    'home',          '#3b82f6'),
  ('Electronics',         'cpu',           '#06b6d4'),
  ('Clothing & Fashion',  'shirt',         '#ec4899'),
  ('Transport',           'car',           '#eab308'),
  ('Entertainment',       'film',          '#8b5cf6'),
  ('Education',           'book-open',     '#14b8a6'),
  ('Takeout & Delivery',  'package',       '#f59e0b'),
  ('Other',               'circle-dot',    '#6b7280')
ON CONFLICT (name) DO NOTHING;
