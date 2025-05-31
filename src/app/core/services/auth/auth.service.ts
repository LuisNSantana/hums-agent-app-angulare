/**
 * Auth Service - Main authentication facade
 * Orchestrates specialized auth services following SOLID principles
 * Maintains backward compatibility while providing clean architecture
 */

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Provider, AuthError, User } from '@supabase/supabase-js';

// Import specialized services
import { AuthStateService } from './services/auth-state.service';
import { AuthOperationsService } from './services/auth-operations.service';
import { AuthDataMapper } from './services/auth-data-mapper.service';
import { ProfileService } from './services/profile.service';
import { SessionService } from './services/session.service';

// Import types
import {
  AuthUser,
  AuthState,
  LoginCredentials,
  SignupCredentials,
  AuthResponse,
  AuthUserResponse,
  AuthSessionResponse,
  UserPreferences
} from './types/auth.types';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly router = inject(Router);
  
  // Inject specialized services
  private readonly authStateService = inject(AuthStateService);
  private readonly authOperationsService = inject(AuthOperationsService);
  private readonly authDataMapper = inject(AuthDataMapper);
  private readonly profileService = inject(ProfileService);
  private readonly sessionService = inject(SessionService);

  // Expose reactive state (backward compatibility)
  readonly authState = this.authStateService.authState;
  readonly user = this.authStateService.user;
  readonly session = this.authStateService.session;
  readonly isLoading = this.authStateService.isLoading;
  readonly isAuthenticated = this.authStateService.isAuthenticated;
  readonly error = this.authStateService.error;

  // Legacy Observable support
  readonly user$ = this.authStateService.user$;

  // Initialize auth promise
  private _initPromise: Promise<void>;
  get initialized(): Promise<void> {
    return this._initPromise;
  }

  constructor() {
    this._initPromise = this.initializeAuth();
  }

  /**
   * Initialize authentication system
   */
  private async initializeAuth(): Promise<void> {
    console.log('[AuthService] Initializing authentication system...');
    await this.sessionService.initializeSession();
    console.log('[AuthService] Authentication system initialized');
  }

  /**
   * Sign up with email and password
   */
  async signUp(credentials: SignupCredentials): Promise<{ user: User | null; error: string | null }> {
    const result = await this.authOperationsService.signUp(credentials);
    return {
      user: result.data || null,
      error: result.error
    };
  }

  /**
   * Sign in with email and password
   */
  async signIn(credentials: LoginCredentials): Promise<{ user: User | null; error: string | null }> {
    const result = await this.authOperationsService.signIn(credentials);
    return {
      user: result.data || null,
      error: result.error
    };
  }

  /**
   * Sign in with magic link
   */
  async signInWithMagicLink(email: string, redirectTo?: string): Promise<{ error: string | null }> {
    return await this.authOperationsService.signInWithMagicLink(email, redirectTo);
  }

  /**
   * Sign in with social provider
   */
  async signInWithProvider(provider: Provider, redirectTo?: string): Promise<{ error: string | null }> {
    return await this.authOperationsService.signInWithProvider(provider, redirectTo);
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    await this.authOperationsService.signOut();
  }

  /**
   * Reset password
   */
  async resetPassword(email: string, redirectTo?: string): Promise<{ error: string | null }> {
    return await this.authOperationsService.resetPassword(email, redirectTo);
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    return await this.authOperationsService.updatePassword(newPassword);
  }

  /**
   * Resend email confirmation
   */
  async resendConfirmation(email: string): Promise<{ error: string | null }> {
    return await this.authOperationsService.resendConfirmation(email);
  }

  /**
   * Update user email
   */
  async updateEmail(newEmail: string): Promise<{ error: string | null }> {
    return await this.authOperationsService.updateEmail(newEmail);
  }

  // ===================
  // PROFILE MANAGEMENT
  // ===================

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<AuthUser>): Promise<{ error: string | null }> {
    const result = await this.profileService.updateProfile(updates);
    
    // Refresh user data after successful update
    if (!result.error) {
      await this.sessionService.refreshUser();
    }
    
    return result;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<{ error: string | null }> {
    const result = await this.profileService.updatePreferences(preferences);
    
    // Refresh user data after successful update
    if (!result.error) {
      await this.sessionService.refreshUser();
    }
    
    return result;
  }

  /**
   * Ensure user profile exists
   */
  async ensureUserProfile(): Promise<void> {
    await this.profileService.ensureUserProfile();
  }

  // ===================
  // SESSION MANAGEMENT
  // ===================

  /**
   * Handle authentication callback
   */
  async handleAuthCallback(): Promise<{ data: { user: User | null; session: any | null } | null; error: AuthError | null }> {
    const result = await this.sessionService.handleAuthCallback();
    return {
      data: result.data !== undefined ? result.data : null,
      error: result.error ? { message: result.error } as AuthError : null
    };
  }

  /**
   * Get current access token
   */
  async getAccessToken(): Promise<string | null> {
    return await this.sessionService.getAccessToken();
  }

  /**
   * Refresh current user data
   */
  async refreshUser(): Promise<void> {
    await this.sessionService.refreshUser();
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<boolean> {
    return await this.sessionService.validateSession();
  }

  /**
   * Check if session is near expiry
   */
  isSessionNearExpiry(): boolean {
    return this.sessionService.isSessionNearExpiry();
  }

  /**
   * Refresh session if needed
   */
  async refreshSessionIfNeeded(): Promise<void> {
    await this.sessionService.refreshSessionIfNeeded();
  }

  // ===================
  // LEGACY COMPATIBILITY
  // ===================

  /**
   * Get current user (alias for user signal)
   */
  currentUser = this.user;

  /**
   * Create user profile (legacy method)
   */
  private async createUserProfile(user: User, displayName?: string): Promise<void> {
    await this.profileService.createUserProfile(user, displayName);
  }

  /**
   * Create user profile from OAuth (legacy method)
   */
  private async createUserProfileFromOAuth(user: User): Promise<void> {
    await this.profileService.createUserProfileFromOAuth(user);
  }

  /**
   * Map user from Supabase (legacy method)
   */
  private async mapUserFromSupabase(user: User): Promise<AuthUser> {
    return await this.authDataMapper.mapUserFromSupabase(user);
  }

  /**
   * Update auth state (legacy method)
   */
  private updateAuthState(updates: Partial<AuthState>): void {
    this.authStateService.updateAuthState(updates);
  }

  /**
   * Handle session change (legacy method)
   */
  private async handleSessionChange(session: any): Promise<void> {
    await this.sessionService.handleSessionChange(session);
  }

  // ===================
  // UTILITY METHODS
  // ===================

  /**
   * Get user profile by ID
   * @param userId - The user ID to fetch profile for
   * @returns Promise<{ data: any; error: string | null }>
   * @example
   *   const { data, error } = await authService.getProfile('user-123');
   */
  async getProfile(userId: string): Promise<{ data: any; error: string | null }> {
    return await this.profileService.getProfile(userId);
  }

  /**
   * Check if user is authenticated
   * @returns boolean - true if user is authenticated, false otherwise
   */
  isUserAuthenticated(): boolean {
    return this.isAuthenticated();
  }

  /**
   * Get current user ID
   * @returns string | null - The current user ID or null if not authenticated
   */
  getCurrentUserId(): string | null {
    return this.user()?.id || null;
  }

  /**
   * Get current user email
   * @returns string | null - The current user email or null if not authenticated
   */
  getCurrentUserEmail(): string | null {
    return this.user()?.email || null;
  }

  /**
   * Check if email is confirmed
   * @returns boolean - true if email is confirmed, false otherwise
   */
  isEmailConfirmed(): boolean {
    return this.user()?.emailConfirmed || false;
  }

  /**
   * Get user preferences
   * @returns UserPreferences | undefined - The user preferences if available
   */
  getUserPreferences(): UserPreferences | undefined {
    return this.user()?.preferences;
  }

  /**
   * Get default preferences
   * @returns UserPreferences - The default user preferences
   */
  getDefaultPreferences(): UserPreferences {
    return this.authDataMapper.getDefaultPreferences();
  }
}
