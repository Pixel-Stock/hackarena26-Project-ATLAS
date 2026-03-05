'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { useAppStore } from '@/store/useAppStore';

/* ============================================================
   ATLAS — Admin Layout (protected)
   ============================================================ */

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { isAdmin, loading } = useAuth();
    const router = useRouter();
    const { sidebarOpen } = useAppStore();

    useEffect(() => {
        if (!loading && !isAdmin) {
            router.push('/dashboard');
        }
    }, [loading, isAdmin, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-purple)]" />
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="flex min-h-screen bg-[var(--bg-primary)]">
            <Sidebar />
            <main className="flex-1 transition-all duration-200" style={{ marginLeft: sidebarOpen ? 256 : 72 }}>
                <Navbar title="Admin Panel" />
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}
