'use client';

// ==============================================================================
// YUKI WEB V4 — AUTH CONTEXT PROVIDER (SLIDING PERSISTENCE + MULTI-TAB SYNC)
// ==============================================================================

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { AppRole, UserProfile } from '@/types/auth';
import type { WalletAccount } from '@/types/wallet';
import type { UserMembership } from '@/types/membership';

interface AuthContextValue {
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
  role: AppRole;
  wallet: WalletAccount | null;
  membership: UserMembership | null;
  lifetimeDeposit: number;
  isLoading: boolean;
  refreshUserData: () => Promise<void>;
  signOut: () => Promise<void>;
  signOutAllDevices: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTH_CHANNEL_NAME = 'yuki_auth_sync';
const AUTH_EVENT_STORAGE_KEY = 'yuki_auth_event';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole>('USER');
  const [wallet, setWallet] = useState<WalletAccount | null>(null);
  const [membership, setMembership] = useState<UserMembership | null>(null);
  const [lifetimeDeposit, setLifetimeDeposit] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const lastSyncRef = useRef<number>(0);

  const applyUserData = useCallback((u: any) => {
    setUser({ id: u.id, email: u.email || `${u.username || 'user'}@user.internal` });
    setLifetimeDeposit(Number(u.lifetimeDeposit) || 0);
    setProfile({
      id: u.id,
      email: u.email || '',
      fullName: u.fullName || u.username || 'Người dùng',
      avatarUrl: u.avatarUrl || '/assets/icons/system/avatar_businessman.svg',
      telegramUsername: u.telegramId || '',
      phoneNumber: u.phone || '',
      phone: u.phone || '',
      telegramId: u.telegramId || '',
      referralCode: u.referralCode || u.referral_code || null,
      referredBy: u.referredBy || u.referred_by || null,
      referralEarnings: Number(u.referralEarnings || u.referral_earnings || 0),
      cashbackPoints: Number(u.cashbackPoints || 0),
      totalCashbackEarned: Number(u.totalCashbackEarned || 0),
      affiliateBalance: Number(u.affiliateBalance || 0),
      savedProfiles: Array.isArray(u.savedProfiles) ? u.savedProfiles : [],
      termsAcceptedAt: u.createdAt || new Date().toISOString(),
      isActive: true,
      createdAt: u.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const isAdmin = u.role?.toLowerCase() === 'admin';

    setRole(isAdmin ? 'ADMIN' : 'USER');
    setWallet({
      userId: u.id,
      balance: Number(u.balance) || 0,
      currency: 'VND',
      isLocked: false,
      createdAt: u.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const clearClientAuthState = useCallback(() => {
    setUser(null);
    setProfile(null);
    setRole('USER');
    setWallet(null);
    setMembership(null);
    setLifetimeDeposit(0);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('yuki_user');
      } catch {}
    }
  }, []);

  const broadcastAuthEvent = useCallback((type: 'LOGIN' | 'LOGOUT') => {
    if (typeof window === 'undefined') return;
    const payload = { type, ts: Date.now() };
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel(AUTH_CHANNEL_NAME);
        ch.postMessage(payload);
        ch.close();
      }
    } catch {}
    try {
      localStorage.setItem(AUTH_EVENT_STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, []);

  const refreshUserData = useCallback(async () => {
    try {
      lastSyncRef.current = Date.now();
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          applyUserData(data.user);
          if (typeof window !== 'undefined') {
            localStorage.setItem('yuki_user', JSON.stringify(data.user));
          }
          return;
        }
      } else if (res.status === 401) {
        clearClientAuthState();
        return;
      }
    } catch (e) {
      console.warn('refreshUserData notice:', e);
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('yuki_user');
      if (stored) {
        try {
          applyUserData(JSON.parse(stored));
        } catch {}
      }
    }
  }, [applyUserData, clearClientAuthState]);

  useEffect(() => {
    let active = true;

    const init = async () => {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('yuki_user');
        if (cached) {
          try {
            applyUserData(JSON.parse(cached));
          } catch {
            localStorage.removeItem('yuki_user');
          }
        }
      }

      try {
        lastSyncRef.current = Date.now();
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!active) return;

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            applyUserData(data.user);
            if (typeof window !== 'undefined') {
              localStorage.setItem('yuki_user', JSON.stringify(data.user));
            }
          }
        } else if (res.status === 401) {
          clearClientAuthState();
        }
      } catch (err) {
        console.warn('Init auth check notice:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    init();

    // Cross-tab auth synchronization via BroadcastChannel & storage event
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
        channel.onmessage = (event) => {
          if (event.data?.type === 'LOGOUT') {
            clearClientAuthState();
          } else if (event.data?.type === 'LOGIN') {
            refreshUserData();
          }
        };
      }
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === AUTH_EVENT_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.type === 'LOGOUT') {
            clearClientAuthState();
          } else if (parsed?.type === 'LOGIN') {
            refreshUserData();
          }
        } catch {}
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastSyncRef.current > 30000) {
        refreshUserData();
      }
    };

    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (channel) {
        try {
          channel.close();
        } catch {}
      }
    };
  }, [applyUserData, clearClientAuthState, refreshUserData]);

  const performSignOut = useCallback(
    async (allDevices: boolean) => {
      try {
        await fetch('/api/auth/logout', {
        cache: 'no-store',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ allDevices }),
        }).catch(() => {});

        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('yuki_user');
          } catch {}
          broadcastAuthEvent('LOGOUT');
        }
      } catch (err) {
        console.warn('SignOut error:', err);
      } finally {
        clearClientAuthState();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    },
    [broadcastAuthEvent, clearClientAuthState]
  );

  const signOut = useCallback(() => performSignOut(false), [performSignOut]);
  const signOutAllDevices = useCallback(() => performSignOut(true), [performSignOut]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        wallet,
        membership,
        lifetimeDeposit,
        isLoading,
        refreshUserData,
        signOut,
        signOutAllDevices,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
