import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  trialDaysLeft: number;
  isPro: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function calculateTrialDays(user: User | null): number {
  if (!user) return 0;
  const created = new Date(user.created_at);
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, 30 - elapsed);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    trialDaysLeft: 0,
    isPro: false,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setState(s => ({
        ...s,
        session,
        user,
        loading: false,
        trialDaysLeft: calculateTrialDays(user),
      }));
      if (user) checkSubscription(user.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setState(s => ({
        ...s,
        session,
        user,
        loading: false,
        trialDaysLeft: calculateTrialDays(user),
      }));
      if (user) checkSubscription(user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkSubscription(userId: string) {
    const { data } = await supabase
      .from('subscriptions')
      .select('status, plan')
      .eq('user_id', userId)
      .maybeSingle();
    
    setState(s => ({
      ...s,
      isPro: data?.status === 'active',
    }));
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider value={{ ...state, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}
