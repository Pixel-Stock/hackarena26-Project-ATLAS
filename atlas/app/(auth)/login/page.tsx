import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

/* ============================================================
   ATLAS — Login Page
   ============================================================ */

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--gradient-hero)' }}>
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-purple)] flex items-center justify-center mx-auto mb-4">
                        <span className="font-display font-bold text-white text-lg">A</span>
                    </div>
                    <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">
                        Welcome back
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Sign in to your ATLAS account
                    </p>
                </div>

                {/* Form */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-xl">
                    <LoginForm />
                </div>

                {/* Sign up link */}
                <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
                    Don&apos;t have an account?{' '}
                    <Link
                        href="/signup"
                        className="text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] font-medium transition-colors"
                    >
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
}
