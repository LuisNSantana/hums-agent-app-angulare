import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black flex items-center justify-center px-4">
      <div class="max-w-md w-full">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p class="text-gray-300">Enter your new password</p>
        </div>

        <!-- Form -->
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          @if (errorMessage()) {
            <div class="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p class="text-red-200 text-sm">{{ errorMessage() }}</p>
            </div>
          }

          <form [formGroup]="resetPasswordForm" (ngSubmit)="onSubmit()">
            <div class="mb-6">
              <label for="password" class="block text-sm font-medium text-gray-200 mb-2">
                New Password
              </label>
              <div class="relative">
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  id="password"
                  formControlName="password"
                  class="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                  placeholder="Enter new password"
                  [class.border-red-500]="resetPasswordForm.get('password')?.invalid && resetPasswordForm.get('password')?.touched"
                />
                <button
                  type="button"
                  (click)="showPassword.set(!showPassword())"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  @if (showPassword()) {
                    <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  } @else {
                    <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  }
                </button>
              </div>
              @if (resetPasswordForm.get('password')?.invalid && resetPasswordForm.get('password')?.touched) {
                <p class="mt-1 text-sm text-red-400">Password must be at least 8 characters long</p>
              }
            </div>

            <div class="mb-6">
              <label for="confirmPassword" class="block text-sm font-medium text-gray-200 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                formControlName="confirmPassword"
                class="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm new password"
                [class.border-red-500]="resetPasswordForm.hasError('passwordMismatch') && resetPasswordForm.get('confirmPassword')?.touched"
              />
              @if (resetPasswordForm.hasError('passwordMismatch') && resetPasswordForm.get('confirmPassword')?.touched) {
                <p class="mt-1 text-sm text-red-400">Passwords do not match</p>
              }
            </div>

            <button
              type="submit"
              [disabled]="resetPasswordForm.invalid || isLoading()"
              class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              @if (isLoading()) {
                <div class="flex items-center justify-center">
                  <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Updating Password...
                </div>
              } @else {
                Update Password
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
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  resetPasswordForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);
  constructor() {
    this.resetPasswordForm = this.fb.nonNullable.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Check if we have the required hash fragments for password reset
    const fragment = this.route.snapshot.fragment;
    if (!fragment || !fragment.includes('access_token')) {
      this.errorMessage.set('Invalid or expired reset link. Please request a new password reset.');
    }
  }
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const group = control as FormGroup;
    const password = group.get('password');
    const confirmPassword = group.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  async onSubmit() {
    if (this.resetPasswordForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      try {
        const password = this.resetPasswordForm.value.password;
        const { error } = await this.authService.updatePassword(password);        if (error) {
          this.errorMessage.set(typeof error === 'object' && error.message ? error.message : 'Failed to update password');
        } else {
          // Successfully updated password, redirect to login
          this.router.navigate(['/auth/login'], {
            queryParams: { message: 'Password updated successfully. Please log in with your new password.' }
          });
        }
      } catch (error: any) {
        this.errorMessage.set(typeof error === 'string' ? error : (error.message || 'An unexpected error occurred'));
      } finally {
        this.isLoading.set(false);
      }
    }
  }
}
