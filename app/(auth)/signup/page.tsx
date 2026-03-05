import Link from 'next/link';
import { SignupForm } from '@/components/auth/SignupForm';

/* ============================================================
   ATLAS — Signup Page
   ============================================================ */

export default function SignupPage() {
    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: 'var(--gradient-hero)' }}>
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-purple)] flex items-center justify-center mx-auto mb-4">
                        <span className="font-display font-bold text-white text-lg">A</span>
                    </div>
                    <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">
                        Create your account
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Start tracking your expenses with ATLAS
                    </p>
                </div>

                {/* Form */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-xl">
                    <SignupForm />
                </div>

                {/* Login link */}
                <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
                    Already have an account?{' '}
                    <Link
                        href="/login"
                        className="text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] font-medium transition-colors"
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
