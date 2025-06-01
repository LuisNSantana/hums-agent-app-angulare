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
import { MaterialModule } from '../../../shared/modules/material.module';
import { PasswordStrengthIndicatorComponent } from '../../../shared/components/password-strength-indicator/password-strength-indicator.component';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MaterialModule, PasswordStrengthIndicatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">        <!-- Header -->
        <mat-card-header class="auth-header">
          <div class="back-button-container">
            <button mat-icon-button color="primary" routerLink="/auth/login" aria-label="Back to login">
              <mat-icon>arrow_back</mat-icon>
            </button>
          </div>
          <h1 class="auth-title">Create Account</h1>
          <p class="auth-subtitle">Join Agent Hums and start your AI conversations</p>
        </mat-card-header>
        <mat-card-content>

         <!-- Error Display -->
         @if (authError()) {
          <div class="error-banner" role="alert">
            <mat-icon color="warn">error</mat-icon>
            <span class="error-message">{{ authError() }}</span>
          </div>
        }

         <!-- Success Message -->
         @if (showSuccessMessage()) {
            <div class="success-banner" role="status">
            <mat-icon color="primary">check_circle</mat-icon>
            <span class="success-message">
              Account created successfully! Please check your email to verify your account.
            </span>
          </div>
        }

         <!-- Signup Form -->
        <form [formGroup]="signupForm" (ngSubmit)="onSubmit()" class="auth-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Display Name</mat-label>
            <input matInput type="text" formControlName="displayName" autocomplete="name">
            @if (isFieldInvalid('displayName')) {
              <mat-error>Display name is required</mat-error>
            }
          </mat-form-field>

          <!-- Email Field -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email Address</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email">
            @if (isFieldInvalid('email')) {
              <mat-error>Please enter a valid email address</mat-error>
            }
          </mat-form-field>

          <!-- Password Field -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Password</mat-label>
            <input matInput [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="new-password">
            <button mat-icon-button matSuffix type="button" (click)="togglePasswordVisibility()" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (isFieldInvalid('password')) {
              <mat-error>Password must be at least 8 characters</mat-error>
            }
          </mat-form-field>
          <app-password-strength-indicator [password]="signupForm.get('password')?.value"></app-password-strength-indicator>

          <!-- Confirm Password Field -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Confirm Password</mat-label>
            <input matInput [type]="showPassword() ? 'text' : 'password'" formControlName="confirmPassword" autocomplete="new-password">
            @if (isFieldInvalid('confirmPassword')) {
              <mat-error>Please confirm your password</mat-error>
            }
            @if (passwordMismatch()) {
              <mat-error>Passwords do not match</mat-error>
            }
          </mat-form-field>

          <!-- Terms Acceptance and Submit -->
          <button mat-raised-button color="primary" class="full-width" type="submit" [disabled]="isLoading() || signupForm.invalid">
            @if (isLoading()) {
              <mat-progress-spinner diameter="20" mode="indeterminate" strokeWidth="3"></mat-progress-spinner>
              Creating Account...
            } @else {
              Create Account
            }
          </button>
        </form>
        <mat-divider></mat-divider>        <!-- Divider -->
        <div class="auth-divider">
          <mat-divider></mat-divider>
          <span class="divider-text">or</span>
          <mat-divider></mat-divider>
        </div>
         
        <!-- Social Login -->
        <div class="social-auth">
          <button mat-stroked-button color="primary" class="full-width" type="button" (click)="signUpWithProvider('google')" [disabled]="isLoading()">
            <mat-icon svgIcon="google"></mat-icon>
            Sign up with Google
          </button>

          <button mat-stroked-button color="accent" class="full-width" type="button" (click)="signUpWithProvider('github')" [disabled]="isLoading()">
            <mat-icon svgIcon="github"></mat-icon>
            Sign up with GitHub
          </button>
        </div>
          <!-- Footer -->
         <div class="auth-footer">
          <span class="auth-footer-text">Already have an account?</span>
          <a mat-button color="accent" routerLink="/auth/login" class="signin-link">Sign in</a>
         </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,  styles: [`    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(145deg, var(--mat-app-surface-container-high) 0%, var(--mat-app-primary) 100%);
      background-attachment: fixed;
      padding: 1rem;
      overflow-y: auto;
      padding-top: 2rem;
      padding-bottom: 2rem;
    }

    .auth-card {
      background: var(--mat-app-surface-container);
      border: 1px solid var(--mat-app-outline-variant);
      border-radius: 20px;
      box-shadow: var(--mat-app-shadow-elevated);
      backdrop-filter: var(--mat-app-glass-blur);
      padding: 3rem;
      width: 100%;
      max-width: 520px;
      min-height: 680px;
      animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .auth-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--mat-app-gradient-primary);
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }    .auth-header {
      text-align: center;
      margin-bottom: 2rem;
      position: relative;
    }
    
    .back-button-container {
      position: absolute;
      top: -10px;
      left: -10px;
    }

    .auth-title {
      color: var(--mat-app-primary);
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 0.75rem 0;
      background: var(--mat-app-gradient-primary);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .auth-subtitle {
      color: var(--mat-app-on-surface);
      font-size: 1.1rem;
      font-weight: 500;
      margin: 0;
      opacity: 0.95;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: var(--mat-app-error-container);
      color: var(--mat-app-on-error-container);
      padding: 1rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
      border: 1px solid var(--mat-app-error);
      font-size: 0.875rem;
    }

    .success-banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: var(--mat-app-primary-container);
      color: var(--mat-app-on-primary-container);
      padding: 1rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
      border: 1px solid var(--mat-app-primary);
      font-size: 0.875rem;
    }

    .auth-form {
      margin-bottom: 2rem;
    }

    ::ng-deep .auth-form .mat-mdc-form-field {
      width: 100%;
      margin-bottom: 1rem !important;
    }

    ::ng-deep .auth-form .mat-mdc-form-field .mat-mdc-text-field-wrapper {
      background: var(--mat-app-surface) !important;
      border-radius: 12px !important;
    }

    ::ng-deep .auth-form .mat-mdc-form-field .mat-mdc-floating-label {
      color: var(--mat-app-primary) !important;
      font-weight: 500 !important;
      font-size: 1rem !important;
    }

    ::ng-deep .auth-form .mat-mdc-form-field.mat-focused .mat-mdc-floating-label {
      color: var(--mat-app-primary) !important;
    }

    ::ng-deep .auth-form .mat-mdc-input-element {
      color: var(--mat-app-on-surface) !important;
      font-size: 1rem !important;
    }

    ::ng-deep .auth-form .mat-mdc-input-element::placeholder {
      color: var(--mat-app-on-surface) !important;
      opacity: 0.75 !important;
      font-weight: 500 !important;
    }

    mat-divider {
      margin: 2rem 0;
    }

    .auth-footer {
      text-align: center;
      padding-top: 1.5rem;
    }    .auth-divider {
      text-align: center;
      margin: 2rem 0;
      position: relative;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .divider-text {
      background: var(--mat-app-surface-container);
      padding: 0 1rem;
      color: var(--mat-app-on-surface);
      font-size: 0.875rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .social-auth {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    ::ng-deep .social-auth .mat-mdc-button {
      height: 48px !important;
      border-radius: 12px !important;
      font-weight: 600 !important;
      font-size: 1rem !important;
      gap: 0.75rem !important;
      background: var(--mat-app-surface) !important;
      border: 2px solid var(--mat-app-outline) !important;
      color: var(--mat-app-on-surface) !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    ::ng-deep .social-auth .mat-mdc-button .mat-icon {
      height: 24px !important;
      width: 24px !important;
      margin-right: 8px !important;
    }

    ::ng-deep .social-auth .mat-mdc-button:hover {
      background: var(--mat-app-surface-variant) !important;
      border-color: var(--mat-app-primary) !important;
      transform: translateY(-1px) !important;
      box-shadow: var(--mat-app-shadow) !important;
    }

    ::ng-deep .social-auth .mat-mdc-button[color="primary"]:hover {
      border-color: #4285F4 !important;
      color: #4285F4 !important;
    }

    ::ng-deep .social-auth .mat-mdc-button[color="accent"]:hover {
      border-color: #333333 !important;
      color: #333333 !important;
    }

    .auth-footer-text {
      display: block;
      margin-bottom: 0.75rem;
      color: var(--mat-app-on-surface);
      font-size: 0.9rem;
      font-weight: 500;
    }

    ::ng-deep .auth-footer .mat-mdc-button {
      font-weight: 600 !important;
      text-transform: none !important;
    }
    
    ::ng-deep .signin-link {
      color: var(--mat-app-primary) !important;
      font-weight: 700 !important;
      font-size: 1.1rem !important;
      transition: all 0.3s ease !important;
      position: relative !important;
      overflow: hidden !important;
    }
    
    ::ng-deep .signin-link::after {
      content: '' !important;
      position: absolute !important;
      bottom: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 2px !important;
      background: var(--mat-app-gradient-primary) !important;
      transform: scaleX(0) !important;
      transform-origin: right !important;
      transition: transform 0.4s ease !important;
    }
    
    ::ng-deep .signin-link:hover::after {
      transform: scaleX(1) !important;
      transform-origin: left !important;
    }
    
    ::ng-deep .signin-link:hover {
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
    }

    /* Responsive Design */    @media (max-width: 600px) {
      .auth-container {
        padding: 0.5rem;
        min-height: auto;
        height: auto;
        align-items: flex-start;
      }
      
      .auth-card {
        padding: 2rem 1.5rem;
        min-height: auto;
        max-width: 100%;
        margin: 1rem 0;
      }

      .auth-title {
        font-size: 1.75rem !important;
      }
    }/* Submit Button Styling */
    ::ng-deep .auth-form .mat-mdc-raised-button.mat-primary {
      height: 52px !important;
      border-radius: 14px !important;
      font-weight: 700 !important;
      font-size: 1.1rem !important;
      background: var(--mat-app-gradient-primary) !important;
      background-size: 200% auto !important;
      color: var(--mat-app-on-primary) !important;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
      box-shadow: var(--mat-app-shadow), 0 4px 12px rgba(45, 35, 66, 0.3) !important;
      letter-spacing: 0.5px !important;
      position: relative !important;
      overflow: hidden !important;
    }

    ::ng-deep .auth-form .mat-mdc-raised-button.mat-primary::before {
      content: '' !important;
      position: absolute !important;
      top: 0 !important;
      left: -100% !important;
      width: 100% !important;
      height: 100% !important;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent) !important;
      transition: all 0.6s !important;
    }

    ::ng-deep .auth-form .mat-mdc-raised-button.mat-primary:hover:not([disabled])::before {
      left: 100% !important;
    }    ::ng-deep .auth-form .mat-mdc-raised-button.mat-primary:hover:not([disabled]) {
      transform: translateY(-3px) !important;
      background-position: right center !important;
      box-shadow: var(--mat-app-shadow-elevated), 0 8px 24px rgba(45, 35, 66, 0.4) !important;
    }
    
    ::ng-deep .auth-form .mat-mdc-raised-button.mat-primary:hover:not([disabled])::before {
      animation: shimmer 1.5s infinite;
    }
    
    @keyframes shimmer {
      0% { left: -100%; }
      100% { left: 100%; }
    }

    ::ng-deep .auth-form .mat-mdc-raised-button.mat-primary:active:not([disabled]) {
      transform: translateY(-1px) !important;
      transition: transform 0.1s ease !important;
    }

    ::ng-deep .auth-form .mat-mdc-raised-button.mat-primary[disabled] {
      opacity: 0.6 !important;
      background: var(--mat-app-surface-variant) !important;
      color: var(--mat-app-on-surface-variant) !important;
    }

    .full-width {
      width: 100%;
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
  readonly password = signal('');

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

    // Connect password field to signal for strength indicator
    this.signupForm.get('password')?.valueChanges.subscribe(value => {
      this.password.set(value || '');
    });
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
