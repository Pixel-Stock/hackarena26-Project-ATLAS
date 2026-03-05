'use client';

import { useState } from 'react';
import { User, Palette, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeMode } from '@/types';

/* ============================================================
   ATLAS — Settings Page
   ============================================================ */

export default function SettingsPage() {
    const { profile, updateProfile } = useAuth();
    const { theme, setTheme } = useTheme();
    const [fullName, setFullName] = useState(profile?.full_name ?? '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateProfile({ full_name: fullName, theme_preference: theme });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch {
            // error handled in hook
        } finally {
            setSaving(false);
        }
    };

    const themeOptions: { value: ThemeMode; label: string; description: string }[] = [
        { value: 'dark', label: 'Dark', description: 'Easy on the eyes' },
        { value: 'light', label: 'Light', description: 'Classic bright mode' },
        { value: 'system', label: 'System', description: 'Match your OS' },
    ];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Settings</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Manage your profile and preferences</p>
            </div>

            {/* Profile */}
            <Card padding="md">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-[var(--accent-primary)]" />
                        <CardTitle>Profile</CardTitle>
                    </div>
                </CardHeader>
                <div className="space-y-4">
                    <Input
                        label="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                    />
                    <Input
                        label="Email"
                        value={profile?.email ?? ''}
                        disabled
                        hint="Email cannot be changed"
                    />
                </div>
            </Card>

            {/* Theme */}
            <Card padding="md">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Palette className="h-5 w-5 text-[var(--accent-purple)]" />
                        <CardTitle>Appearance</CardTitle>
                    </div>
                </CardHeader>
                <div className="grid grid-cols-3 gap-3">
                    {themeOptions.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setTheme(opt.value)}
                            className={`p-4 rounded-xl border text-left transition-all ${theme === opt.value
                                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                                    : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                                }`}
                        >
                            <p className="text-sm font-medium text-[var(--text-primary)]">{opt.label}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">{opt.description}</p>
                        </button>
                    ))}
                </div>
            </Card>

            {/* Save */}
            <div className="flex items-center justify-end gap-3">
                {saved && (
                    <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-sm text-emerald-400"
                    >
                        ✓ Saved
                    </motion.span>
                )}
                <Button
                    onClick={handleSave}
                    loading={saving}
                    icon={<Save className="h-4 w-4" />}
                >
                    Save Changes
                </Button>
            </div>
        </motion.div>
    );
}
