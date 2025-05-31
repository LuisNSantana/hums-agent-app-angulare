/**
 * Login Component - User authentication interface
 * Following Angular 20+ patterns with signals and reactive forms
 */

import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoginCredentials, SocialProvider } from '../../../shared/models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <!-- Header -->
        <div class="auth-header">
          <h1 class="auth-title">Welcome Back</h1>
          <p class="auth-subtitle">Sign in to continue your AI conversations</p>
        </div>

        <!-- Error Display -->
        @if (authError()) {
          <div class="error-banner">
            <span class="error-icon">⚠️</span>
            <span class="error-message">{{ authError() }}</span>
          </div>
        }

        <!-- Login Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
          <!-- Email Field -->
          <div class="form-group">
            <label for="email" class="form-label">Email Address</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              class="form-input"
              [class.error]="isFieldInvalid('email')"
              placeholder="Enter your email"
              autocomplete="email"
            />
            @if (isFieldInvalid('email')) {
              <span class="field-error">Please enter a valid email address</span>
            }
          </div>

          <!-- Password Field -->
          <div class="form-group">
            <label for="password" class="form-label">Password</label>
            <div class="password-input-container">
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                class="form-input"
                [class.error]="isFieldInvalid('password')"
                placeholder="Enter your password"
                autocomplete="current-password"
              />
              <button
                type="button"
                class="password-toggle"
                (click)="togglePasswordVisibility()"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
              >
                {{ showPassword() ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
            @if (isFieldInvalid('password')) {
              <span class="field-error">Password is required</span>
            }
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class="auth-submit"
            [disabled]="isLoading() || loginForm.invalid"
          >
            @if (isLoading()) {
              <span class="loading-spinner"></span>
              Signing In...
            } @else {
              Sign In
            }
          </button>
        </form>

        <!-- Divider -->
        <div class="auth-divider">
          <span>or</span>
        </div>

        <!-- Social Login -->
        <div class="social-auth">
          <button
            type="button"
            class="social-btn google"
            (click)="signInWithProvider('google')"
            [disabled]="isLoading()"
          >
            <span class="social-icon">🔍</span>
            Continue with Google
          </button>

          <button
            type="button"
            class="social-btn github"
            (click)="signInWithProvider('github')"
            [disabled]="isLoading()"
          >
            <span class="social-icon">🐙</span>
            Continue with GitHub
          </button>
        </div>

        <!-- Magic Link Option -->
        <div class="magic-link-section">
          <button
            type="button"
            class="magic-link-btn"
            (click)="toggleMagicLink()"
            [disabled]="isLoading()"
          >
            Or use magic link instead
          </button>

          @if (showMagicLink()) {
            <div class="magic-link-form">
              <div class="form-group">
                <input
                  type="email"
                  [(ngModel)]="magicLinkEmail"
                  class="form-input"
                  placeholder="Enter your email for magic link"
                />
              </div>
              <button
                type="button"
                class="magic-submit"
                (click)="sendMagicLink()"
                [disabled]="isLoading() || !isValidEmail(magicLinkEmail())"
              >
                Send Magic Link
              </button>
            </div>
          }
        </div>

        <!-- Footer Links -->
        <div class="auth-footer">
          <a routerLink="/auth/forgot-password" class="auth-link">
            Forgot your password?
          </a>
          
          <div class="auth-footer-text">
            Don't have an account?
            <a routerLink="/auth/signup" class="auth-link">Sign up</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
    }

    .auth-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      padding: 2rem;
      width: 100%;
      max-width: 400px;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .auth-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .auth-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1a202c;
      margin: 0 0 0.5rem 0;
    }

    .auth-subtitle {
      color: #718096;
      margin: 0;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #fed7d7;
      color: #c53030;
      padding: 0.75rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }

    .auth-form {
      margin-bottom: 1.5rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-label {
      display: block;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .form-input.error {
      border-color: #ef4444;
    }

    .password-input-container {
      position: relative;
    }

    .password-toggle {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem;
    }

    .field-error {
      color: #ef4444;
      font-size: 0.75rem;
      margin-top: 0.25rem;
      display: block;
    }

    .auth-submit {
      width: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 0.875rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: opacity 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .auth-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .loading-spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .auth-divider {
      text-align: center;
      margin: 1.5rem 0;
      position: relative;
    }

    .auth-divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #e5e7eb;
    }

    .auth-divider span {
      background: white;
      padding: 0 1rem;
      color: #6b7280;
      font-size: 0.875rem;
    }

    .social-auth {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .social-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      color: #374151;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .social-btn:hover:not(:disabled) {
      border-color: #d1d5db;
      background: #f9fafb;
    }

    .social-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .magic-link-section {
      margin-bottom: 1.5rem;
      text-align: center;
    }

    .magic-link-btn {
      background: none;
      border: none;
      color: #667eea;
      font-size: 0.875rem;
      cursor: pointer;
      text-decoration: underline;
    }

    .magic-link-form {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .magic-submit {
      background: #667eea;
      color: white;
      border: none;
      padding: 0.75rem;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
    }

    .magic-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .auth-footer {
      text-align: center;
      font-size: 0.875rem;
    }

    .auth-footer-text {
      margin-top: 1rem;
      color: #6b7280;
    }

    .auth-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }

    .auth-link:hover {
      text-decoration: underline;
    }
  `]
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  // Reactive state using signals
  readonly isLoading = computed(() => this.authService.isLoading());
  readonly authError = computed(() => this.authService.error());
  readonly showPassword = signal(false);
  readonly showMagicLink = signal(false);
  readonly magicLinkEmail = signal('');

  // Form setup
  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // Return URL for redirect after login
  private readonly returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/chat';

  constructor() {
    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const credentials: LoginCredentials = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    const { user, error } = await this.authService.signIn(credentials);

    if (user && !error) {
      await this.router.navigate([this.returnUrl]);
    }
    // Error handling is done in the service and displayed via signals
  }

  async signInWithProvider(provider: SocialProvider): Promise<void> {
    const { error } = await this.authService.signInWithProvider(provider, 
      `${window.location.origin}/auth/callback?returnUrl=${encodeURIComponent(this.returnUrl)}`
    );

    // Social auth redirects, so success handling is done in callback
    if (error) {
      console.error('Social auth error:', error);
    }
  }

  async sendMagicLink(): Promise<void> {
    const email = this.magicLinkEmail();
    if (!this.isValidEmail(email)) {
      return;
    }

    const { error } = await this.authService.signInWithMagicLink(email,
      `${window.location.origin}/auth/callback?returnUrl=${encodeURIComponent(this.returnUrl)}`
    );

    if (!error) {
      alert('Magic link sent! Check your email.');
      this.showMagicLink.set(false);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(show => !show);
  }

  toggleMagicLink(): void {
    this.showMagicLink.update(show => !show);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }
}
