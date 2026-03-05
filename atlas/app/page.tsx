import Link from 'next/link';

/* ============================================================
   ATLAS — Landing Page
   ============================================================ */

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--gradient-hero)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-purple)] flex items-center justify-center">
            <span className="font-display font-bold text-white text-sm">A</span>
          </div>
          <span className="font-display font-bold text-xl text-[var(--text-primary)]">ATLAS</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-5 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--accent-primary)] text-white hover:brightness-110 transition-all"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)]/50 text-xs text-[var(--text-secondary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AI-Powered Expense Intelligence
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight">
              <span className="text-[var(--text-primary)]">Snap it. </span>
              <span className="gradient-text">Forget it.</span>
              <br />
              <span className="text-[var(--text-primary)]">Know </span>
              <span className="gradient-text">everything.</span>
            </h1>
            <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
              Scan receipts with AI. Auto-categorize every line item. Watch your spending DNA unfold.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="px-8 py-3.5 rounded-xl text-base font-medium bg-[var(--accent-primary)] text-white hover:brightness-110 transition-all shadow-lg shadow-[var(--accent-primary)]/20"
            >
              Start Scanning →
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-xl text-base font-medium border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all"
            >
              Sign In
            </Link>
          </div>

          {/* Feature chips */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            {[
              'Dual-AI OCR Engine',
              'Auto-Categorization',
              'Spending Analytics',
              'Torn Receipt Mode',
              'Real-time Dashboard',
            ].map((feature) => (
              <span
                key={feature}
                className="px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)]/30 text-xs text-[var(--text-muted)]"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs text-[var(--text-muted)]">
        © 2026 ATLAS — Built for Hack Arena Hackathon
      </footer>
    </div>
  );
}
