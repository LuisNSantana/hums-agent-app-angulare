import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black flex items-center justify-center px-4">
      <div class="max-w-md w-full">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-white mb-2">Email Verification</h1>
          <p class="text-gray-300">{{ getSubtitle() }}</p>
        </div>

        <!-- Status Card -->
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          @if (isVerifying()) {
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p class="text-white text-lg font-medium">Verifying your email...</p>
              <p class="text-gray-300 text-sm mt-2">Please wait while we confirm your email address.</p>
            </div>
          }

          @if (verificationStatus() === 'success') {
            <div class="text-center">
              <div class="mx-auto mb-4 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-white mb-2">Email Verified!</h3>
              <p class="text-gray-300 mb-6">Your email has been successfully verified. You can now access all features.</p>
              <button
                (click)="navigateToChat()"
                class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
              >
                Continue to Chat
              </button>
            </div>
          }

          @if (verificationStatus() === 'error') {
            <div class="text-center">
              <div class="mx-auto mb-4 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-white mb-2">Verification Failed</h3>
              <p class="text-red-200 mb-6">{{ errorMessage() }}</p>
              <div class="space-y-3">
                <button
                  (click)="resendVerification()"
                  [disabled]="isResending()"
                  class="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  @if (isResending()) {
                    <div class="flex items-center justify-center">
                      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Sending...
                    </div>
                  } @else {
                    Resend Verification Email
                  }
                </button>
                <a
                  routerLink="/auth/login"
                  class="block w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 text-center"
                >
                  Back to Login
                </a>
              </div>
            </div>
          }

          @if (verificationStatus() === 'pending') {
            <div class="text-center">
              <div class="mx-auto mb-4 w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-white mb-2">Check Your Email</h3>
              <p class="text-gray-300 mb-6">We've sent a verification link to your email address. Please check your inbox and click the verification link.</p>
              <div class="space-y-3">
                <button
                  (click)="resendVerification()"
                  [disabled]="isResending()"
                  class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  @if (isResending()) {
                    <div class="flex items-center justify-center">
                      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Sending...
                    </div>
                  } @else {
                    Resend Verification Email
                  }
                </button>
                <a
                  routerLink="/auth/login"
                  class="block w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 text-center"
                >
                  Back to Login
                </a>
              </div>
            </div>
          }

          @if (resendSuccess()) {
            <div class="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
              <p class="text-green-200 text-sm">Verification email sent successfully!</p>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class VerifyEmailComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  isVerifying = signal(true);
  verificationStatus = signal<'pending' | 'success' | 'error'>('pending');
  errorMessage = signal<string | null>(null);
  isResending = signal(false);
  resendSuccess = signal(false);

  ngOnInit() {
    this.checkVerificationStatus();
  }

  private async checkVerificationStatus() {
    const fragment = this.route.snapshot.fragment;
    
    if (fragment && fragment.includes('access_token')) {
      // This is likely a verification callback
      try {
        const { data, error } = await this.authService.handleAuthCallback();
          if (error) {
          this.verificationStatus.set('error');
          this.errorMessage.set(typeof error === 'string' ? error : error.message);
        } else if (data?.user?.email_confirmed_at) {
          this.verificationStatus.set('success');
        } else {
          this.verificationStatus.set('pending');
        }
      } catch (error: any) {
        this.verificationStatus.set('error');
        this.errorMessage.set(typeof error === 'string' ? error : (error.message || 'Verification failed'));
      }
    } else {      // Check current user verification status
      const user = this.authService.currentUser();
      if (user?.emailConfirmed) {
        this.verificationStatus.set('success');
      } else {
        this.verificationStatus.set('pending');
      }
    }
    
    this.isVerifying.set(false);
  }

  getSubtitle(): string {
    switch (this.verificationStatus()) {
      case 'success':
        return 'Your email has been successfully verified';
      case 'error':
        return 'There was an issue verifying your email';
      case 'pending':
      default:
        return 'Please verify your email to continue';
    }
  }

  async resendVerification() {
    const user = this.authService.currentUser();
    if (!user?.email) {
      this.errorMessage.set('No email address found');
      return;
    }

    this.isResending.set(true);
    this.resendSuccess.set(false);    try {
      const { error } = await this.authService.resendConfirmation(user.email);
      
      if (error) {
        this.errorMessage.set(error);
      } else {
        this.resendSuccess.set(true);
        setTimeout(() => this.resendSuccess.set(false), 5000);
      }
    } catch (error: any) {
      this.errorMessage.set(typeof error === 'string' ? error : (error.message || 'Failed to resend verification email'));
    } finally {
      this.isResending.set(false);
    }
  }

  navigateToChat() {
    this.router.navigate(['/chat']);
  }
}
