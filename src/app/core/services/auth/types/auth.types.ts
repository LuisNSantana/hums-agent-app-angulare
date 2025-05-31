/**
 * Auth Types - Shared interfaces and types for authentication system
 * Centralized type definitions following DRY principles
 */

import { User, Session, AuthError, Provider } from '@supabase/supabase-js';
import { Json } from '../../../../shared/types/database.types';

// Core Auth Models
export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  nickname?: string; // Added nickname
  avatarUrl?: string;
  bio?: string; // Added bio
  emailConfirmed: boolean;
  lastSignIn?: Date;
  createdAt: Date;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string; // Already exists, can be used for preferredLanguage
  defaultModel?: string;
  communicationStyle?: 'formal' | 'informal' | 'neutral'; // Added communicationStyle
  interests?: string[]; // Added interests
  notifications: {
    email: boolean;
    browser: boolean;
    updates: boolean;
  };
  [key: string]: any; // Index signature for Json compatibility
}

// Auth State
export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// Credentials
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  displayName?: string;
  redirectTo?: string;
}

// Response Types
export interface AuthResponse<T = any> {
  data?: T;
  error: string | null;
}

export interface AuthUserResponse extends AuthResponse<User> {
  data?: User;
}

export interface AuthSessionResponse extends AuthResponse<{ user: User | null; session: Session | null }> {
  data?: { user: User | null; session: Session | null };
}

// Service Interfaces for Dependency Injection
export interface IAuthStateService {
  readonly authState: any; // Signal type
  readonly user: any;
  readonly session: any;
  readonly isLoading: any;
  readonly isAuthenticated: any;
  readonly error: any;
  
  updateAuthState(updates: Partial<AuthState>): void;
  setUser(user: AuthUser | null): void;
}

export interface IAuthDataMapper {
  mapUserFromSupabase(user: User, profile?: any): Promise<AuthUser>;
  parseUserPreferences(preferences: Json | null | undefined): UserPreferences | undefined;
}

export interface IProfileService {
  ensureUserProfile(): Promise<void>;
  createUserProfile(user: User, displayName?: string): Promise<void>;
  createUserProfileFromOAuth(user: User): Promise<void>;
  updateProfile(updates: Partial<AuthUser>): Promise<AuthResponse>;
}

export interface ISessionService {
  handleSessionChange(session: Session | null): Promise<void>;
  handleAuthCallback(): Promise<AuthSessionResponse>;
  getAccessToken(): Promise<string | null>;
  refreshUser(): Promise<void>;
}

export interface IAuthOperationsService {
  signUp(credentials: SignupCredentials): Promise<AuthUserResponse>;
  signIn(credentials: LoginCredentials): Promise<AuthUserResponse>;
  signInWithMagicLink(email: string, redirectTo?: string): Promise<AuthResponse>;
  signInWithProvider(provider: Provider, redirectTo?: string): Promise<AuthResponse>;
  signOut(): Promise<void>;
  resetPassword(email: string, redirectTo?: string): Promise<AuthResponse>;
  updatePassword(newPassword: string): Promise<{ error: AuthError | null }>;
  resendConfirmation(email: string): Promise<AuthResponse>;
}

// OAuth Provider Types
export type SupportedProvider = 'github' | 'google' | 'discord';

// Profile Creation Options
export interface ProfileCreationOptions {
  displayName?: string;
  avatarUrl?: string;
  preferences?: Partial<UserPreferences>;
}
