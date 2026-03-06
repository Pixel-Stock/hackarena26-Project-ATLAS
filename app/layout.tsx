import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { LayoutWrapper } from "@/components/layout-wrapper";

export const metadata: Metadata = {
    title: "SnapBudget — Smart Expense Analytics",
    description:
        "Track spending, set budgets, categorize expenses, and analyze your financial behavior with interactive charts. Built by Team ATLAS.",
    keywords: ["expense tracker", "budget", "analytics", "finance", "SnapBudget"],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <body className="min-h-screen bg-background antialiased">
                <Providers>
                    <LayoutWrapper>
                        {children}
                    </LayoutWrapper>
                </Providers>
            </body>
        </html>
    );
}

