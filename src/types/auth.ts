// ==============================================================================
// YUKI WEB V4 — AUTH & USER TYPES
// ==============================================================================

import type { LocalSavedProfile } from '@/lib/server-store';

export type AppRole = 'USER' | 'ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  telegramUsername: string | null;
  phoneNumber: string | null;
  phone?: string | null;
  telegramId?: string | null;
  referralCode?: string | null;
  referredBy?: string | null;
  referralEarnings?: number;
  cashbackPoints?: number;
  totalCashbackEarned?: number;
  affiliateBalance?: number;
  savedProfiles?: LocalSavedProfile[];
  termsAcceptedAt?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserRoleRecord {
  id: string;
  userId: string;
  role: AppRole;
  assignedBy: string | null;
  createdAt: string;
}

export interface UserSettings {
  userId: string;
  themePreference: 'dark' | 'light' | 'system';
  emailNotificationsEnabled: boolean;
  telegramNotificationsEnabled: boolean;
  updatedAt: string;
}

export interface AuthSessionUser {
  id: string;
  email: string;
  role: AppRole;
  profile: UserProfile;
}
