-- ============================================================
-- ATLAS — Complete Supabase Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ─── Profiles (extends auth.users) ────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  theme_preference TEXT DEFAULT 'dark' CHECK (theme_preference IN ('dark', 'light', 'system')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Receipts ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  merchant_name TEXT,
  receipt_date DATE,
  total_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'INR',
  overall_confidence DECIMAL(4,3),
  model_used TEXT CHECK (model_used IN ('gemini', 'custom_ml')),
  raw_text TEXT,
  is_torn_receipt BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Line Items ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS line_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  confidence DECIMAL(4,3),
  manually_corrected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Categories (seed data) ───────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed categories
INSERT INTO categories (name, icon, color) VALUES
  ('Food & Dining', 'utensils', '#f97316'),
  ('Groceries', 'shopping-cart', '#22c55e'),
  ('Health & Medicine', 'heart-pulse', '#ef4444'),
  ('Personal Care', 'sparkles', '#a855f7'),
  ('Home & Household', 'home', '#3b82f6'),
  ('Electronics', 'cpu', '#06b6d4'),
  ('Clothing & Fashion', 'shirt', '#ec4899'),
  ('Transport', 'car', '#eab308'),
  ('Entertainment', 'film', '#8b5cf6'),
  ('Education', 'book-open', '#14b8a6'),
  ('Takeout & Delivery', 'package', '#f59e0b'),
  ('Other', 'circle-dot', '#6b7280')
ON CONFLICT (name) DO NOTHING;

-- ─── Merchant Fingerprints (CrowdTag Phase 2) ─────────────
CREATE TABLE IF NOT EXISTS merchant_fingerprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_key TEXT UNIQUE NOT NULL,
  category_votes JSONB DEFAULT '{}',
  dominant_category TEXT,
  confidence_score DECIMAL(4,3) DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  is_resolved BOOLEAN DEFAULT FALSE,
  seeded_from_places_api BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Enable Row Level Security ─────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_fingerprints ENABLE ROW LEVEL SECURITY;

-- ─── RLS Policies ──────────────────────────────────────────

-- Profiles: users see their own, admins see all
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Receipts: users see their own, admins see all
CREATE POLICY "Users can view own receipts"
  ON receipts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipts"
  ON receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipts"
  ON receipts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipts"
  ON receipts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all receipts"
  ON receipts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Line Items: users see their own (via receipt), admins see all
CREATE POLICY "Users can view own line items"
  ON line_items FOR SELECT
  USING (
    auth.uid() = (SELECT user_id FROM receipts WHERE id = receipt_id)
  );

CREATE POLICY "Users can insert own line items"
  ON line_items FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM receipts WHERE id = receipt_id)
  );

CREATE POLICY "Users can update own line items"
  ON line_items FOR UPDATE
  USING (
    auth.uid() = (SELECT user_id FROM receipts WHERE id = receipt_id)
  );

CREATE POLICY "Users can delete own line items"
  ON line_items FOR DELETE
  USING (
    auth.uid() = (SELECT user_id FROM receipts WHERE id = receipt_id)
  );

CREATE POLICY "Admins can view all line items"
  ON line_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Categories: public read
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  USING (true);

-- Merchant Fingerprints: public read, authenticated write
CREATE POLICY "Anyone can view merchant fingerprints"
  ON merchant_fingerprints FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert merchant fingerprints"
  ON merchant_fingerprints FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update merchant fingerprints"
  ON merchant_fingerprints FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ─── Functions ─────────────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchant_fingerprints_updated_at
  BEFORE UPDATE ON merchant_fingerprints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Indexes for Performance ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_merchant_name ON receipts(merchant_name);
CREATE INDEX IF NOT EXISTS idx_line_items_receipt_id ON line_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_line_items_category ON line_items(category);
CREATE INDEX IF NOT EXISTS idx_merchant_fingerprints_merchant_key ON merchant_fingerprints(merchant_key);

-- ─── Storage Bucket for Receipt Images ─────────────────────
-- Run this separately in Supabase Dashboard → Storage → Create Bucket
-- Bucket name: receipt-images
-- Public: No
-- File size limit: 10MB
-- Allowed MIME types: image/jpeg, image/png, image/webp, image/heic
