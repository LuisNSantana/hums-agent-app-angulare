/**
 * Integrations Service - Manages OAuth connections with external services
 * Handles Google Calendar, Google Drive and other integrations
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError, tap,switchMap } from 'rxjs/operators';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthService } from './auth.service';
import { AuthStateService } from './auth';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/supabase.config';
import { environment } from '../../../environments/environment';

export interface IntegrationStatus {
  googleCalendarConnected: boolean;
  googleDriveConnected: boolean;
  lastUpdated: Date | null;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GoogleCalendarTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

@Injectable({
  providedIn: 'root'
})
export class IntegrationsService {
  private readonly authService = inject(AuthService);
  private readonly authStateService = inject(AuthStateService);
  private readonly http = inject(HttpClient);
  
  private supabase: SupabaseClient;
  private integrationStatusSubject = new BehaviorSubject<IntegrationStatus>({
    googleCalendarConnected: false,
    googleDriveConnected: false,
    lastUpdated: null
  });

  public integrationStatus$ = this.integrationStatusSubject.asObservable();

  constructor() {
    this.supabase = createClient(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      supabaseConfig.options
    );
    
    // Load integration status when service initializes
    this.loadIntegrationStatus();
    
    // Si AuthService expone un observable de cambios de sesión, suscríbete aquí.
    // Por ahora, solo se carga el estado de integración al inicializar el servicio.
  }
  
  /**
   * Get Google Calendar OAuth token for the current user
   * @returns Observable with the access token or null if not available
   */
  getGoogleCalendarToken(): Observable<string | null> {
    // Get current authenticated user from AuthStateService
    const authUser = this.authStateService.getCurrentUser();
    const userId = authUser?.id || null;
    console.log('[IntegrationsService] 🔍 Obteniendo token de Google Calendar para userId:', userId);
    
    if (!userId) {
      console.warn('[IntegrationsService] ⚠️ No authenticated user when requesting Google Calendar token');
      return of(null);
    }
    
    // Obtener los tokens de OAuth para Google Calendar
    return from(this.fetchGoogleCalendarTokens(userId)).pipe(
      map(tokens => {
        console.log('[IntegrationsService] ℹ️ Tokens recuperados:', tokens ? 'Datos disponibles' : 'No hay datos');
        
        if (!tokens || !tokens.access_token) {
          console.warn('[IntegrationsService] ⚠️ No Google Calendar access token found');
          return null;
        }
        
        // Check if token is expired (if we have expiry info)
        if (tokens.expires_at && Date.now() > tokens.expires_at) {
          console.warn('[IntegrationsService] ⚠️ Google Calendar token is expired. Expiry:', 
            new Date(tokens.expires_at).toISOString(), 'Current time:', new Date().toISOString());
          // Todo: implement refresh token flow
          return null;
        }
        
        console.log('[IntegrationsService] ✅ Google Calendar token retrieved successfully');
        return tokens.access_token;
      }),
      catchError(err => {
        console.error('[IntegrationsService] ❌ Error getting Google Calendar token:', err);
        return of(null);
      })
    );
  }
  
  /**
   * Fetch Google Calendar tokens from database
   * @param userId The user ID to fetch tokens for
   * @returns Promise with Google Calendar tokens or null
   */
  private async fetchGoogleCalendarTokens(userId: string): Promise<GoogleCalendarTokens | null> {
    try {
      console.log('[IntegrationsService] 🔎 Consultando tokens de Google Calendar para userId:', userId);
      
      // Usar la tabla user_integrations que ya existe con campos específicos para Google Calendar
      const { data, error } = await this.supabase
        .from('user_integrations')
        .select('google_calendar_token, google_calendar_refresh_token, google_calendar_token_expiry, google_calendar_connected')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('[IntegrationsService] 🚨 Error fetching Google Calendar tokens:', error);
        return null;
      }
      
      // Mostrar información detallada para depuración
      console.log('[IntegrationsService] 💾 Datos obtenidos:', {
        tieneResultados: !!data,
        conectado: data?.google_calendar_connected ? 'Sí' : 'No',
        tieneToken: !!data?.google_calendar_token,
        tieneRefreshToken: !!data?.google_calendar_refresh_token,
        tieneExpiracion: !!data?.google_calendar_token_expiry,
        expiracion: data?.google_calendar_token_expiry ? new Date(data.google_calendar_token_expiry).toISOString() : 'No disponible',
        horaActual: new Date().toISOString(),
        expirado: data?.google_calendar_token_expiry ? new Date(data.google_calendar_token_expiry) < new Date() : false
      });
      
      // Verificar que existan datos y que la integración esté conectada
      if (!data || !data.google_calendar_token || !data.google_calendar_connected) {
        console.warn('[IntegrationsService] ⚠️ No Google Calendar tokens found for user or integration not connected');
        return null;
      }
      
      // Verificar si el token ha expirado
      const tokenExpiry = data.google_calendar_token_expiry ? new Date(data.google_calendar_token_expiry) : null;
      if (tokenExpiry && tokenExpiry < new Date()) {
        console.warn('[IntegrationsService] ⚠️ Google Calendar token expirado. Expiración:', tokenExpiry, 'Hora actual:', new Date());
        // Aquí se podría implementar la lógica de refresh token en el futuro
        return null;
      }
      
      // Mapear los campos de la tabla user_integrations a nuestra interfaz GoogleCalendarTokens
      const result = {
        access_token: data.google_calendar_token,
        refresh_token: data.google_calendar_refresh_token,
        expires_at: tokenExpiry ? tokenExpiry.getTime() : undefined
      };
      
      console.log('[IntegrationsService] ✅ Tokens recuperados correctamente');
      return result;
    } catch (err) {
      console.error('[IntegrationsService] 🚨 Exception fetching Google Calendar tokens:', err);
      return null;
    }
  }

  /**
   * Load current integration status from Supabase
   */
  async loadIntegrationStatus(): Promise<void> {
    try {
      const user = this.authService.user();
      if (!user) {
        this.resetIntegrationStatus();
        return;
      }

      const { data, error } = await this.supabase
        .from('user_integrations')
        .select('google_calendar_connected, google_drive_connected, updated_at')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading integration status:', error);
        this.resetIntegrationStatus();
        return;
      }

      if (data) {
        this.integrationStatusSubject.next({
          googleCalendarConnected: data.google_calendar_connected || false,
          googleDriveConnected: data.google_drive_connected || false,
          lastUpdated: data.updated_at ? new Date(data.updated_at) : null
        });
      } else {
        // Create integration record if it doesn't exist
        await this.createIntegrationRecord(user.id);
      }
    } catch (error) {
      console.error('Error in loadIntegrationStatus:', error);
      this.resetIntegrationStatus();
    }
  }

  /**
   * Create a new integration record for a user
   */
  private async createIntegrationRecord(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_integrations')
        .insert({
          user_id: userId,
          google_calendar_connected: false,
          google_drive_connected: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating integration record:', error);
      } else {
        this.resetIntegrationStatus();
      }
    } catch (error) {
      console.error('Error in createIntegrationRecord:', error);
    }
  }

  /**
   * Check if a user integration record exists
   * @param userId User ID to check
   * @returns Promise<boolean> true if exists, false otherwise
   */
  private async checkUserIntegrationExists(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('user_integrations')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking user integration:', error);
        return false;
      }

      return !!data?.id;
    } catch (error) {
      console.error('Error in checkUserIntegrationExists:', error);
      return false;
    }
  }

  /**
   * Reset integration status to default values
   */
  private resetIntegrationStatus(): void {
    this.integrationStatusSubject.next({
      googleCalendarConnected: false,
      googleDriveConnected: false,
      lastUpdated: null
    });
  }

  /**
   * Get Google OAuth URL for Calendar integration
   */
  getGoogleCalendarAuthUrl(): string {
    const redirectUri = `${window.location.origin}/integrations/callback`;
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];
    
    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${environment.googleClientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes.join(' '))}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=calendar`;
  }

  /**
   * Get Google OAuth URL for Drive integration
   */
  getGoogleDriveAuthUrl(): string {
    const redirectUri = `${window.location.origin}/integrations/callback`;
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ];
    
    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${environment.googleClientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes.join(' '))}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=drive`;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  handleOAuthCallback(code: string, state: string): Observable<boolean> {
    const redirectUri = `${window.location.origin}/integrations/callback`;
    
    return this.http.post<OAuthTokenResponse>(
      'https://oauth2.googleapis.com/token',
      {
        code,
        client_id: environment.googleClientId,
        client_secret: environment.googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }
    ).pipe(
      tap(response => console.log('OAuth token response:', response)),
      switchMap(response => this.saveTokens(response, state)),
      catchError(error => {
        console.error('Error in OAuth callback:', error);
        return of(false);
      })
    );
  }

  /**
   * Save OAuth tokens to Supabase
   */
  /**
   * Save OAuth tokens to Supabase
   * @param response OAuth token response from Google
   * @param state State parameter indicating which service (calendar/drive)
   * @returns Observable<boolean> indicating success
   */
  private saveTokens(response: OAuthTokenResponse, state: string): Observable<boolean> {
    const user = this.authService.user();
    if (!user) {
      console.error('No authenticated user');
      return of(false);
    }

    console.log('Saving tokens for user:', user.id, 'with state:', state);

    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + response.expires_in);

    const tokenData: any = {
      user_id: user.id,
      updated_at: new Date().toISOString()
    };

    // Configurar datos según el tipo de integración
    if (state === 'calendar') {
      tokenData.google_calendar_connected = true;
      tokenData.google_calendar_token = response.access_token;
      tokenData.google_calendar_refresh_token = response.refresh_token;
      tokenData.google_calendar_token_expiry = expiryDate.toISOString();
      tokenData.google_calendar_scopes = response.scope;
    } else if (state === 'drive') {
      tokenData.google_drive_connected = true;
      tokenData.google_drive_token = response.access_token;
      tokenData.google_drive_refresh_token = response.refresh_token;
      tokenData.google_drive_token_expiry = expiryDate.toISOString();
      tokenData.google_drive_scopes = response.scope;
    }

    // Comprobar si el registro existe
    return from(this.checkUserIntegrationExists(user.id)).pipe(
      switchMap(exists => {
        if (exists) {
          console.log('Updating existing integration record');
          return from(this.supabase
            .from('user_integrations')
            .update(tokenData)
            .eq('user_id', user.id)
          );
        } else {
          console.log('Creating new integration record');
          return from(this.supabase
            .from('user_integrations')
            .insert(tokenData)
          );
        }
      }),
      map(result => {
        if (result.error) {
          console.error('Error saving tokens:', result.error);
          return false;
        }
        console.log('Tokens saved successfully');
        this.loadIntegrationStatus();
        return true;
      }),
      catchError(error => {
        console.error('Error in saveTokens:', error);
        return of(false);
      })
    );
  }

  /**
   * Disconnect Google Calendar integration
   */
  disconnectGoogleCalendar(): Observable<boolean> {
    const user = this.authService.user();
    if (!user) {
      console.error('No authenticated user');
      return of(false);
    }

    return from(this.supabase
      .from('user_integrations')
      .update({
        google_calendar_connected: false,
        google_calendar_token: null,
        google_calendar_refresh_token: null,
        google_calendar_token_expiry: null,
        google_calendar_scopes: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
    ).pipe(
      map(({ error }) => {
        if (error) {
          console.error('Error disconnecting Google Calendar:', error);
          return false;
        }
        
        // Reload integration status
        this.loadIntegrationStatus();
        return true;
      }),
      catchError(error => {
        console.error('Error in disconnectGoogleCalendar:', error);
        return of(false);
      })
    );
  }

  /**
   * Disconnect Google Drive integration
   */
  disconnectGoogleDrive(): Observable<boolean> {
    const user = this.authService.user();
    if (!user) {
      console.error('No authenticated user');
      return of(false);
    }

    return from(this.supabase
      .from('user_integrations')
      .update({
        google_drive_connected: false,
        google_drive_token: null,
        google_drive_refresh_token: null,
        google_drive_token_expiry: null,
        google_drive_scopes: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
    ).pipe(
      map(({ error }) => {
        if (error) {
          console.error('Error disconnecting Google Drive:', error);
          return false;
        }
        
        // Reload integration status
        this.loadIntegrationStatus();
        return true;
      }),
      catchError(error => {
        console.error('Error in disconnectGoogleDrive:', error);
        return of(false);
      })
    );
  }

  /**
   * Get Google Calendar credentials for the current user
   */
  async getGoogleCalendarCredentials(): Promise<any> {
    try {
      const user = this.authService.user();
      if (!user) return null;

      const { data, error } = await this.supabase
        .from('user_integrations')
        .select('google_calendar_token, google_calendar_refresh_token, google_calendar_token_expiry')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        console.error('Error getting Google Calendar credentials:', error);
        return null;
      }

      // Check if token is expired
      const tokenExpiry = new Date(data.google_calendar_token_expiry);
      const now = new Date();
      const isExpired = now > tokenExpiry;

      if (isExpired && data.google_calendar_refresh_token) {
        // Token is expired, refresh it
        return await this.refreshGoogleToken(data.google_calendar_refresh_token, 'calendar');
      }

      return {
        access_token: data.google_calendar_token,
        refresh_token: data.google_calendar_refresh_token,
        expiry_date: tokenExpiry.getTime()
      };
    } catch (error) {
      console.error('Error in getGoogleCalendarCredentials:', error);
      return null;
    }
  }

  /**
   * Get Google Drive credentials for the current user
   */
  async getGoogleDriveCredentials(): Promise<any> {
    try {
      const user = this.authService.user();
      if (!user) return null;

      const { data, error } = await this.supabase
        .from('user_integrations')
        .select('google_drive_token, google_drive_refresh_token, google_drive_token_expiry')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        console.error('Error getting Google Drive credentials:', error);
        return null;
      }

      // Check if token is expired
      const tokenExpiry = new Date(data.google_drive_token_expiry);
      const now = new Date();
      const isExpired = now > tokenExpiry;

      if (isExpired && data.google_drive_refresh_token) {
        // Token is expired, refresh it
        return await this.refreshGoogleToken(data.google_drive_refresh_token, 'drive');
      }

      return {
        access_token: data.google_drive_token,
        refresh_token: data.google_drive_refresh_token,
        expiry_date: tokenExpiry.getTime()
      };
    } catch (error) {
      console.error('Error in getGoogleDriveCredentials:', error);
      return null;
    }
  }

  /**
   * Refresh Google OAuth token
   */
  private async refreshGoogleToken(refreshToken: string, type: 'calendar' | 'drive'): Promise<any> {
    try {
      const response = await this.http.post<OAuthTokenResponse>(
        'https://oauth2.googleapis.com/token',
        {
          client_id: environment.googleClientId,
          client_secret: environment.googleClientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        }
      ).toPromise();

      if (!response || !response.access_token) {
        throw new Error('Failed to refresh token');
      }

      // Update token in database
      const user = this.authService.user();
      if (user) {
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + response.expires_in);

        const updates: any = {};
        
        if (type === 'calendar') {
          updates.google_calendar_token = response.access_token;
          updates.google_calendar_token_expiry = expiryDate.toISOString();
        } else {
          updates.google_drive_token = response.access_token;
          updates.google_drive_token_expiry = expiryDate.toISOString();
        }
        
        updates.updated_at = new Date().toISOString();

        await this.supabase
          .from('user_integrations')
          .update(updates)
          .eq('user_id', user.id);
      }

      return {
        access_token: response.access_token,
        refresh_token: refreshToken,
        expiry_date: new Date().getTime() + (response.expires_in * 1000)
      };
    } catch (error) {
      console.error(`Error refreshing ${type} token:`, error);
      return null;
    }
  }
}
