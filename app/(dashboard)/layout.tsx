'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { useAppStore } from '@/store/useAppStore';

/* ============================================================
   ATLAS — Dashboard Layout
   Protected layout with sidebar and navbar
   ============================================================ */

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { sidebarOpen } = useAppStore();

    return (
        <div className="flex min-h-screen bg-[var(--bg-primary)]">
            <Sidebar />
            <main
                className="flex-1 transition-all duration-200"
                style={{ marginLeft: sidebarOpen ? 256 : 72 }}
            >
                <Navbar />
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}
