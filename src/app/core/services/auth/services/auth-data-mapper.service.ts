/**
 * Auth Data Mapper Service - Data transformation and mapping utilities
 * Handles conversion between Supabase types and application types
 */

import { Injectable, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';
import { AuthUser, UserPreferences, IAuthDataMapper } from '../types/auth.types';
import { Database, Json } from '../../../../shared/types/database.types';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../../../config/supabase.config';

@Injectable({
  providedIn: 'root'
})
export class AuthDataMapper implements IAuthDataMapper {
  private readonly supabase: SupabaseClient<Database>;

  constructor() {
    this.supabase = createClient<Database>(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      supabaseConfig.options
    );
  }

  /**
   * Map Supabase user to AuthUser interface
   */
  async mapUserFromSupabase(user: User, profile?: any): Promise<AuthUser> {
    // Get profile data if not provided
    if (!profile) {
      const { data } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      profile = data;
    }

    return {
      id: user.id,
      email: user.email!,
      displayName: profile?.['display_name'] || user.user_metadata?.['display_name'],
      avatarUrl: profile?.['avatar_url'] || user.user_metadata?.['avatar_url'],
      emailConfirmed: user.email_confirmed_at !== null,
      lastSignIn: user.last_sign_in_at ? new Date(user.last_sign_in_at) : undefined,
      createdAt: new Date(user.created_at),
      preferences: this.parseUserPreferences(profile?.preferences) || this.getDefaultPreferences()
    };
  }

  /**
   * Parse user preferences from Json to UserPreferences
   */
  parseUserPreferences(preferences: Json | null | undefined): UserPreferences | undefined {
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
      return undefined;
    }

    try {
      return preferences as UserPreferences;
    } catch {
      return undefined;
    }
  }

  /**
   * Get default user preferences
   */
  getDefaultPreferences(): UserPreferences {
    return {
      theme: 'auto',
      language: 'en',
      notifications: {
        email: true,
        browser: true,
        updates: false
      }
    };
  }

  /**
   * Extract display name from OAuth data with fallback priority
   */
  extractOAuthDisplayName(user: User): string {
    const rawMetaData = user.user_metadata || {};
    
    return rawMetaData['name'] || 
           rawMetaData['full_name'] || 
           rawMetaData['user_name'] || 
           rawMetaData['display_name'] ||
           user.email?.split('@')[0] ||
           'Unknown User';
  }

  /**
   * Extract avatar URL from OAuth data (different providers use different keys)
   */
  extractOAuthAvatarUrl(user: User): string | undefined {
    const rawMetaData = user.user_metadata || {};
    
    return rawMetaData['avatar_url'] || 
           rawMetaData['picture'] ||  // Google uses 'picture'
           rawMetaData['photo_url'];
  }

  /**
   * Convert UserPreferences to Json for database storage
   */
  preferencesToJson(preferences: UserPreferences): Json {
    return preferences as Json;
  }

  /**
   * Validate and sanitize user input for profile updates
   */
  sanitizeProfileUpdate(updates: Partial<AuthUser>): Partial<AuthUser> {
    const sanitized: Partial<AuthUser> = {};

    if (updates.displayName !== undefined) {
      sanitized.displayName = updates.displayName?.trim() || undefined;
    }

    if (updates.avatarUrl !== undefined) {
      // Basic URL validation
      try {
        if (updates.avatarUrl && updates.avatarUrl.trim()) {
          new URL(updates.avatarUrl);
          sanitized.avatarUrl = updates.avatarUrl.trim();
        }
      } catch {
        // Invalid URL, skip it
      }
    }

    if (updates.preferences !== undefined) {
      sanitized.preferences = this.validatePreferences(updates.preferences);
    }

    return sanitized;
  }

  /**
   * Validate user preferences structure
   */  private validatePreferences(preferences?: UserPreferences): UserPreferences {
    const defaults = this.getDefaultPreferences();
    
    if (!preferences || typeof preferences !== 'object') {
      return defaults;
    }

    // Extract additional properties (excluding the ones we're validating)
    const { theme, language, defaultModel, notifications, ...additionalProps } = preferences;

    return {
      theme: ['light', 'dark', 'auto'].includes(preferences.theme) ? preferences.theme : defaults.theme,
      language: preferences.language || defaults.language,
      defaultModel: preferences.defaultModel,
      notifications: {
        email: typeof preferences.notifications?.email === 'boolean' ? preferences.notifications.email : defaults.notifications.email,
        browser: typeof preferences.notifications?.browser === 'boolean' ? preferences.notifications.browser : defaults.notifications.browser,
        updates: typeof preferences.notifications?.updates === 'boolean' ? preferences.notifications.updates : defaults.notifications.updates,
      },
      ...additionalProps // Keep any additional properties without overwriting validated ones
    };
  }
}
