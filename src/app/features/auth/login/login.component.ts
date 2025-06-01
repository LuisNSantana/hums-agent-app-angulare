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
import { MaterialModule } from '../../../shared/modules/material.module';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, MaterialModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-header>
          <mat-card-title>Welcome Back</mat-card-title>
          <mat-card-subtitle>Sign in to continue your AI conversations</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
         
        <!-- Error Banner -->
        @if (authError()) {
          <div class="error-banner" role="alert">
            <mat-icon color="warn">error</mat-icon>
            <span class="error-message">{{ authError() }}</span>
          </div>
        }

        <!-- Login Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email Address</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" cdkFocusInitial aria-label="Email address" required (blur)="isFieldInvalid('email')">
            @if (isFieldInvalid('email')) {
              <mat-error>Please enter a valid email address</mat-error>
            }
          </mat-form-field>

          <!-- Password Field -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Password</mat-label>
            <input matInput [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" aria-label="Password" required (blur)="isFieldInvalid('password')">
            <button mat-icon-button matSuffix type="button" (click)="togglePasswordVisibility()" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (isFieldInvalid('password')) {
              <mat-error>Password is required</mat-error>
            }
          </mat-form-field>

          <!-- Submit Button -->
          <button mat-raised-button color="primary" class="full-width" type="submit" [disabled]="isLoading() || loginForm.invalid" aria-label="Sign in">
            @if (isLoading()) {
              <mat-progress-spinner diameter="20" mode="indeterminate" strokeWidth="3"></mat-progress-spinner>
              Signing In...
            } @else {
              Sign In
            }
          </button>
        </form>

        <!-- Divider -->
        <div class="auth-divider">
          <mat-divider></mat-divider>
          <span class="divider-text">or</span>
          <mat-divider></mat-divider>
        </div>
         
        <!-- Social Login -->
        <div class="social-auth">
          <button mat-stroked-button color="primary" class="full-width" type="button" (click)="signInWithProvider('google')" [disabled]="isLoading()" aria-label="Continue with Google">
            <mat-icon svgIcon="google"></mat-icon>
            Continue with Google
          </button>

          <button mat-stroked-button color="accent" class="full-width" type="button" (click)="signInWithProvider('github')" [disabled]="isLoading()" aria-label="Continue with GitHub">
            <mat-icon svgIcon="github"></mat-icon>
            Continue with GitHub
          </button>
         </div>

        <!-- Magic Link Option -->
        <div class="magic-link-section">
          <button mat-button type="button" (click)="toggleMagicLink()" [disabled]="isLoading()" aria-label="Use magic link">
            Or use magic link instead
          </button>

          @if (showMagicLink()) {
            <form class="magic-link-form" (ngSubmit)="sendMagicLink()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email for Magic Link</mat-label>
                <input matInput type="email" [(ngModel)]="magicLinkEmail" name="magicEmail" placeholder="Enter your email">
              </mat-form-field>
              <button mat-raised-button color="primary" class="full-width" type="submit" [disabled]="isLoading() || !isValidEmail(magicLinkEmail())">
                Send Magic Link
              </button>
            </form>
           }
        </div>        <!-- Footer Links -->
        <div class="auth-footer">
          <a mat-button routerLink="/auth/forgot-password" class="forgot-password-link">Forgot your password?</a>
          <span class="auth-footer-text">Don't have an account?</span>
          <a mat-button color="accent" routerLink="/auth/signup" class="signup-link">Sign up</a>
        </div>
      </mat-card-content>
      </mat-card>
    </div>  `,
  styles: [`    .auth-container {
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
      min-height: 600px;
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
    }

    ::ng-deep .auth-card .mat-mdc-card-header {
      padding: 0 0 2rem 0;
      text-align: center;
    }

    ::ng-deep .auth-card .mat-mdc-card-title {
      color: var(--mat-app-primary) !important;
      font-size: 2rem !important;
      font-weight: 700 !important;
      margin: 0 0 0.5rem 0 !important;
      background: var(--mat-app-gradient-primary);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }    ::ng-deep .auth-card .mat-mdc-card-subtitle {
      color: var(--mat-app-on-surface) !important;
      font-size: 1.1rem !important;
      margin: 0 !important;
      font-weight: 500 !important;
      opacity: 0.95;
    }    .error-banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: var(--mat-app-error-container);
      color: var(--mat-app-on-error-container);
      padding: 1.25rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
      border: 2px solid var(--mat-app-error);
      font-size: 1rem;
      font-weight: 500;
      box-shadow: var(--mat-app-shadow);
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
    }    ::ng-deep .auth-form .mat-mdc-form-field .mat-mdc-floating-label {
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
    }    ::ng-deep .auth-form .mat-mdc-input-element::placeholder {
      color: var(--mat-app-on-surface) !important;
      opacity: 0.75 !important;
      font-weight: 500 !important;
    }

    .auth-divider {
      text-align: center;
      margin: 2rem 0;
      position: relative;
      display: flex;
      align-items: center;
      gap: 1rem;
    }    .divider-text {
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
    }    ::ng-deep .social-auth .mat-mdc-button {
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

    .magic-link-section {
      margin-bottom: 2rem;
      text-align: center;
    }

    .magic-link-form {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .auth-footer {
      text-align: center;
      padding-top: 1.5rem;
      border-top: 1px solid var(--mat-app-outline-variant);
    }    .auth-footer-text {
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
    
    ::ng-deep .forgot-password-link {
      color: var(--mat-app-secondary) !important;
      font-weight: 600 !important;
      transition: all 0.3s ease !important;
      text-decoration: underline !important;
    }
    
    ::ng-deep .forgot-password-link:hover {
      color: var(--mat-app-primary) !important;
      opacity: 0.9;
    }
    
    ::ng-deep .signup-link {
      color: var(--mat-app-primary) !important;
      font-weight: 700 !important;
      font-size: 1.1rem !important;
      transition: all 0.3s ease !important;
    }
    
    ::ng-deep .signup-link:hover {
      transform: translateY(-2px) !important;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
    }/* Responsive Design */    @media (max-width: 600px) {
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

      ::ng-deep .auth-card .mat-mdc-card-title {
        font-size: 1.75rem !important;
      }
    }    /* Submit Button Styling */
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
      animation: shimmer 1.5s infinite;
    }
    
    @keyframes shimmer {
      0% { left: -100%; }
      100% { left: 100%; }
    }

    ::ng-deep .auth-form .mat-mdc-raised-button.mat-primary:hover:not([disabled]) {
      transform: translateY(-3px) !important;
      background-position: right center !important;
      box-shadow: var(--mat-app-shadow-elevated), 0 8px 24px rgba(45, 35, 66, 0.4) !important;
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

    /* Magic Link Button Styling */    ::ng-deep .magic-link-section .mat-mdc-button {
      color: var(--mat-app-primary) !important;
      font-weight: 600 !important;
      text-decoration: underline !important;
      font-size: 1rem !important;
    }

    ::ng-deep .magic-link-form .mat-mdc-raised-button {
      height: 44px !important;
      border-radius: 12px !important;
      font-weight: 500 !important;
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
