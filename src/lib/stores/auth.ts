import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase } from '../supabase.js';
import type { User, Session } from '@supabase/supabase-js';

// Auth state stores
export const user = writable<User | null>(null);
export const session = writable<Session | null>(null);
export const loading = writable(true);

// Initialize auth state management
if (browser) {
  // Get initial session
  supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
    session.set(initialSession);
    user.set(initialSession?.user ?? null);
    loading.set(false);
  });

  // Listen for auth changes
  supabase.auth.onAuthStateChange((_event, newSession) => {
    session.set(newSession);
    user.set(newSession?.user ?? null);
    loading.set(false);
  });
}

// Auth helper functions
export const authHelpers = {
  // Sign in with email and password
  async signInWithPassword(email: string, password: string) {
    loading.set(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    loading.set(false);
    return { data, error };
  },

  // Sign up with email and password
  async signUp(email: string, password: string) {
    loading.set(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    loading.set(false);
    return { data, error };
  },

  // Sign out
  async signOut() {
    loading.set(true);
    const { error } = await supabase.auth.signOut();
    if (!error) {
      session.set(null);
      user.set(null);
    }
    loading.set(false);
    return { error };
  },

  // Reset password
  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: browser ? `${window.location.origin}/auth/reset` : undefined,
    });
    return { data, error };
  },
};

// Derived stores for common auth checks
export const isAuthenticated = writable(false);
export const isLoading = writable(true);

// Update derived stores when session changes
session.subscribe((currentSession) => {
  isAuthenticated.set(!!currentSession);
});

loading.subscribe((isCurrentlyLoading) => {
  isLoading.set(isCurrentlyLoading);
});