'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    loading: boolean;
    error: string | null;
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        profile: null,
        session: null,
        loading: true,
        error: null,
    });

    const fetchProfile = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('[Auth] Failed to fetch profile:', error.message);
            }
            return null;
        }
        return data as Profile;
    }, []);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    const profile = await fetchProfile(session.user.id);
                    setState({
                        user: session.user,
                        profile,
                        session,
                        loading: false,
                        error: null,
                    });
                } else {
                    setState({
                        user: null,
                        profile: null,
                        session: null,
                        loading: false,
                        error: null,
                    });
                }
            } catch (err) {
                setState((prev) => ({
                    ...prev,
                    loading: false,
                    error: err instanceof Error ? err.message : 'Auth initialization failed',
                }));
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    const profile = await fetchProfile(session.user.id);
                    setState({
                        user: session.user,
                        profile,
                        session,
                        loading: false,
                        error: null,
                    });
                } else if (event === 'SIGNED_OUT') {
                    setState({
                        user: null,
                        profile: null,
                        session: null,
                        loading: false,
                        error: null,
                    });
                } else if (event === 'TOKEN_REFRESHED' && session) {
                    setState((prev) => ({ ...prev, session }));
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    const signUp = useCallback(
        async (email: string, password: string, fullName: string) => {
            setState((prev) => ({ ...prev, loading: true, error: null }));
            try {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName },
                    },
                });

                if (error) throw error;
                return data;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Sign up failed';
                setState((prev) => ({ ...prev, loading: false, error: message }));
                throw err;
            }
        },
        []
    );

    const signIn = useCallback(async (email: string, password: string) => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            return data;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Sign in failed';
            setState((prev) => ({ ...prev, loading: false, error: message }));
            throw err;
        }
    }, []);

    const signOut = useCallback(async () => {
        setState((prev) => ({ ...prev, loading: true }));
        const { error } = await supabase.auth.signOut();
        if (error) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: error.message,
            }));
        }
    }, []);

    const resetPassword = useCallback(async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback`,
        });
        if (error) throw error;
    }, []);

    const updateProfile = useCallback(
        async (updates: Partial<Profile>) => {
            if (!state.user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', state.user.id)
                .select()
                .single();

            if (error) throw error;

            setState((prev) => ({ ...prev, profile: data as Profile }));
            return data;
        },
        [state.user]
    );

    return {
        ...state,
        isAuthenticated: !!state.user,
        isAdmin: state.profile?.role === 'admin',
        signUp,
        signIn,
        signOut,
        resetPassword,
        updateProfile,
    };
}
