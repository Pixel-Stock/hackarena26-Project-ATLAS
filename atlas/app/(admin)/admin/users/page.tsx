'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { UsersTable } from '@/components/admin/StatsGrid';
import { supabase } from '@/lib/supabase/client';
import type { AdminUser } from '@/types';

/* ============================================================
   ATLAS — Admin: User Management
   ============================================================ */

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (profiles) {
                    // Get scan counts for each user
                    const userPromises = profiles.map(async (p) => {
                        const { count } = await supabase
                            .from('receipts')
                            .select('*', { count: 'exact', head: true })
                            .eq('user_id', p.id);

                        const { data: lastReceipt } = await supabase
                            .from('receipts')
                            .select('created_at')
                            .eq('user_id', p.id)
                            .order('created_at', { ascending: false })
                            .limit(1);

                        return {
                            id: p.id,
                            full_name: p.full_name,
                            email: p.email,
                            created_at: p.created_at,
                            scan_count: count ?? 0,
                            last_active: lastReceipt?.[0]?.created_at ?? null,
                            is_active: p.is_active ?? true,
                            role: p.role as 'user' | 'admin',
                        };
                    });

                    const resolvedUsers = await Promise.all(userPromises);
                    setUsers(resolvedUsers);
                }
            } catch {
                // Silently fail
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const handleToggleActive = useCallback(async (userId: string, isActive: boolean) => {
        await supabase
            .from('profiles')
            .update({ is_active: isActive })
            .eq('id', userId);

        setUsers(prev => prev.map(u =>
            u.id === userId ? { ...u, is_active: isActive } : u
        ));
    }, []);

    if (loading) {
        return <div className="h-96 rounded-2xl animate-shimmer" />;
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-[var(--accent-primary)]" />
                <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">User Management</h1>
            </div>
            <UsersTable users={users} onToggleActive={handleToggleActive} />
        </motion.div>
    );
}
