"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Camera,
    Tag,
    BarChart3,
    Upload,
    FileSearch,
    FolderOpen,
    LineChart,
    Sparkles,
} from "lucide-react";

const Vortex = dynamic(() => import("@/components/ui/vortex"), { ssr: false });

/* ─── data ─────────────────────────────────────────── */
const features = [
    {
        icon: Camera,
        title: "Receipt Scanning",
        description:
            "Upload receipts and let AI extract merchant, amount, date, and category automatically.",
    },
    {
        icon: Tag,
        title: "Smart Categorization",
        description:
            "Transactions are intelligently sorted into categories for a clear spending breakdown.",
    },
    {
        icon: BarChart3,
        title: "Analytics Dashboard",
        description:
            "Interactive charts and insights to understand your spending patterns at a glance.",
    },
];

const steps = [
    { icon: Upload, label: "Upload Receipt", description: "Snap a photo or upload an image of your receipt." },
    { icon: FileSearch, label: "Extract Data", description: "AI reads and extracts key info from the receipt." },
    { icon: FolderOpen, label: "Categorize Expense", description: "The transaction is auto-categorized for you." },
    { icon: LineChart, label: "View Analytics", description: "See real-time charts and spending insights." },
];

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
    }, []);
    return isMobile;
}

/* ─── component ────────────────────────────────────── */
export default function LandingPage() {
    const isMobile = useIsMobile();

    return (
        <main className="relative z-0 min-h-screen bg-background text-foreground overflow-hidden">
            {/* ── Animated Background ─────────────────── */}
            <div
                className="fixed inset-0 z-0 opacity-[0.03]"
                style={{
                    backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
                    backgroundSize: "32px 32px",
                }}
            />
            <div
                className="fixed top-[-20%] left-[-10%] z-0 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
                style={{
                    background: `radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)`,
                    animation: "float1 12s ease-in-out infinite",
                }}
            />
            <div
                className="fixed bottom-[-15%] right-[-5%] z-0 w-[500px] h-[500px] rounded-full opacity-15 blur-[100px]"
                style={{
                    background: `radial-gradient(circle, hsl(var(--primary) / 0.3), transparent 70%)`,
                    animation: "float2 15s ease-in-out infinite",
                }}
            />
            <div
                className="fixed top-1/3 left-1/2 -translate-x-1/2 z-0 w-[800px] h-[500px] rounded-full opacity-10 blur-[140px]"
                style={{
                    background: `radial-gradient(ellipse, hsl(var(--primary) / 0.5), transparent 60%)`,
                }}
            />

            {/* ── Navbar ─────────────────────────────── */}
            <nav className="relative sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
                <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <img src="/logo.png" alt="SnapBudget" className="w-8 h-8 rounded-full object-cover shadow group-hover:shadow-md transition-shadow" />
                        <span className="font-bold text-lg tracking-tight">
                            Snap<span className="text-primary">Budget</span>
                        </span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <Link href="/signin">
                            <Button variant="ghost" size="sm">Sign In</Button>
                        </Link>
                        <Link href="/signup">
                            <Button size="sm">Create Account</Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── Hero Section ───────────────────────── */}
            <section className="relative z-10 overflow-hidden">
                {/* ── Hero Vortex Overlay ── */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <Vortex
                        baseHue={22}
                        particleCount={isMobile ? 150 : 350}
                        rangeY={100}
                        baseSpeed={0.0}
                        rangeSpeed={0.9}
                        baseRadius={1}
                        rangeRadius={2}
                        containerClassName="w-full h-full"
                        className="w-full h-full"
                    />
                </div>

                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent z-0" />
                <div
                    className="relative max-w-[1200px] mx-auto px-6 text-center"
                    style={{ paddingTop: "120px", paddingBottom: "80px" }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
                        <Sparkles className="h-4 w-4" />
                        AI-Powered Expense Tracking
                    </div>

                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight">
                        Snap<span className="text-primary">Budget</span>
                    </h1>

                    <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Smart expense tracking with AI-powered receipt scanning.
                        <br className="hidden sm:block" />
                        Track spending, set budgets, and gain insights —
                        <br className="hidden sm:block" />
                        all in one beautiful dashboard.
                    </p>
                </div>
            </section>

            {/* ── Features Section ────────────────────── */}
            <section className="relative z-10 max-w-[1200px] mx-auto px-6 py-20">
                <div className="text-center mb-14">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                        Everything you need to manage expenses
                    </h2>
                    <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
                        Powerful features designed to make tracking your finances effortless.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {features.map((f) => (
                        <Card key={f.title} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardContent className="relative p-8">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                                    <f.icon className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* ── How It Works ────────────────────────── */}
            <section className="relative z-10 bg-muted/30 py-20">
                <div className="max-w-[1200px] mx-auto px-6">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">How It Works</h2>
                        <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
                            From receipt to insight in four simple steps.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {steps.map((s, i) => (
                            <div key={s.label} className="text-center group">
                                <div className="relative mx-auto w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:border-primary/50 transition-all duration-300 mb-5">
                                    <s.icon className="h-7 w-7 text-primary" />
                                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow">
                                        {i + 1}
                                    </span>
                                </div>
                                <h3 className="font-semibold mb-1">{s.label}</h3>
                                <p className="text-sm text-muted-foreground">{s.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ─────────────────────────────────── */}
            <section className="relative z-10 max-w-[1200px] mx-auto px-6 py-24 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                    Start Tracking Your Expenses Today
                </h2>
                <p className="mt-4 text-muted-foreground text-lg max-w-lg mx-auto">
                    Join SnapBudget and take control of your finances with smart analytics.
                </p>
            </section>
        </main>
    );
}
