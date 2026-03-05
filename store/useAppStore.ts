import { create } from 'zustand';
import type { ThemeMode, TransactionFilters } from '@/types';

/* ============================================================
   ATLAS — Global State Store (Zustand)
   ============================================================ */

interface AppState {
    // Theme
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;

    // Sidebar
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    toggleSidebar: () => void;

    // Scanner state
    isScanning: boolean;
    scanProgress: string;
    setIsScanning: (scanning: boolean) => void;
    setScanProgress: (progress: string) => void;

    // Transaction filters
    filters: TransactionFilters;
    setFilters: (filters: Partial<TransactionFilters>) => void;
    resetFilters: () => void;

    // Notifications
    notifications: AppNotification[];
    addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp'>) => void;
    removeNotification: (id: string) => void;
    clearNotifications: () => void;
}

interface AppNotification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: number;
}

const DEFAULT_FILTERS: TransactionFilters = {
    search: '',
    categories: [],
    date_range: 'this_month',
    custom_date_range: null,
    amount_min: null,
    amount_max: null,
    sort_field: 'date',
    sort_direction: 'desc',
};

export const useAppStore = create<AppState>((set) => ({
    // Theme
    theme: 'dark',
    setTheme: (theme) => set({ theme }),

    // Sidebar
    sidebarOpen: true,
    setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    // Scanner
    isScanning: false,
    scanProgress: '',
    setIsScanning: (isScanning) => set({ isScanning }),
    setScanProgress: (scanProgress) => set({ scanProgress }),

    // Filters
    filters: DEFAULT_FILTERS,
    setFilters: (updates) =>
        set((state) => ({ filters: { ...state.filters, ...updates } })),
    resetFilters: () => set({ filters: DEFAULT_FILTERS }),

    // Notifications
    notifications: [],
    addNotification: (notif) =>
        set((state) => ({
            notifications: [
                ...state.notifications,
                {
                    ...notif,
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                },
            ],
        })),
    removeNotification: (id) =>
        set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
        })),
    clearNotifications: () => set({ notifications: [] }),
}));
