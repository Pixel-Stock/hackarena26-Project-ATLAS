'use client';

import { Badge } from '@/components/ui';
import { Card, CardHeader, CardTitle } from '@/components/ui';
import { formatDate } from '@/lib/utils/formatting';
import type { AdminUser } from '@/types';

/* ============================================================
   ATLAS — Admin: StatsGrid + UsersTable Components
   ============================================================ */

interface StatsGridProps {
    stats: {
        label: string;
        value: string | number;
        subtitle?: string;
    }[];
}

export function StatsGrid({ stats }: StatsGridProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
                <Card key={stat.label} padding="md">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                        {stat.label}
                    </p>
                    <p className="text-2xl font-display font-bold text-[var(--text-primary)] mt-2">
                        {stat.value}
                    </p>
                    {stat.subtitle && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                            {stat.subtitle}
                        </p>
                    )}
                </Card>
            ))}
        </div>
    );
}

interface UsersTableProps {
    users: AdminUser[];
    onToggleActive: (userId: string, isActive: boolean) => void;
}

export function UsersTable({ users, onToggleActive }: UsersTableProps) {
    return (
        <Card padding="none">
            <CardHeader className="px-6 pt-6">
                <CardTitle>User Management</CardTitle>
                <span className="text-sm text-[var(--text-muted)]">
                    {users.length} users
                </span>
            </CardHeader>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--border-subtle)]">
                            {['Name', 'Email', 'Joined', 'Scans', 'Last Active', 'Role', 'Status', 'Actions'].map(
                                (h) => (
                                    <th
                                        key={h}
                                        className="text-left py-3 px-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider"
                                    >
                                        {h}
                                    </th>
                                )
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                        {users.map((user) => (
                            <tr
                                key={user.id}
                                className="hover:bg-[var(--bg-elevated)]/50 transition-colors"
                            >
                                <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                                    {user.full_name}
                                </td>
                                <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                                    {user.email}
                                </td>
                                <td className="py-3 px-4 text-xs text-[var(--text-muted)]">
                                    {formatDate(user.created_at, 'short')}
                                </td>
                                <td className="py-3 px-4 text-sm font-mono text-[var(--text-primary)]">
                                    {user.scan_count}
                                </td>
                                <td className="py-3 px-4 text-xs text-[var(--text-muted)]">
                                    {user.last_active
                                        ? formatDate(user.last_active, 'relative')
                                        : 'Never'}
                                </td>
                                <td className="py-3 px-4">
                                    <Badge
                                        variant={user.role === 'admin' ? 'purple' : 'default'}
                                        size="sm"
                                    >
                                        {user.role}
                                    </Badge>
                                </td>
                                <td className="py-3 px-4">
                                    <Badge
                                        variant={user.is_active ? 'success' : 'error'}
                                        size="sm"
                                    >
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </td>
                                <td className="py-3 px-4">
                                    <button
                                        onClick={() => onToggleActive(user.id, !user.is_active)}
                                        className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors"
                                    >
                                        {user.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {users.length === 0 && (
                <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                    No users found
                </div>
            )}
        </Card>
    );
}
