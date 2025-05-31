/**
 * Profile Service - User profile management
 * Handles profile creation, updates, and OAuth profile management
 */

import { Injectable, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';
import { AuthUser, UserPreferences, AuthResponse, IProfileService } from '../types/auth.types';
import { Database, Json } from '../../../../shared/types/database.types';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../../../config/supabase.config';
import { AuthStateService } from './auth-state.service';
import { AuthDataMapper } from './auth-data-mapper.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileService implements IProfileService {
  private readonly supabase: SupabaseClient<Database>;
  private readonly authStateService = inject(AuthStateService);
  private readonly authDataMapper = inject(AuthDataMapper);

  constructor() {
    this.supabase = createClient<Database>(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      supabaseConfig.options
    );
  }

  /**
   * Ensure user profile exists in profiles table (idempotent)
   * Enhanced to handle OAuth users and extract data from raw_user_meta_data
   */
  async ensureUserProfile(): Promise<void> {
    const currentSession = this.authStateService.getCurrentSession();
    if (!currentSession?.user) return;

    const userId = currentSession.user.id;
    
    // Verificar si el perfil ya existe
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
      
    if (error) {
      console.error('[ProfileService] Error checking profile:', error);
      return;
    }
    
    if (!profile) {
      // Crear perfil si no existe, especialmente importante para OAuth
      console.log('[ProfileService] Creating missing profile for user:', userId);
      await this.createUserProfileFromOAuth(currentSession.user);
    }
  }

  /**
   * Create user profile in profiles table
   */
  async createUserProfile(user: User, displayName?: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email!,
          display_name: displayName || user.user_metadata?.['display_name'],
          avatar_url: user.user_metadata?.['avatar_url'],
          preferences: this.authDataMapper.preferencesToJson(
            this.authDataMapper.getDefaultPreferences()
          ),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('[ProfileService] Error creating user profile:', error);
        throw new Error(`Failed to create user profile: ${error.message}`);
      }

      console.log('[ProfileService] User profile created successfully for:', user.id);
    } catch (error) {
      console.error('[ProfileService] Failed to create user profile:', error);
      throw error;
    }
  }

  /**
   * Create user profile from OAuth data with enhanced extraction
   */
  async createUserProfileFromOAuth(user: User): Promise<void> {
    try {
      // Extract OAuth provider info
      const appMetaData = user.app_metadata || {};
      
      // Extract display name and avatar with fallback priority
      const displayName = this.authDataMapper.extractOAuthDisplayName(user);
      const avatarUrl = this.authDataMapper.extractOAuthAvatarUrl(user);
      
      console.log('[ProfileService] Creating OAuth profile for:', {
        id: user.id,
        provider: appMetaData['provider'],
        displayName,
        avatarUrl
      });

      const { error } = await this.supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email!,
          display_name: displayName,
          avatar_url: avatarUrl,
          preferences: this.authDataMapper.preferencesToJson(
            this.authDataMapper.getDefaultPreferences()
          ),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('[ProfileService] Error creating OAuth profile:', error);
        // Try to create with minimal data if the detailed creation fails
        if (error.code !== '23505') { // Not a duplicate key error
          await this.createUserProfile(user, displayName);
        }
      } else {
        console.log('[ProfileService] OAuth profile created successfully for user:', user.id);
      }
    } catch (error) {
      console.error('[ProfileService] Failed to create OAuth profile:', error);
      // Fallback to basic profile creation
      await this.createUserProfile(user);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<AuthUser>): Promise<AuthResponse> {
    try {
      const currentUser = this.authStateService.getCurrentUser();
      if (!currentUser) {
        return { error: 'No authenticated user' };
      }

      // Sanitize and validate updates
      const sanitizedUpdates = this.authDataMapper.sanitizeProfileUpdate(updates);

      // Update auth metadata if needed (displayName, avatarUrl are typically in auth.users table)
      const authMetadataUpdate: any = {}; // Explicitly type if possible, e.g., { data: UserMetadata }
      let userMetadataChanged = false;

      if (sanitizedUpdates.displayName) {
        authMetadataUpdate.data = { ...authMetadataUpdate.data, display_name: sanitizedUpdates.displayName };
        userMetadataChanged = true;
      }
      if (sanitizedUpdates.avatarUrl) {
        authMetadataUpdate.data = { ...authMetadataUpdate.data, avatar_url: sanitizedUpdates.avatarUrl };
        userMetadataChanged = true;
      }
      if (sanitizedUpdates.nickname) { // Assuming nickname can be stored in user_metadata
         authMetadataUpdate.data = { ...authMetadataUpdate.data, nickname: sanitizedUpdates.nickname };
         userMetadataChanged = true;
      }

      if (userMetadataChanged) {
        const { error: authError } = await this.supabase.auth.updateUser(authMetadataUpdate);
        if (authError) {
          console.error('[ProfileService] Error updating auth user metadata:', authError);
          return { error: authError.message };
        }
      }

      // Update profile table (this is where bio, and other custom fields would go)
      const profileTableUpdate: any = {
        updated_at: new Date().toISOString()
      };
      let profileTableChanged = false;

      // These might be redundant if also in user_metadata, adjust based on your DB schema
      if (sanitizedUpdates.displayName !== undefined) {
        profileTableUpdate.display_name = sanitizedUpdates.displayName;
        profileTableChanged = true;
      }
      if (sanitizedUpdates.nickname !== undefined) { 
        profileTableUpdate.nickname = sanitizedUpdates.nickname;
        profileTableChanged = true;
      }
      if (sanitizedUpdates.avatarUrl !== undefined) {
        profileTableUpdate.avatar_url = sanitizedUpdates.avatarUrl;
        profileTableChanged = true;
      }
      if (sanitizedUpdates.bio !== undefined) { 
        profileTableUpdate.bio = sanitizedUpdates.bio;
        profileTableChanged = true;
      }
      if (sanitizedUpdates.preferences !== undefined) {
        profileTableUpdate.preferences = this.authDataMapper.preferencesToJson(sanitizedUpdates.preferences);
        profileTableChanged = true;
      }

      if (profileTableChanged) {
        const { error: profileError } = await this.supabase
          .from('profiles')
          .update(profileTableUpdate)
          .eq('id', currentUser.id);

        if (profileError) {
          console.error('[ProfileService] Error updating profile table:', profileError);
          return { error: profileError.message };
        }
      }

      // The user state should ideally be refreshed by AuthStateService listening to onAuthStateChange or similar
      // Forcing a refresh here might be an option if direct state update is needed and not handled reactively.
      // await this.authStateService.refreshUser(); // Or similar method if it exists

      console.log('[ProfileService] Profile updated successfully for user:', currentUser.id);
      return { error: null };

    } catch (error) {
      console.error('[ProfileService] Failed to update profile:', error);
      return { error: 'Failed to update profile. Please try again.' };
    }
  }

  /**
   * Update user preferences specifically
   */
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<AuthResponse> {
    try {
      const currentUser = this.authStateService.getCurrentUser();
      if (!currentUser) {
        return { error: 'No authenticated user' };
      }

      // Merge with existing preferences
      const currentPreferences = currentUser.preferences || this.authDataMapper.getDefaultPreferences();
      const updatedPreferences = { ...currentPreferences, ...preferences };

      // Validate preferences (AuthDataMapper should handle new fields like communicationStyle, interests)
      const validatedPreferences = this.authDataMapper.preferencesToJson(updatedPreferences);

      const { error } = await this.supabase
        .from('profiles')
        .update({
          preferences: validatedPreferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (error) {
        console.error('[ProfileService] Error updating preferences:', error);
        return { error: error.message };
      }

      console.log('[ProfileService] Preferences updated successfully for user:', currentUser.id);
      return { error: null };

    } catch (error) {
      console.error('[ProfileService] Failed to update preferences:', error);
      return { error: 'Failed to update preferences. Please try again.' };
    }
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<{ data: any; error: string | null }> {
    try {
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[ProfileService] Error fetching profile:', error);
        return { data: null, error: error.message };
      }

      return { data: profile, error: null };

    } catch (error) {
      console.error('[ProfileService] Failed to fetch profile:', error);
      return { data: null, error: 'Failed to fetch profile' };
    }
  }

  /**
   * Delete user profile (soft delete)
   */
  async deleteProfile(userId: string): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase
        .from('profiles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('[ProfileService] Error deleting profile:', error);
        return { error: error.message };
      }

      console.log('[ProfileService] Profile soft deleted for user:', userId);
      return { error: null };

    } catch (error) {
      console.error('[ProfileService] Failed to delete profile:', error);
      return { error: 'Failed to delete profile' };
    }
  }

  /**
   * Check if profile exists
   */
  async profileExists(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[ProfileService] Error checking profile existence:', error);
        return false;
      }

      return !!data;

    } catch (error) {
      console.error('[ProfileService] Failed to check profile existence:', error);
      return false;
    }
  }

  /**
   * Get all profiles (admin function)
   */
  async getAllProfiles(limit: number = 50, offset: number = 0): Promise<{ data: any[]; error: string | null }> {
    try {
      const { data: profiles, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('[ProfileService] Error fetching profiles:', error);
        return { data: [], error: error.message };
      }

      return { data: profiles || [], error: null };

    } catch (error) {
      console.error('[ProfileService] Failed to fetch profiles:', error);
      return { data: [], error: 'Failed to fetch profiles' };
    }
  }
}