/**
 * Authentication Models - Domain entities for authentication and user management
 * Following Domain Driven Design principles
 */

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  emailConfirmed: boolean;
  lastSignIn?: Date;
  createdAt: Date;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  defaultModel?: string;
  notifications: {
    email: boolean;
    browser: boolean;
    updates: boolean;
  };
  chat?: ChatPreferences;
}

export interface ChatPreferences {
  defaultTemperature: number;
  defaultMaxTokens: number;
  autoScroll: boolean;
  showTokenCount: boolean;
  showTimestamps: boolean;
  codeHighlighting: boolean;
  mathRendering: boolean;
}

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

export interface AuthState {
  user: AuthUser | null;
  session: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface AuthError {
  message: string;
  code?: string;
  details?: any;
}

export interface PasswordResetRequest {
  email: string;
  redirectTo?: string;
}

export interface PasswordUpdateRequest {
  newPassword: string;
  confirmPassword: string;
}

export interface ProfileUpdateRequest {
  displayName?: string;
  avatarUrl?: string;
  preferences?: Partial<UserPreferences>;
}

// Social provider types for better type safety
export type SocialProvider = 
  | 'google'
  | 'github'
  | 'discord'
  | 'apple'
  | 'azure'
  | 'facebook'
  | 'linkedin'
  | 'twitter';

export interface SocialAuthOptions {
  provider: SocialProvider;
  redirectTo?: string;
  scopes?: string[];
}

// Auth event types for tracking
export type AuthEventType = 
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY'
  | 'USER_DELETED';

export interface AuthEvent {
  type: AuthEventType;
  timestamp: Date;
  userId?: string;
  details?: any;
}
