"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDataStore } from "@/lib/data-store";
import {
    LayoutDashboard,
    Receipt,
    Tag,
    Wallet,
    TrendingUp,
    Lightbulb,
    Camera,
    User,
    Menu,
    X,
    Sun,
    Moon,
} from "lucide-react";

// sidebar navigation items
const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/transactions", label: "Transactions", icon: Receipt },
    { href: "/categories", label: "Categories", icon: Tag },
    { href: "/budgets", label: "Budgets", icon: Wallet },
    { href: "/trends", label: "Trends", icon: TrendingUp },
    { href: "/insights", label: "Insights", icon: Lightbulb },
    { href: "/receipts", label: "Receipts", icon: Camera },

    { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user } = useDataStore();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isDark, setIsDark] = useState(true);

    // apply dark mode on initial mount
    useEffect(() => {
        document.documentElement.classList.add("dark");
    }, []);

    // toggle dark mode
    const toggleTheme = () => {
        const newDark = !isDark;
        setIsDark(newDark);
        document.documentElement.classList.toggle("dark", newDark);
    };

    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* logo */}
            <div className="p-6">
                <Link href="/dashboard" className="flex items-center gap-3 group">
                    <img src="/logo.png" alt="SnapBudget" className="w-9 h-9 rounded-full object-cover shadow-md group-hover:shadow-lg transition-shadow" />
                    <div>
                        <h1 className="font-bold text-lg text-sidebar-foreground tracking-tight">SnapBudget</h1>
                        <p className="text-[10px] text-muted-foreground -mt-0.5">Expense Analytics</p>
                    </div>
                </Link>
            </div>

            <Separator className="mx-4 w-auto" />

            {/* navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                            )}
                        >
                            <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
                            {item.label}
                            {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <Separator className="mx-4 w-auto" />

            {/* bottom section - theme toggle + user */}
            <div className="p-4 space-y-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleTheme}
                    className="w-full justify-start gap-3 text-sidebar-foreground"
                >
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {isDark ? "Light Mode" : "Dark Mode"}
                </Button>

                <div className="flex items-center gap-3 px-2">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                            {user.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* mobile hamburger */}
            <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-card border border-border shadow-md"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
            >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* mobile overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* sidebar - desktop */}
            <aside className="hidden lg:flex lg:w-[260px] lg:flex-shrink-0 h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
                {sidebarContent}
            </aside>

            {/* sidebar - mobile */}
            <aside
                className={cn(
                    "lg:hidden fixed inset-y-0 left-0 z-40 w-[260px] bg-sidebar border-r border-sidebar-border transform transition-transform duration-300",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {sidebarContent}
            </aside>
        </>
    );
}
