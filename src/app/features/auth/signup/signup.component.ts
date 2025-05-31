/**
 * Signup Component - User registration interface
 * Following Angular 20+ patterns with signals and reactive forms
 */

import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SignupCredentials, SocialProvider } from '../../../shared/models/auth.models';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <!-- Header -->
        <div class="auth-header">
          <h1 class="auth-title">Create Account</h1>
          <p class="auth-subtitle">Join Agent Hums and start your AI conversations</p>
        </div>

        <!-- Error Display -->
        @if (authError()) {
          <div class="error-banner">
            <span class="error-icon">⚠️</span>
            <span class="error-message">{{ authError() }}</span>
          </div>
        }

        <!-- Success Message -->
        @if (showSuccessMessage()) {
          <div class="success-banner">
            <span class="success-icon">✅</span>
            <span class="success-message">
              Account created successfully! Please check your email to verify your account.
            </span>
          </div>
        }

        <!-- Signup Form -->
        <form [formGroup]="signupForm" (ngSubmit)="onSubmit()" class="auth-form">
          <!-- Display Name Field -->
          <div class="form-group">
            <label for="displayName" class="form-label">Display Name</label>
            <input
              id="displayName"
              type="text"
              formControlName="displayName"
              class="form-input"
              [class.error]="isFieldInvalid('displayName')"
              placeholder="Enter your display name"
              autocomplete="name"
            />
            @if (isFieldInvalid('displayName')) {
              <span class="field-error">Display name is required</span>
            }
          </div>

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
                autocomplete="new-password"
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
              <span class="field-error">Password must be at least 8 characters</span>
            }
          </div>

          <!-- Confirm Password Field -->
          <div class="form-group">
            <label for="confirmPassword" class="form-label">Confirm Password</label>
            <input
              id="confirmPassword"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="confirmPassword"
              class="form-input"
              [class.error]="isFieldInvalid('confirmPassword') || passwordMismatch()"
              placeholder="Confirm your password"
              autocomplete="new-password"
            />
            @if (isFieldInvalid('confirmPassword')) {
              <span class="field-error">Please confirm your password</span>
            }
            @if (passwordMismatch()) {
              <span class="field-error">Passwords do not match</span>
            }
          </div>

          <!-- Terms Acceptance -->
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                formControlName="acceptTerms"
                class="checkbox-input"
              />
              <span class="checkbox-text">
                I agree to the <a href="/terms" target="_blank">Terms of Service</a> 
                and <a href="/privacy" target="_blank">Privacy Policy</a>
              </span>
            </label>
            @if (isFieldInvalid('acceptTerms')) {
              <span class="field-error">Please accept the terms and conditions</span>
            }
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class="auth-submit"
            [disabled]="isLoading() || signupForm.invalid"
          >
            @if (isLoading()) {
              <span class="loading-spinner"></span>
              Creating Account...
            } @else {
              Create Account
            }
          </button>
        </form>

        <!-- Divider -->
        <div class="auth-divider">
          <span>or</span>
        </div>

        <!-- Social Signup -->
        <div class="social-auth">
          <button
            type="button"
            class="social-btn google"
            (click)="signUpWithProvider('google')"
            [disabled]="isLoading()"
          >
            <span class="social-icon">🔍</span>
            Sign up with Google
          </button>

          <button
            type="button"
            class="social-btn github"
            (click)="signUpWithProvider('github')"
            [disabled]="isLoading()"
          >
            <span class="social-icon">🐙</span>
            Sign up with GitHub
          </button>
        </div>

        <!-- Footer Links -->
        <div class="auth-footer">
          <div class="auth-footer-text">
            Already have an account?
            <a routerLink="/auth/login" class="auth-link">Sign in</a>
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

    .success-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #c6f6d5;
      color: #22543d;
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

    .checkbox-group {
      margin: 1.5rem 0;
    }

    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      cursor: pointer;
    }

    .checkbox-input {
      margin-top: 0.125rem;
    }

    .checkbox-text {
      font-size: 0.875rem;
      color: #374151;
      line-height: 1.4;
    }

    .checkbox-text a {
      color: #667eea;
      text-decoration: none;
    }

    .checkbox-text a:hover {
      text-decoration: underline;
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

    .auth-footer {
      text-align: center;
      font-size: 0.875rem;
    }

    .auth-footer-text {
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
export class SignupComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // Reactive state using signals
  readonly isLoading = computed(() => this.authService.isLoading());
  readonly authError = computed(() => this.authService.error());
  readonly showPassword = signal(false);
  readonly showSuccessMessage = signal(false);

  // Form setup with custom validators
  readonly signupForm: FormGroup = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    acceptTerms: [false, [Validators.requiredTrue]]
  });

  constructor() {
    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/chat']);
    }
  }
  async onSubmit(): Promise<void> {
    if (this.signupForm.invalid || this.passwordMismatch()) {
      this.markFormGroupTouched();
      return;
    }

    try {
      const credentials: SignupCredentials = {
        email: this.signupForm.value.email,
        password: this.signupForm.value.password,
        displayName: this.signupForm.value.displayName,
        redirectTo: `${window.location.origin}/auth/callback`
      };

      const { user, error } = await this.authService.signUp(credentials);

      if (user && !error) {
        this.showSuccessMessage.set(true);
        // Optionally redirect to login or verification page
        setTimeout(() => {
          this.router.navigate(['/auth/verify-email'], {
            queryParams: { email: credentials.email }
          });
        }, 2000);
      }
      // Error handling is done in the service and displayed via signals
    } catch (error) {
      console.error('Signup error:', error);
    }
  }

  async signUpWithProvider(provider: SocialProvider): Promise<void> {
    const { error } = await this.authService.signInWithProvider(provider, 
      `${window.location.origin}/auth/callback`
    );

    // Social auth redirects, so success handling is done in callback
    if (error) {
      console.error('Social auth error:', error);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(show => !show);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  passwordMismatch(): boolean {
    const password = this.signupForm.get('password')?.value;
    const confirmPassword = this.signupForm.get('confirmPassword')?.value;
    const confirmField = this.signupForm.get('confirmPassword');
    
    return !!(confirmField && confirmField.touched && password !== confirmPassword);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.signupForm.controls).forEach(key => {
      this.signupForm.get(key)?.markAsTouched();
    });
  }
}
