import type { Metadata } from 'next';
import './globals.css';

/* ============================================================
   ATLAS — Root Layout
   ============================================================ */

export const metadata: Metadata = {
  title: 'ATLAS — Snap it. Forget it. Know everything.',
  description:
    'AI-powered expense intelligence platform. Scan receipts, track spending, and unlock insights into your financial habits.',
  keywords: ['expense tracker', 'receipt scanner', 'AI', 'OCR', 'finance'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className="font-body antialiased min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}
