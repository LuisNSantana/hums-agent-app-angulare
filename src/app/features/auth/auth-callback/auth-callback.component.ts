/**
 * Auth Callback Component - Handles OAuth and magic link callbacks
 * Following Angular 20+ patterns with signals
 */

import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="callback-container">
      <div class="callback-card">
        @if (isLoading()) {
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <h2>Processing Authentication...</h2>
            <p>Please wait while we complete your sign in.</p>
          </div>
        }
        
        @if (error()) {
          <div class="error-content">
            <div class="error-icon">❌</div>
            <h2>Authentication Error</h2>
            <p>{{ error() }}</p>
            <button class="retry-btn" (click)="goToLogin()">
              Go to Login
            </button>
          </div>
        }

        @if (success()) {
          <div class="success-content">
            <div class="success-icon">✅</div>
            <h2>Authentication Successful!</h2>
            <p>Redirecting you to your dashboard...</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .callback-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
    }

    .callback-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      padding: 3rem 2rem;
      width: 100%;
      max-width: 400px;
      text-align: center;
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

    .loading-content,
    .error-content,
    .success-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .loading-spinner {
      width: 3rem;
      height: 3rem;
      border: 3px solid #e5e7eb;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .error-icon,
    .success-icon {
      font-size: 3rem;
    }

    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a202c;
      margin: 0;
    }

    p {
      color: #718096;
      margin: 0;
      line-height: 1.5;
    }

    .retry-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
      margin-top: 1rem;
    }

    .retry-btn:hover {
      opacity: 0.9;
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Reactive state
  readonly isLoading = signal(true);
  readonly success = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.handleAuthCallback();
  }

  private async handleAuthCallback(): Promise<void> {
    try {
      // Get return URL from query params
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/chat';
      
      // Let Supabase handle the callback
      // The auth state change will be picked up by the AuthService listener
      
      // Wait a moment for the auth state to update
      setTimeout(() => {
        const user = this.authService.user();
        
        if (user) {
          this.success.set(true);
          this.isLoading.set(false);
          
          // Redirect after a brief success message
          setTimeout(() => {
            this.router.navigate([returnUrl]);
          }, 1500);
        } else {
          this.handleError('Authentication failed. Please try again.');
        }
      }, 2000);

    } catch (err) {
      console.error('Auth callback error:', err);
      this.handleError('An unexpected error occurred during authentication.');
    }
  }

  private handleError(message: string): void {
    this.error.set(message);
    this.isLoading.set(false);
    this.success.set(false);
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
