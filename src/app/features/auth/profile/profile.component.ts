import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AuthUser } from '../../../shared/models/auth.models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black px-4 py-8">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-white mb-2">Profile Settings</h1>
          <p class="text-gray-300">Manage your account information and preferences</p>
        </div>

        <div class="grid md:grid-cols-2 gap-8">
          <!-- Profile Information -->
          <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
            <h2 class="text-xl font-semibold text-white mb-6">Personal Information</h2>
            
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

            <form [formGroup]="profileForm" (ngSubmit)="updateProfile()">
              <div class="space-y-6">
                <div>
                  <label for="fullName" class="block text-sm font-medium text-gray-200 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    formControlName="fullName"
                    class="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label for="email" class="block text-sm font-medium text-gray-200 mb-2">
                    Email Address
                  </label>                  <input
                    type="email"
                    id="email"
                    formControlName="email"
                    [disabled]="true"
                    class="w-full px-4 py-3 bg-gray-600/50 border border-white/30 rounded-lg text-gray-300 placeholder-gray-400 cursor-not-allowed"
                  />
                  <p class="mt-1 text-xs text-gray-400">Email cannot be changed</p>
                </div>

                <div>
                  <label for="bio" class="block text-sm font-medium text-gray-200 mb-2">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    formControlName="bio"
                    rows="3"
                    class="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Tell us about yourself..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  [disabled]="profileForm.invalid || isUpdatingProfile()"
                  class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  @if (isUpdatingProfile()) {
                    <div class="flex items-center justify-center">
                      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Updating...
                    </div>
                  } @else {
                    Update Profile
                  }
                </button>
              </div>
            </form>
          </div>

          <!-- Account Security -->
          <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
            <h2 class="text-xl font-semibold text-white mb-6">Account Security</h2>
            
            <!-- Email Verification Status -->
            <div class="mb-6 p-4 rounded-lg border" [class]="getEmailVerificationClasses()">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-medium" [class]="getEmailVerificationTextClass()">Email Verification</h3>                  <p class="text-sm" [class]="getEmailVerificationTextClass()">
                    {{ currentUser()?.emailConfirmed ? 'Your email is verified' : 'Please verify your email address' }}
                  </p>
                </div>
                @if (!currentUser()?.emailConfirmed) {
                  <button
                    (click)="resendVerification()"
                    [disabled]="isResending()"
                    class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
                  >
                    @if (isResending()) {
                      <div class="flex items-center">
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </div>
                    } @else {
                      Resend
                    }
                  </button>
                }
              </div>
            </div>

            <!-- Change Password -->
            <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
              <div class="space-y-4">
                <div>
                  <label for="currentPassword" class="block text-sm font-medium text-gray-200 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    formControlName="currentPassword"
                    class="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <label for="newPassword" class="block text-sm font-medium text-gray-200 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    formControlName="newPassword"
                    class="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter new password"
                  />
                  @if (passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched) {
                    <p class="mt-1 text-sm text-red-400">Password must be at least 8 characters long</p>
                  }
                </div>

                <div>
                  <label for="confirmNewPassword" class="block text-sm font-medium text-gray-200 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmNewPassword"
                    formControlName="confirmNewPassword"
                    class="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm new password"
                  />
                  @if (passwordForm.hasError('passwordMismatch') && passwordForm.get('confirmNewPassword')?.touched) {
                    <p class="mt-1 text-sm text-red-400">Passwords do not match</p>
                  }
                </div>

                <button
                  type="submit"
                  [disabled]="passwordForm.invalid || isChangingPassword()"
                  class="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  @if (isChangingPassword()) {
                    <div class="flex items-center justify-center">
                      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Changing Password...
                    </div>
                  } @else {
                    Change Password
                  }
                </button>
              </div>
            </form>

            <!-- Sign Out -->
            <div class="mt-8 pt-6 border-t border-white/20">
              <button
                (click)="signOut()"
                class="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <!-- Back to Chat -->
        <div class="mt-8 text-center">
          <a
            routerLink="/chat"
            class="inline-flex items-center text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Back to Chat
          </a>
        </div>
      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  profileForm: FormGroup;
  passwordForm: FormGroup;
  currentUser = this.authService.currentUser;
  isUpdatingProfile = signal(false);
  isChangingPassword = signal(false);
  isResending = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);  constructor() {
    this.profileForm = this.fb.nonNullable.group({
      fullName: [''],
      email: [{ value: '', disabled: true }],
      bio: ['']
    });

    this.passwordForm = this.fb.nonNullable.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmNewPassword: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    this.loadUserProfile();
  }
  private async loadUserProfile() {
    const user = this.currentUser();
    if (user) {
      this.profileForm.patchValue({
        fullName: user.displayName || '',
        email: user.email || '',
        bio: '' // We'll need to add bio to AuthUser if needed
      });
    }
  }

  private passwordMatchValidator(group: FormGroup) {
    const newPassword = group.get('newPassword');
    const confirmNewPassword = group.get('confirmNewPassword');
    
    if (newPassword && confirmNewPassword && newPassword.value !== confirmNewPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  async updateProfile() {
    if (this.profileForm.valid) {
      this.isUpdatingProfile.set(true);
      this.errorMessage.set(null);
      this.successMessage.set(null);      try {
        const formValue = this.profileForm.value;
        const profileData = {
          displayName: formValue.fullName
        };

        const { error } = await this.authService.updateProfile(profileData);

        if (error) {
          this.errorMessage.set(error);
        } else {
          this.successMessage.set('Profile updated successfully!');
          setTimeout(() => this.successMessage.set(null), 5000);
        }
      } catch (error: any) {
        this.errorMessage.set(error.message || 'Failed to update profile');
      } finally {
        this.isUpdatingProfile.set(false);
      }
    }
  }

  async changePassword() {
    if (this.passwordForm.valid) {
      this.isChangingPassword.set(true);
      this.errorMessage.set(null);
      this.successMessage.set(null);

      try {
        const { newPassword } = this.passwordForm.value;        const { error } = await this.authService.updatePassword(newPassword);        if (error) {
          this.errorMessage.set(typeof error === 'object' && error.message ? error.message : 'Failed to update password');
        } else {
          this.successMessage.set('Password changed successfully!');
          this.passwordForm.reset();
          setTimeout(() => this.successMessage.set(null), 5000);
        }
      } catch (error: any) {
        this.errorMessage.set(error.message || 'Failed to change password');
      } finally {
        this.isChangingPassword.set(false);
      }
    }
  }

  async resendVerification() {
    const user = this.currentUser();
    if (!user?.email) return;

    this.isResending.set(true);

    try {      const { error } = await this.authService.resendConfirmation(user.email);
      
      if (error) {
        this.errorMessage.set(error);
      } else {
        this.successMessage.set('Verification email sent!');
        setTimeout(() => this.successMessage.set(null), 5000);
      }
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to resend verification email');
    } finally {
      this.isResending.set(false);
    }
  }

  async signOut() {
    await this.authService.signOut();
    this.router.navigate(['/auth/login']);
  }
  getEmailVerificationClasses(): string {
    return this.currentUser()?.emailConfirmed 
      ? 'bg-green-500/20 border-green-500/50' 
      : 'bg-yellow-500/20 border-yellow-500/50';
  }

  getEmailVerificationTextClass(): string {
    return this.currentUser()?.emailConfirmed 
      ? 'text-green-200' 
      : 'text-yellow-200';
  }
}
