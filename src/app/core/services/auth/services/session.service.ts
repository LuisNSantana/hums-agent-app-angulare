/**
 * Session Service - Session management and authentication callbacks
 * Handles session changes, auth callbacks, and token management
 */

import { Injectable, inject } from '@angular/core';
import { SupabaseClient, Session, User, AuthError } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { 
  ISessionService, 
  AuthSessionResponse 
} from '../types/auth.types';
import { Database } from '../../../../shared/types/database.types';
import { supabaseConfig } from '../../../config/supabase.config';
import { AuthStateService } from './auth-state.service';
import { AuthDataMapper } from './auth-data-mapper.service';
import { ProfileService } from './profile.service';

@Injectable({
  providedIn: 'root'
})
export class SessionService implements ISessionService {
  private readonly supabase: SupabaseClient<Database>;
  private readonly authStateService = inject(AuthStateService);
  private readonly dataMapper = inject(AuthDataMapper);
  private readonly profileService = inject(ProfileService);

  constructor() {
    this.supabase = createClient<Database>(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      supabaseConfig.options
    );
  }

  /**
   * Handle session changes and update auth state
   */
  async handleSessionChange(session: Session | null): Promise<void> {
    this.authStateService.setLoading(true);
    this.authStateService.setError(null);

    if (session?.user) {
      try {
        // Ensure profile exists before mapping user (important for OAuth)
        await this.profileService.ensureUserProfile();
        
        const authUser = await this.dataMapper.mapUserFromSupabase(session.user);
        
        this.authStateService.updateAuthState({
          user: authUser,
          session,
          isAuthenticated: true,
          isLoading: false
        });
        
        this.authStateService.setUser(authUser);
        
        console.log('[SessionService] Session updated for user:', session.user.email);
      } catch (error) {
        console.error('[SessionService] Error mapping user:', error);
        this.authStateService.updateAuthState({
          error: 'Failed to load user profile',
          isLoading: false
        });
      }
    } else {
      this.authStateService.clearAuthState();
      console.log('[SessionService] Session cleared');
    }
  }

  /**
   * Handle authentication callback from URL fragments
   * Used for email verification and password reset flows
   */
  async handleAuthCallback(): Promise<AuthSessionResponse> {
    try {
      const { data, error } = await this.supabase.auth.getSession();
      
      if (error) {
        console.error('[SessionService] Auth callback error:', error);
        return { data: undefined, error: error.message };
      }

      if (data.session) {
        // The session change will be handled automatically by our auth state listener
        await this.handleSessionChange(data.session);
        
        // Ensure profile exists for authenticated user
        if (data.session.user) {
          await this.profileService.ensureUserProfile();
        }
      }

      return { 
        data: { 
          user: data.session?.user || null, 
          session: data.session 
        }, 
        error: null 
      };
    } catch (error) {
      console.error('[SessionService] Error handling auth callback:', error);
      const errorMessage = 'Failed to handle authentication callback';
      return { data: undefined, error: errorMessage };
    }
  }

  /**
   * Get current access token
   */
  async getAccessToken(): Promise<string | null> {
    const session = this.authStateService.getCurrentSession();
    return session?.access_token || null;
  }

  /**
   * Refresh current user data
   */
  async refreshUser(): Promise<void> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error) {
        console.error('[SessionService] Error refreshing user:', error);
        this.authStateService.setError('Failed to refresh user data');
        return;
      }

      if (user) {
        const currentSession = this.authStateService.getCurrentSession();
        await this.handleSessionChange(currentSession);
        console.log('[SessionService] User data refreshed');
      }
    } catch (error) {
      console.error('[SessionService] Failed to refresh user:', error);
      this.authStateService.setError('Failed to refresh user data');
    }
  }

  /**
   * Initialize session and set up auth state listener
   */
  async initializeSession(): Promise<void> {
    try {
      // Get initial session
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) {
        console.error('[SessionService] Error getting initial session:', error);
        this.authStateService.updateAuthState({ 
          error: error.message, 
          isLoading: false 
        });
        return;
      }

      // Update state with session
      await this.handleSessionChange(session);

      // Listen for auth changes
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[SessionService] Auth state change:', event, session?.user?.email);
        await this.handleSessionChange(session);
      });

      console.log('[SessionService] Session initialized successfully');
    } catch (error) {
      console.error('[SessionService] Failed to initialize session:', error);
      this.authStateService.updateAuthState({ 
        error: 'Failed to initialize authentication', 
        isLoading: false 
      });
    }
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error || !session) {
        return false;
      }

      // Check if token is still valid
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      
      return !userError && !!user;
    } catch {
      return false;
    }
  }

  /**
   * Get session expiry time
   */
  getSessionExpiry(): Date | null {
    const session = this.authStateService.getCurrentSession();
    if (!session?.expires_at) return null;
    
    return new Date(session.expires_at * 1000);
  }

  /**
   * Check if session is near expiry (within 5 minutes)
   */
  isSessionNearExpiry(): boolean {
    const expiry = this.getSessionExpiry();
    if (!expiry) return false;
    
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    return (expiry.getTime() - now.getTime()) < fiveMinutes;
  }

  /**
   * Refresh session if needed
   */
  async refreshSessionIfNeeded(): Promise<void> {
    if (this.isSessionNearExpiry()) {
      try {
        const { error } = await this.supabase.auth.refreshSession();
        if (error) {
          console.error('[SessionService] Failed to refresh session:', error);
        } else {
          console.log('[SessionService] Session refreshed successfully');
        }
      } catch (error) {
        console.error('[SessionService] Error refreshing session:', error);
      }
    }
  }
}
