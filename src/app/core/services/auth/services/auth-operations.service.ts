/**
 * Auth Operations Service - Core authentication operations
 * Handles sign up, sign in, sign out, OAuth, and password operations
 */

import { Injectable, inject } from '@angular/core';
import { SupabaseClient, Provider, AuthError, User, VerifyOtpParams } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { 
  IAuthOperationsService,
  LoginCredentials,
  SignupCredentials,
  AuthResponse,
  AuthUserResponse
} from '../types/auth.types';
import { Database } from '../../../../shared/types/database.types';
import { supabaseConfig } from '../../../config/supabase.config';
import { AuthStateService } from './auth-state.service';
import { ProfileService } from './profile.service';

@Injectable({
  providedIn: 'root'
})
export class AuthOperationsService implements IAuthOperationsService {
  private readonly supabase: SupabaseClient<Database>;
  private readonly authStateService = inject(AuthStateService);
  private readonly profileService = inject(ProfileService);

  constructor() {
    this.supabase = createClient<Database>(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      supabaseConfig.options
    );
  }

  /**
   * Sign up with email and password
   */
  async signUp(credentials: SignupCredentials): Promise<AuthUserResponse> {
    try {
      this.authStateService.setLoading(true);
      this.authStateService.setError(null);

      const { data, error } = await this.supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            display_name: credentials.displayName
          },
          emailRedirectTo: credentials.redirectTo
        }
      });

      if (error) {
        this.authStateService.updateAuthState({ 
          error: error.message, 
          isLoading: false 
        });
        return { data: undefined, error: error.message };
      }

      // Create profile in our profiles table
      if (data.user) {
        try {
          await this.profileService.createUserProfile(data.user, credentials.displayName);
          console.log('[AuthOperationsService] User profile created for:', data.user.email);
        } catch (profileError) {
          console.error('[AuthOperationsService] Failed to create profile:', profileError);
          // Don't fail the signup if profile creation fails
        }
      }

      this.authStateService.setLoading(false);
      return { data: data.user || undefined, error: null };

    } catch (error) {
      const errorMessage = 'Failed to create account. Please try again.';
      this.authStateService.updateAuthState({ 
        error: errorMessage, 
        isLoading: false 
      });
      return { data: undefined, error: errorMessage };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(credentials: LoginCredentials): Promise<AuthUserResponse> {
    try {
      this.authStateService.setLoading(true);
      this.authStateService.setError(null);

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        this.authStateService.updateAuthState({ 
          error: error.message, 
          isLoading: false 
        });
        return { data: undefined, error: error.message };
      }

      // Ensure profile exists after login
      if (data.user) {
        try {
          await this.profileService.ensureUserProfile();
          console.log('[AuthOperationsService] Profile verified for user:', data.user.email);
        } catch (profileError) {
          console.error('[AuthOperationsService] Profile verification failed:', profileError);
        }
      }

      // Session change will be handled by the SessionService listener
      return { data: data.user || undefined, error: null };

    } catch (error) {
      const errorMessage = 'Failed to sign in. Please check your credentials.';
      this.authStateService.updateAuthState({ 
        error: errorMessage, 
        isLoading: false 
      });
      return { data: undefined, error: errorMessage };
    }
  }

  /**
   * Sign in with magic link
   */
  async signInWithMagicLink(email: string, redirectTo?: string): Promise<AuthResponse> {
    try {
      this.authStateService.setLoading(true);
      this.authStateService.setError(null);

      const { error } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo || `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        this.authStateService.updateAuthState({ 
          error: error.message, 
          isLoading: false 
        });
        return { error: error.message };
      }

      this.authStateService.setLoading(false);
      console.log('[AuthOperationsService] Magic link sent to:', email);
      return { error: null };

    } catch (error) {
      const errorMessage = 'Failed to send magic link. Please try again.';
      this.authStateService.updateAuthState({ 
        error: errorMessage, 
        isLoading: false 
      });
      return { error: errorMessage };
    }
  }

  /**
   * Sign in with social provider
   */
  async signInWithProvider(provider: Provider, redirectTo?: string): Promise<AuthResponse> {
    try {
      this.authStateService.setLoading(true);
      this.authStateService.setError(null);

      const { error } = await this.supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectTo || `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        this.authStateService.updateAuthState({ 
          error: error.message, 
          isLoading: false 
        });
        return { error: error.message };
      }

      // OAuth redirects, but if user is already authenticated, ensure profile
      const { data: { user } } = await this.supabase.auth.getUser();
      if (user) {
        try {
          await this.profileService.ensureUserProfile();
          console.log('[AuthOperationsService] OAuth profile verified for:', user.email);
        } catch (profileError) {
          console.error('[AuthOperationsService] OAuth profile verification failed:', profileError);
        }
      }

      console.log('[AuthOperationsService] OAuth sign-in initiated with:', provider);
      return { error: null };

    } catch (error) {
      const errorMessage = `Failed to sign in with ${provider}. Please try again.`;
      this.authStateService.updateAuthState({ 
        error: errorMessage, 
        isLoading: false 
      });
      return { error: errorMessage };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      this.authStateService.setLoading(true);
      this.authStateService.setError(null);

      const { error } = await this.supabase.auth.signOut();
      
      if (error) {
        console.error('[AuthOperationsService] Error signing out:', error);
        this.authStateService.updateAuthState({ 
          error: error.message, 
          isLoading: false 
        });
        return;
      }

      // Clear auth state
      this.authStateService.clearAuthState();
      console.log('[AuthOperationsService] User signed out successfully');

    } catch (error) {
      console.error('[AuthOperationsService] Failed to sign out:', error);
      this.authStateService.updateAuthState({ 
        error: 'Failed to sign out', 
        isLoading: false 
      });
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string, redirectTo?: string): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        console.error('[AuthOperationsService] Password reset error:', error);
        return { error: error.message };
      }

      console.log('[AuthOperationsService] Password reset email sent to:', email);
      return { error: null };

    } catch (error) {
      console.error('[AuthOperationsService] Failed to send reset email:', error);
      return { error: 'Failed to send reset email. Please try again.' };
    }
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('[AuthOperationsService] Password update error:', error);
        return { error };
      }

      console.log('[AuthOperationsService] Password updated successfully');
      return { error: null };
    } catch (error) {
      console.error('[AuthOperationsService] Error updating password:', error);
      const authError = error as AuthError;
      return { error: authError };
    }
  }

  /**
   * Resend email confirmation
   */
  async resendConfirmation(email: string): Promise<AuthResponse> {
    try {
      this.authStateService.setLoading(true);
      this.authStateService.setError(null);

      const { error } = await this.supabase.auth.resend({
        type: 'signup',
        email: email
      });

      this.authStateService.setLoading(false);

      if (error) {
        console.error('[AuthOperationsService] Resend confirmation error:', error);
        return { error: error.message };
      }

      console.log('[AuthOperationsService] Confirmation email resent to:', email);
      return { error: null };
    } catch (error) {
      this.authStateService.setLoading(false);
      console.error('[AuthOperationsService] Failed to resend confirmation:', error);
      return { error: 'Failed to resend confirmation email. Please try again.' };
    }
  }

  /**
   * Update user email
   */
  async updateEmail(newEmail: string): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        email: newEmail
      });

      if (error) {
        console.error('[AuthOperationsService] Email update error:', error);
        return { error: error.message };
      }

      console.log('[AuthOperationsService] Email update initiated for:', newEmail);
      return { error: null };
    } catch (error) {
      console.error('[AuthOperationsService] Failed to update email:', error);
      return { error: 'Failed to update email. Please try again.' };
    }
  }

  /**
   * Verify OTP (for email and SMS verification)
   */
  async verifyOtp(params: { email: string; token: string; type: 'signup' | 'recovery' | 'email_change' }): Promise<AuthUserResponse>;
  async verifyOtp(params: { phone: string; token: string; type: 'sms' }): Promise<AuthUserResponse>;
  async verifyOtp(params: VerifyOtpParams): Promise<AuthUserResponse> {
     try {
       const { data, error } = await this.supabase.auth.verifyOtp(params);

       if (error) {
         console.error('[AuthOperationsService] OTP verification error:', error);
         return { data: undefined, error: error.message };
       }

       console.log('[AuthOperationsService] OTP verified successfully');
       return { data: data.user || undefined, error: null };
     } catch (error) {
       console.error('[AuthOperationsService] Failed to verify OTP:', error);
       return { data: undefined, error: 'Failed to verify OTP. Please try again.' };
     }
   }
}
