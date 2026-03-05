# ATLAS — AI-Powered Expense Intelligence Platform

> **Snap it. Forget it. Know everything.**

ATLAS is an AI-powered expense intelligence platform. Scan physical receipts, auto-categorize every line item, and build a complete picture of your spending habits.

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- A [Supabase](https://supabase.com) project
- A [Google Gemini](https://aistudio.google.com/app/apikey) API key

### 1. Clone and Install

```bash
cd atlas
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Storage** → Create a new bucket called `receipt-images` (private, 10MB limit, allowed types: image/jpeg, image/png, image/webp, image/heic)

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase → Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase → Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase → Settings → API (keep secret!)
- `GEMINI_API_KEY` — from Google AI Studio

### 4. Run

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 5. Create Admin User

1. Sign up at `/signup`
2. In Supabase Dashboard → Table Editor → profiles → find your user → set `role` to `admin`
3. Visit `/admin` to access the admin panel

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + CSS variables |
| State | Zustand + React hooks |
| Forms | React Hook Form + Zod |
| Animations | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + bcrypt |
| AI/OCR | Google Gemini Vision + Custom TF.js model |
| Deployment | Vercel |

## Architecture

### Dual-Model OCR Pipeline

```
Image Upload → Supabase Storage (temp)
  → Promise.all([Gemini Vision, Custom ML Model])
  → Compare confidence scores
  → Use higher confidence result
  → If both < 0.6, prompt retake
  → Structured JSON → DB → Delete image (finally block)
```

### CrowdTag System (Phase 2 Ready)
The `merchant_fingerprints` table and `logMerchantVote()` stub are wired up. Every successful scan logs a vote. Phase 2 will add full category resolution.

## Folder Structure

```
atlas/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Login, Signup, Forgot Password
│   ├── (dashboard)/        # Dashboard, Scan, Transactions, Insights, Settings
│   ├── (admin)/            # Admin Dashboard, User Management
│   └── api/                # API routes (scan, receipts, admin)
├── components/             # React components
│   ├── ui/                 # Design system (Button, Card, Input, etc.)
│   ├── auth/               # Auth forms
│   ├── scanner/            # Receipt scanning flow
│   ├── dashboard/          # Charts and stat cards
│   ├── layout/             # Sidebar, Navbar, ThemeToggle
│   └── admin/              # Admin-specific components
├── lib/                    # Core libraries
│   ├── ai/                 # Gemini, Custom ML, Pipeline
│   ├── auth/               # Password hashing, validation
│   ├── supabase/           # Client, Server, Types
│   └── utils/              # Formatting, Categories, Logger
├── hooks/                  # Custom React hooks
├── store/                  # Zustand global state
├── types/                  # TypeScript types
└── supabase/               # Database schema SQL
```

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Set environment variables in Vercel Dashboard → Settings → Environment Variables.

---

Built for **Hack Arena Hackathon** — © 2026 ATLAS
