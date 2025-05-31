/**
 * Auth State Service - Reactive state management for authentication
 * Handles signals and observables following Angular reactive patterns
 */

import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthState, AuthUser, IAuthStateService } from '../types/auth.types';
import { Session } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AuthStateService implements IAuthStateService {
  
  // Reactive state using Angular signals
  private readonly _authState = signal<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    error: null
  });

  // Legacy Observable support for components that need it
  private readonly _user$ = new BehaviorSubject<AuthUser | null>(null);
  readonly user$ = this._user$.asObservable();

  // Public reactive state (readonly)
  readonly authState = this._authState.asReadonly();
  readonly user = computed(() => this._authState().user);
  readonly session = computed(() => this._authState().session);
  readonly isLoading = computed(() => this._authState().isLoading);
  readonly isAuthenticated = computed(() => this._authState().isAuthenticated);
  readonly error = computed(() => this._authState().error);

  /**
   * Update auth state with partial updates
   */
  updateAuthState(updates: Partial<AuthState>): void {
    this._authState.update(current => ({ ...current, ...updates }));
  }

  /**
   * Set user and update related state
   */
  setUser(user: AuthUser | null): void {
    this._user$.next(user);
    this.updateAuthState({
      user,
      isAuthenticated: !!user
    });
  }

  /**
   * Set session and update state
   */
  setSession(session: Session | null): void {
    this.updateAuthState({ session });
  }

  /**
   * Set loading state
   */
  setLoading(isLoading: boolean): void {
    this.updateAuthState({ isLoading });
  }

  /**
   * Set error state
   */
  setError(error: string | null): void {
    this.updateAuthState({ error });
  }

  /**
   * Clear all auth state (used on signOut)
   */
  clearAuthState(): void {
    this.updateAuthState({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
    this._user$.next(null);
  }

  /**
   * Get current auth state snapshot
   */
  getCurrentState(): AuthState {
    return this._authState();
  }

  /**
   * Get current user snapshot
   */
  getCurrentUser(): AuthUser | null {
    return this._authState().user;
  }

  /**
   * Get current session snapshot
   */
  getCurrentSession(): Session | null {
    return this._authState().session;
  }
}
