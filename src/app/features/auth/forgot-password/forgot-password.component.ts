import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black flex items-center justify-center px-4">
      <div class="max-w-md w-full">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p class="text-gray-300">Enter your email to receive a password reset link</p>
        </div>

        <!-- Form -->
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          @if (successMessage()) {
            <div class="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
              <p class="text-green-200 text-sm">{{ successMessage() }}</p>
            </div>
          }

          @if (errorMessage()) {
            <div class="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p class="text-red-200 text-sm">{{ errorMessage() }}</p>
            </div>
          }

          <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()">
            <div class="mb-6">
              <label for="email" class="block text-sm font-medium text-gray-200 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                formControlName="email"
                class="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                [class.border-red-500]="forgotPasswordForm.get('email')?.invalid && forgotPasswordForm.get('email')?.touched"
              />
              @if (forgotPasswordForm.get('email')?.invalid && forgotPasswordForm.get('email')?.touched) {
                <p class="mt-1 text-sm text-red-400">Please enter a valid email address</p>
              }
            </div>

            <button
              type="submit"
              [disabled]="forgotPasswordForm.invalid || isLoading()"
              class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              @if (isLoading()) {
                <div class="flex items-center justify-center">
                  <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Sending Reset Link...
                </div>
              } @else {
                Send Reset Link
              }
            </button>
          </form>

          <!-- Back to Login -->
          <div class="mt-6 text-center">
            <a
              routerLink="/auth/login"
              class="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-200"
            >
              ← Back to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  forgotPasswordForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  constructor() {
    this.forgotPasswordForm = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  async onSubmit() {
    if (this.forgotPasswordForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      this.successMessage.set(null);

      try {
        const email = this.forgotPasswordForm.value.email;
        const { error } = await this.authService.resetPassword(email);        if (error) {
          this.errorMessage.set(error);
        } else {
          this.successMessage.set(
            'Password reset link has been sent to your email. Please check your inbox and follow the instructions.'
          );
          this.forgotPasswordForm.reset();
        }
      } catch (error: any) {
        this.errorMessage.set(error.message || 'An unexpected error occurred');
      } finally {
        this.isLoading.set(false);
      }
    }
  }
}
