import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, AbstractControl, ValidationErrors } from '@angular/forms'; // Added AbstractControl, ValidationErrors
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service'; // Assuming this is the composed service
import { ProfileService } from '../../../core/services/auth'; // Specific ProfileService
import { AuthUser, UserPreferences } from '../../../core/services/auth'; // Updated types
import { AuthStateService } from '../../../core/services/auth'; // For current user state
import { MaterialModule } from '../../../shared/modules/material.module'; // Angular Material

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MaterialModule],
  changeDetection: ChangeDetectionStrategy.OnPush,  template: `
    <div class="profile-container">
      <div class="profile-content">        <!-- Header -->
        <div class="profile-header">
          <div class="header-content">
            <div class="header-icon">
              <mat-icon class="large-icon">account_circle</mat-icon>
            </div>
            <h1 class="mat-headline-4">Your Profile</h1>
            <p class="mat-subtitle-1">Customize your experience and manage your account settings</p>
            <div class="header-divider"></div>
          </div>
        </div>        <!-- Success/Error Messages -->
        @if (successMessage()) {
          <div class="message-container success">
            <mat-icon>check_circle</mat-icon>
            {{ successMessage() }}
          </div>
        }
        @if (errorMessage()) {
          <div class="message-container error">
            <mat-icon>error</mat-icon>
            {{ errorMessage() }}
          </div>
        }

        <!-- Main Grid -->
        <div class="profile-grid">
          <!-- Left Column: Avatar & Basic Info -->
          <mat-card class="profile-sidebar">
            <mat-card-content>
              <div class="profile-user-info">                <div class="avatar-container">
                  <div class="avatar-wrapper">
                    @if (!currentUser()?.avatarUrl) {
                      <mat-icon class="default-avatar-icon">
                        account_circle
                      </mat-icon>
                    }
                    @if (currentUser()?.avatarUrl) {
                      <img
                        [src]="currentUser()?.avatarUrl"
                        alt="User Avatar"
                        class="avatar-image"
                      />
                    }
                  </div>
                  <button mat-mini-fab color="primary" class="avatar-edit-button">
                    <mat-icon>edit</mat-icon>
                  </button>
                </div>
                <h2 class="mat-title">{{ currentUser()?.displayName || currentUser()?.email }}</h2>
                <p class="mat-body-1 user-email">{{ currentUser()?.email }}</p>
                
                <mat-chip-set>
                  <mat-chip [color]="currentUser()?.emailConfirmed ? 'accent' : 'warn'">
                    <mat-icon matChipAvatar>{{ currentUser()?.emailConfirmed ? 'check_circle' : 'pending' }}</mat-icon>
                    {{ currentUser()?.emailConfirmed ? 'Verified' : 'Verification Pending' }}
                  </mat-chip>
                </mat-chip-set>
              </div>
            </mat-card-content>
            <mat-card-actions>
              <button mat-stroked-button routerLink="/chat">
                <mat-icon>arrow_back</mat-icon>
                Back to Chat
              </button>
              <button mat-raised-button color="warn" (click)="signOut()">
                <mat-icon>logout</mat-icon>
                Sign Out
              </button>
            </mat-card-actions>
          </mat-card>

          <!-- Right Column: Tabs for Forms -->
          <mat-card class="profile-main">
            <mat-tab-group animationDuration="300ms" [selectedIndex]="getActiveTabIndex()" (selectedIndexChange)="onTabIndexChange($event)">
              
              <!-- Profile Details Tab -->
              <mat-tab label="Profile Details">
                <mat-card-content>
                  <form [formGroup]="profileForm" (ngSubmit)="updateProfile()" class="profile-form">
                    <h3 class="mat-headline-6 form-title">Personal Information</h3>
                      <mat-form-field appearance="outline">
                      <mat-label>Display Name</mat-label>
                      <input matInput formControlName="displayName" required>                      @if (profileForm.get('displayName')?.hasError('required')) {
                        <mat-error>
                          Display name is required
                        </mat-error>
                      }
                      @if (profileForm.get('displayName')?.hasError('minlength')) {
                        <mat-error>
                          Display name must be at least 3 characters
                        </mat-error>
                      }
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Nickname (Optional)</mat-label>
                      <input matInput formControlName="nickname">
                      <mat-hint>A friendly name for the agent to use</mat-hint>
                    </mat-form-field>                      <mat-form-field appearance="outline">
                      <mat-label>Bio (Optional)</mat-label>
                      <textarea matInput formControlName="bio" rows="3" matTextareaAutosize></textarea>
                      <mat-hint>{{ profileForm.get('bio')?.value?.length || 0 }}/250 characters</mat-hint>
                      @if (profileForm.get('bio')?.hasError('maxlength')) {
                        <mat-error>
                          Bio cannot exceed 250 characters
                        </mat-error>
                      }
                    </mat-form-field>                    <button 
                      mat-raised-button 
                      color="primary" 
                      type="submit" 
                      [disabled]="profileForm.invalid || isUpdatingProfile()"
                      class="submit-button">
                      @if (isUpdatingProfile()) {
                        <mat-icon>sync</mat-icon>
                      }
                      <span>{{ isUpdatingProfile() ? 'Updating...' : 'Save Profile' }}</span>
                    </button>
                  </form>
                </mat-card-content>
              </mat-tab>

              <!-- Preferences Tab -->
              <mat-tab label="Agent Preferences">
                <mat-card-content>
                  <form [formGroup]="preferencesForm" (ngSubmit)="updatePreferences()" class="profile-form">
                    <h3 class="mat-headline-6 form-title">Agent Preferences</h3>

                    <mat-form-field appearance="outline">
                      <mat-label>Preferred Language</mat-label>
                      <mat-select formControlName="language">
                        <mat-option value="en">English</mat-option>
                        <mat-option value="es">Español</mat-option>
                        <mat-option value="fr">Français</mat-option>
                        <mat-option value="de">Deutsch</mat-option>
                        <mat-option value="pt">Português</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Communication Style</mat-label>
                      <mat-select formControlName="communicationStyle">
                        <mat-option value="neutral">Neutral</mat-option>
                        <mat-option value="formal">Formal</mat-option>
                        <mat-option value="informal">Informal</mat-option>
                      </mat-select>
                    </mat-form-field>                    <mat-form-field appearance="outline">
                      <mat-label>Interests (Optional)</mat-label>
                      <input matInput formControlName="interests">
                      <mat-hint>Comma-separated interests to help the agent personalize suggestions</mat-hint>
                    </mat-form-field>                    <button 
                      mat-raised-button 
                      color="accent" 
                      type="submit" 
                      [disabled]="preferencesForm.invalid || isUpdatingPreferences()"
                      class="submit-button">
                      @if (isUpdatingPreferences()) {
                        <mat-icon>sync</mat-icon>
                      }
                      <span>{{ isUpdatingPreferences() ? 'Updating...' : 'Save Preferences' }}</span>
                    </button>
                  </form>
                </mat-card-content>
              </mat-tab>

              <!-- Security Tab -->
              <mat-tab label="Security">
                <mat-card-content>
                  <div class="security-content">
                    <h3 class="mat-headline-6 form-title">Account Security</h3>
                      <!-- Email Verification Status -->
                    <mat-card class="verification-card" [ngClass]="currentUser()?.emailConfirmed ? 'verified' : 'pending'">
                      <mat-card-content>
                        <div class="verification-header">
                          <div class="verification-info">
                            <h4 class="mat-subtitle-1">Email Verification</h4>
                            <p class="mat-body-2">
                              {{ currentUser()?.emailConfirmed ? 'Your email is verified' : 'Please verify your email address' }}
                            </p>
                          </div>
                          @if (!currentUser()?.emailConfirmed && !isResendingVerification()) {
                            <button 
                              mat-button
                              color="warn"
                              (click)="resendVerification()">
                              Resend Email
                            </button>
                          }
                          @if (isResendingVerification()) {
                            <span class="resending-text">Sending...</span>
                          }
                        </div>
                      </mat-card-content>
                    </mat-card>

                    <!-- Password Change Form -->
                    <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="profile-form">                      <mat-form-field appearance="outline">
                        <mat-label>Current Password</mat-label>
                        <input matInput type="password" formControlName="currentPassword" required>
                        @if (passwordForm.get('currentPassword')?.hasError('required')) {
                          <mat-error>
                            Current password is required
                          </mat-error>
                        }
                      </mat-form-field>                      <mat-form-field appearance="outline">
                        <mat-label>New Password</mat-label>
                        <input matInput type="password" formControlName="newPassword" required>
                        <mat-hint>Minimum 8 characters</mat-hint>
                        @if (passwordForm.get('newPassword')?.hasError('required')) {
                          <mat-error>
                            New password is required
                          </mat-error>
                        }
                        @if (passwordForm.get('newPassword')?.hasError('minlength')) {
                          <mat-error>
                            Password must be at least 8 characters long
                          </mat-error>
                        }
                      </mat-form-field>                      <mat-form-field appearance="outline">
                        <mat-label>Confirm New Password</mat-label>
                        <input matInput type="password" formControlName="confirmNewPassword" required>
                        @if (passwordForm.get('confirmNewPassword')?.hasError('required')) {
                          <mat-error>
                            Please confirm your new password
                          </mat-error>
                        }
                        @if (passwordForm.hasError('passwordMismatch') && passwordForm.get('confirmNewPassword')?.touched) {
                          <mat-error>
                            Passwords do not match
                          </mat-error>
                        }
                      </mat-form-field>                      <button 
                        mat-raised-button 
                        color="warn" 
                        type="submit" 
                        [disabled]="passwordForm.invalid || isChangingPassword()"
                        class="submit-button">
                        @if (isChangingPassword()) {
                          <mat-icon>sync</mat-icon>
                        }
                        <span>{{ isChangingPassword() ? 'Updating...' : 'Change Password' }}</span>
                      </button>
                    </form>
                  </div>
                </mat-card-content>
              </mat-tab>

            </mat-tab-group>
          </mat-card>
        </div>
      </div>
    </div>
  `,  styles: [`    .profile-container {
      min-height: 100vh;
      background: var(--mat-app-background);
      padding: 24px;
      background-image: 
        radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
      background-attachment: fixed;
    }

    .profile-content {
      max-width: 1200px;
      margin: 0 auto;
    }

    .profile-header {
      text-align: center;
      margin-bottom: 48px;
      position: relative;
    }

    .header-content {
      background: var(--mat-app-glass-bg);
      border: 1px solid var(--mat-app-glass-border);
      backdrop-filter: var(--mat-app-glass-blur);
      border-radius: 24px;
      padding: 48px 32px;
      box-shadow: var(--mat-app-shadow-elevated);
      position: relative;
      overflow: hidden;
      transition: var(--mat-app-transition-normal);
    }

    .header-content::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: var(--mat-app-gradient-hero);
      border-radius: 24px 24px 0 0;
    }

    .header-content::after {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: conic-gradient(from 180deg, transparent, rgba(99, 102, 241, 0.03), transparent);
      animation: rotate 20s linear infinite;
      pointer-events: none;
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .header-content:hover {
      transform: translateY(-4px);
      box-shadow: var(--mat-app-shadow-elevated), 0 0 40px rgba(99, 102, 241, 0.2);
    }    .header-icon {
      margin-bottom: 24px;
      position: relative;
      z-index: 2;
    }

    .large-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      background: var(--mat-app-gradient-primary);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 4px 8px rgba(99, 102, 241, 0.3));
      animation: iconFloat 6s ease-in-out infinite;
    }

    @keyframes iconFloat {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }

    .profile-header h1 {
      margin: 0 0 12px 0;
      color: var(--mat-app-on-surface);
      font-weight: 700;
      font-size: 2.5rem;
      background: var(--mat-app-gradient-primary);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      position: relative;
      z-index: 2;
    }

    .profile-header p {
      margin: 0 0 32px 0;
      color: var(--mat-app-on-surface-variant);
      font-size: 18px;
      font-weight: 400;
      line-height: 1.6;
      position: relative;
      z-index: 2;
    }

    .header-divider {
      width: 80px;
      height: 4px;
      background: var(--mat-app-gradient-hero);
      margin: 0 auto;
      border-radius: 2px;
      position: relative;
      z-index: 2;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
    }    .message-container {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
      border-radius: 12px;
      font-size: 14px;
      box-shadow: var(--mat-app-shadow);
      backdrop-filter: blur(10px);
      border: 1px solid transparent;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .message-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
      transition: left 0.5s ease;
    }

    .message-container:hover::before {
      left: 100%;
    }

    .message-container.success {
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(129, 199, 132, 0.1) 100%);
      color: var(--mat-app-success);
      border-color: rgba(76, 175, 80, 0.3);
      box-shadow: 0 4px 16px rgba(76, 175, 80, 0.2);
    }

    .message-container.error {
      background: linear-gradient(135deg, rgba(207, 102, 121, 0.15) 0%, rgba(239, 154, 154, 0.1) 100%);
      color: var(--mat-app-error);
      border-color: rgba(207, 102, 121, 0.3);
      box-shadow: 0 4px 16px rgba(207, 102, 121, 0.2);
    }

    .profile-grid {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 32px;
      align-items: start;
    }

    @media (max-width: 768px) {
      .profile-grid {
        grid-template-columns: 1fr;
        gap: 24px;
      }
    }    .profile-sidebar {
      position: sticky;
      top: 24px;
      background: var(--mat-app-surface-container) !important;
      border-radius: 16px !important;
      box-shadow: var(--mat-app-shadow-elevated) !important;
      border: 1px solid var(--mat-app-outline-variant) !important;
      overflow: hidden;
      backdrop-filter: blur(20px);
      transition: all 0.3s ease;
    }

    .profile-sidebar:hover {
      border-color: var(--mat-app-outline) !important;
      box-shadow: 0 8px 32px rgba(99, 102, 241, 0.15) !important;
    }

    .profile-user-info {
      text-align: center;
      padding: 8px 0;
    }    .avatar-container {
      position: relative;
      display: inline-block;
      margin-bottom: 20px;
    }

    .avatar-wrapper {
      position: relative;
      width: 120px;
      height: 120px;
      margin: 0 auto;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--mat-app-primary) 0%, var(--mat-app-secondary) 100%);
      padding: 4px;
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
      transition: all 0.3s ease;
    }

    .avatar-wrapper:hover {
      transform: scale(1.05);
      box-shadow: 0 12px 32px rgba(99, 102, 241, 0.4);
    }

    .default-avatar-icon {
      width: 112px !important;
      height: 112px !important;
      font-size: 112px !important;
      border-radius: 50%;
      background: var(--mat-app-surface-container-high);
      color: var(--mat-app-on-surface-variant);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .avatar-image {
      width: 112px;
      height: 112px;
      border-radius: 50%;
      object-fit: cover;
      background: var(--mat-app-surface-container-high);
      transition: transform 0.3s ease;
    }

    .avatar-edit-button {
      position: absolute;
      bottom: 0;
      right: 0;
      background: var(--mat-app-primary) !important;
      color: var(--mat-app-on-primary) !important;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4) !important;
      border: 3px solid var(--mat-app-surface-container) !important;
      transition: all 0.3s ease;
    }

    .avatar-edit-button:hover {
      background: var(--mat-app-primary-container) !important;
      color: var(--mat-app-on-primary-container) !important;
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5) !important;
    }

    .user-email {
      color: var(--mat-app-on-surface-variant);
      margin-bottom: 20px;
      font-size: 14px;
    }    .profile-main {
      min-height: 600px;
      background: var(--mat-app-surface-container) !important;
      border-radius: 16px !important;
      box-shadow: var(--mat-app-shadow-elevated) !important;
      border: 1px solid var(--mat-app-outline-variant) !important;
      overflow: hidden;
      backdrop-filter: blur(20px);
      transition: all 0.3s ease;
    }

    .profile-main:hover {
      border-color: var(--mat-app-outline) !important;
      box-shadow: 0 8px 32px rgba(99, 102, 241, 0.15) !important;
    }

    .profile-form {
      padding: 32px 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-title {
      margin: 0 0 24px 0;
      color: var(--mat-app-on-surface);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-title::before {
      content: '';
      width: 4px;
      height: 24px;
      background: var(--mat-app-primary);
      border-radius: 2px;
    }

    .submit-button {
      margin-top: 16px;
      align-self: flex-start;
      min-width: 160px;
      border-radius: 8px !important;
      font-weight: 600;
      text-transform: none;
      box-shadow: var(--mat-app-shadow) !important;
    }

    .submit-button mat-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .security-content {
      padding: 32px 24px;
    }    .verification-card {
      margin: 24px 0;
      border-radius: 12px !important;
      border: none !important;
      box-shadow: var(--mat-app-shadow) !important;
      transition: all 0.3s ease;
    }

    .verification-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--mat-app-shadow-elevated) !important;
    }

    .verification-card.verified {
      background: var(--mat-app-surface-container) !important;
      border: 1px solid rgba(76, 175, 80, 0.3) !important;
      position: relative;
      overflow: hidden;
    }

    .verification-card.verified::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(135deg, #4caf50 0%, #81c784 100%);
    }

    .verification-card.pending {
      background: var(--mat-app-surface-container) !important;
      border: 1px solid rgba(255, 152, 0, 0.3) !important;
      position: relative;
      overflow: hidden;
    }

    .verification-card.pending::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(135deg, #ff9800 0%, #ffb74d 100%);
    }

    .verification-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .verification-info h4 {
      margin: 0 0 4px 0;
      color: var(--mat-app-on-surface);
      font-weight: 600;
    }

    .verification-info p {
      margin: 0;
      color: var(--mat-app-on-surface-variant);
      font-size: 14px;
    }

    .resending-text {
      font-size: 12px;
      color: var(--mat-app-on-surface-variant);
      padding: 8px 16px;
      background: var(--mat-app-surface-container-low);
      border: 1px solid var(--mat-app-outline-variant);
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      position: relative;
      overflow: hidden;
    }

    .resending-text::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% { left: -100%; }
      100% { left: 100%; }
    }    /* Material Form Field Customizations - Enhanced for Dark Theme */
    ::ng-deep .mat-mdc-form-field {
      width: 100%;
    }

    /* Background and surface colors */
    ::ng-deep .mat-mdc-text-field-wrapper {
      background-color: var(--mat-app-surface-container-low);
      border-radius: 12px;
    }

    /* Input text color */
    ::ng-deep .mat-mdc-form-field input {
      color: var(--mat-app-on-surface) !important;
      caret-color: var(--mat-app-primary);
    }

    ::ng-deep .mat-mdc-form-field textarea {
      color: var(--mat-app-on-surface) !important;
      caret-color: var(--mat-app-primary);
    }

    /* Placeholder text - Critical fix for dark theme */
    ::ng-deep .mat-mdc-form-field input::placeholder {
      color: var(--mat-app-on-surface-variant) !important;
      opacity: 0.7;
    }

    ::ng-deep .mat-mdc-form-field textarea::placeholder {
      color: var(--mat-app-on-surface-variant) !important;
      opacity: 0.7;
    }

    /* Label colors */
    ::ng-deep .mat-mdc-form-field .mat-mdc-floating-label {
      color: var(--mat-app-on-surface-variant) !important;
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-floating-label {
      color: var(--mat-app-primary) !important;
    }

    /* Hint text */
    ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-hint {
      color: var(--mat-app-on-surface-variant) !important;
    }

    /* Outline colors */
    ::ng-deep .mat-mdc-form-field .mdc-notched-outline__leading,
    ::ng-deep .mat-mdc-form-field .mdc-notched-outline__notch,
    ::ng-deep .mat-mdc-form-field .mdc-notched-outline__trailing {
      border-color: var(--mat-app-outline-variant) !important;
    }

    ::ng-deep .mat-mdc-form-field:hover .mdc-notched-outline__leading,
    ::ng-deep .mat-mdc-form-field:hover .mdc-notched-outline__notch,
    ::ng-deep .mat-mdc-form-field:hover .mdc-notched-outline__trailing {
      border-color: var(--mat-app-outline) !important;
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
      border-color: var(--mat-app-primary) !important;
      border-width: 2px !important;
    }

    /* Select fields */
    ::ng-deep .mat-mdc-select-value {
      color: var(--mat-app-on-surface) !important;
    }

    ::ng-deep .mat-mdc-select-placeholder {
      color: var(--mat-app-on-surface-variant) !important;
      opacity: 0.7;
    }

    /* Focus overlay */
    ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-focus-overlay {
      background-color: var(--mat-app-primary);
      opacity: 0.04;
    }    /* Enhanced Card Styling for Dark Theme */
    ::ng-deep .mat-mdc-card {
      background: var(--mat-app-surface-container) !important;
      color: var(--mat-app-on-surface) !important;
      border: 1px solid var(--mat-app-outline-variant) !important;
      transition: all 0.3s ease;
    }

    ::ng-deep .mat-mdc-card:hover {
      background: var(--mat-app-surface-container-high) !important;
      border-color: var(--mat-app-outline) !important;
      box-shadow: var(--mat-app-shadow-elevated) !important;
    }

    ::ng-deep .mat-mdc-card-content {
      color: var(--mat-app-on-surface) !important;
    }

    /* Card actions styling */
    mat-card-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      padding: 16px 24px !important;
      background: var(--mat-app-surface-container-low) !important;
      border-top: 1px solid var(--mat-app-outline-variant) !important;
      margin: 0 -24px -24px -24px;
    }    mat-chip-set {
      justify-content: center;
      margin-top: 8px;
    }

    /* Enhanced Chip Styling for Dark Theme */
    ::ng-deep .mat-mdc-chip {
      border-radius: 16px;
      font-weight: 500;
      border: 1px solid var(--mat-app-outline-variant);
      transition: all 0.3s ease;
    }

    ::ng-deep .mat-mdc-chip:hover {
      transform: translateY(-2px);
      box-shadow: var(--mat-app-shadow);
    }

    ::ng-deep .mat-mdc-chip.mat-accent {
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(129, 199, 132, 0.15) 100%) !important;
      color: var(--mat-app-success) !important;
      border-color: rgba(76, 175, 80, 0.4) !important;
    }

    ::ng-deep .mat-mdc-chip.mat-warn {
      background: linear-gradient(135deg, rgba(255, 152, 0, 0.2) 0%, rgba(255, 183, 77, 0.15) 100%) !important;
      color: var(--mat-app-warning) !important;
      border-color: rgba(255, 152, 0, 0.4) !important;
    }

    ::ng-deep .mat-mdc-chip .mat-icon {
      color: inherit;
    }/* Enhanced Tab Styling for Dark Theme */
    ::ng-deep .mat-mdc-tab-group {
      background: transparent;
    }

    ::ng-deep .mat-mdc-tab-header {
      border-bottom: 1px solid var(--mat-app-outline-variant) !important;
      background: var(--mat-app-surface-container-low) !important;
      margin: 0 -24px 0 -24px;
      padding: 0 24px;
    }

    ::ng-deep .mat-mdc-tab {
      color: var(--mat-app-on-surface-variant) !important;
      font-weight: 500;
      text-transform: none;
      transition: all 0.3s ease;
    }

    ::ng-deep .mat-mdc-tab:hover {
      color: var(--mat-app-on-surface) !important;
      background: var(--mat-app-surface-container) !important;
    }

    ::ng-deep .mat-mdc-tab.mdc-tab--active {
      color: var(--mat-app-primary) !important;
      background: var(--mat-app-surface-container) !important;
    }

    ::ng-deep .mat-mdc-tab .mdc-tab__text-label {
      color: inherit !important;
    }

    ::ng-deep .mat-mdc-tab-indicator .mdc-tab-indicator__content--underline {
      background-color: var(--mat-app-primary) !important;
      height: 3px;
      border-radius: 2px 2px 0 0;
    }

    /* Tab body */
    ::ng-deep .mat-mdc-tab-body-wrapper {
      background: var(--mat-app-surface-container);
    }    /* Enhanced Button Styling for Dark Theme */
    ::ng-deep .mat-mdc-raised-button.mat-primary {
      background-color: var(--mat-app-primary) !important;
      color: var(--mat-app-on-primary) !important;
      border: none !important;
      box-shadow: var(--mat-app-shadow) !important;
      transition: all 0.3s ease;
    }

    ::ng-deep .mat-mdc-raised-button.mat-primary:hover {
      background-color: var(--mat-app-primary-container) !important;
      color: var(--mat-app-on-primary-container) !important;
      box-shadow: var(--mat-app-shadow-elevated) !important;
      transform: translateY(-2px);
    }

    ::ng-deep .mat-mdc-raised-button.mat-accent {
      background-color: var(--mat-app-secondary) !important;
      color: var(--mat-app-on-secondary) !important;
      border: none !important;
      box-shadow: var(--mat-app-shadow) !important;
      transition: all 0.3s ease;
    }

    ::ng-deep .mat-mdc-raised-button.mat-accent:hover {
      background-color: var(--mat-app-secondary-container) !important;
      color: var(--mat-app-on-secondary-container) !important;
      box-shadow: var(--mat-app-shadow-elevated) !important;
      transform: translateY(-2px);
    }

    /* Enhanced Sign Out Button Styling */
    ::ng-deep .mat-mdc-raised-button.mat-warn {
      background: linear-gradient(135deg, var(--mat-app-error) 0%, #d32f2f 100%) !important;
      color: var(--mat-app-on-error) !important;
      border: none !important;
      box-shadow: 0 4px 12px rgba(211, 47, 47, 0.3) !important;
      transition: all 0.3s ease;
      font-weight: 600;
      position: relative;
      overflow: hidden;
    }

    ::ng-deep .mat-mdc-raised-button.mat-warn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s ease;
    }

    ::ng-deep .mat-mdc-raised-button.mat-warn:hover {
      background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%) !important;
      box-shadow: 0 6px 20px rgba(211, 47, 47, 0.4) !important;
      transform: translateY(-2px);
    }

    ::ng-deep .mat-mdc-raised-button.mat-warn:hover::before {
      left: 100%;
    }

    ::ng-deep .mat-mdc-raised-button.mat-warn:active {
      transform: translateY(0px);
      box-shadow: 0 2px 8px rgba(211, 47, 47, 0.3) !important;
    }

    /* Stroked button styling */
    ::ng-deep .mat-mdc-outlined-button {
      border-color: var(--mat-app-outline) !important;
      color: var(--mat-app-primary) !important;
      background: var(--mat-app-surface-container-low) !important;
      transition: all 0.3s ease;
    }

    ::ng-deep .mat-mdc-outlined-button:hover {
      border-color: var(--mat-app-primary) !important;
      background: var(--mat-app-primary-container) !important;
      color: var(--mat-app-on-primary-container) !important;
      transform: translateY(-1px);
      box-shadow: var(--mat-app-shadow) !important;
    }    /* Enhanced Responsive Design and Accessibility */
    @media (max-width: 768px) {
      .profile-container {
        padding: 16px;
      }
      
      .profile-form {
        padding: 24px 16px;
      }
      
      .security-content {
        padding: 24px 16px;
      }
      
      .header-content {
        padding: 24px 16px;
      }
      
      .verification-header {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }

      .profile-grid {
        gap: 16px;
      }

      .profile-sidebar,
      .profile-main {
        border-radius: 12px !important;
      }
    }

    @media (max-width: 600px) {
      .avatar-wrapper {
        width: 100px;
        height: 100px;
      }

      .default-avatar-icon {
        width: 92px !important;
        height: 92px !important;
        font-size: 92px !important;
      }

      .avatar-image {
        width: 92px;
        height: 92px;
      }
      
      mat-card-actions {
        flex-direction: column;
      }
      
      mat-card-actions button {
        width: 100%;
      }
      
      .large-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
      }

      .profile-header h1 {
        font-size: 2rem;
      }

      .header-content {
        padding: 20px 12px;
      }
    }

    @media (max-width: 480px) {
      .profile-container {
        padding: 12px;
      }

      .profile-form {
        padding: 16px 12px;
        gap: 16px;
      }

      .submit-button {
        width: 100%;
        min-width: unset;
      }

      .message-container {
        padding: 12px 16px;
        font-size: 13px;
      }

      .form-title {
        font-size: 1.1rem;
      }
    }

    /* High Contrast Mode Support */
    @media (prefers-contrast: high) {
      .profile-sidebar,
      .profile-main {
        border-width: 2px !important;
      }

      .avatar-wrapper {
        padding: 6px;
      }

      .message-container {
        border-width: 2px;
      }

      .verification-card {
        border-width: 2px !important;
      }
    }

    /* Reduced Motion Support */
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }

      .header-content::after {
        animation: none;
      }

      .large-icon {
        animation: none;
      }

      .submit-button mat-icon {
        animation: none;
      }
    }

    /* Global snackbar styles */
    ::ng-deep .success-snackbar {
      background-color: var(--mat-app-success) !important;
      color: white !important;
    }

    ::ng-deep .error-snackbar {
      background-color: var(--mat-app-error) !important;
      color: white !important;
    }

    /* Enhanced Select Dropdown Styling */
    ::ng-deep .mat-mdc-select-panel {
      background: var(--mat-app-surface-container) !important;
      border: 1px solid var(--mat-app-outline-variant) !important;
      border-radius: 12px !important;
      box-shadow: var(--mat-app-shadow-elevated) !important;
      backdrop-filter: blur(20px);
    }

    ::ng-deep .mat-mdc-option {
      color: var(--mat-app-on-surface) !important;
      transition: all 0.3s ease;
    }

    ::ng-deep .mat-mdc-option:hover {
      background: var(--mat-app-surface-container-high) !important;
      color: var(--mat-app-on-surface) !important;
    }

    ::ng-deep .mat-mdc-option.mdc-list-item--selected {
      background: var(--mat-app-primary-container) !important;
      color: var(--mat-app-on-primary-container) !important;
    }

    /* Enhanced Error Styling */
    ::ng-deep .mat-mdc-form-field-error {
      color: var(--mat-app-error) !important;
      font-size: 12px;
      margin-top: 4px;
    }

    ::ng-deep .mat-mdc-form-field.mat-form-field-invalid .mdc-notched-outline__leading,
    ::ng-deep .mat-mdc-form-field.mat-form-field-invalid .mdc-notched-outline__notch,
    ::ng-deep .mat-mdc-form-field.mat-form-field-invalid .mdc-notched-outline__trailing {
      border-color: var(--mat-app-error) !important;
    }

    /* Enhanced focus for inputs */
    ::ng-deep .mat-mdc-form-field input:focus,
    ::ng-deep .mat-mdc-form-field textarea:focus {
      outline: none;
    }

    /* Enhanced loading state */
    .submit-button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      pointer-events: none;
    }

    .submit-button:disabled mat-icon {
      animation: spin 1s linear infinite;
    }
  `]
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService); // Composed service for general auth operations
  private profileService = inject(ProfileService); // Specific service for profile data
  private authStateService = inject(AuthStateService); // For current user state

  profileForm: FormGroup;
  preferencesForm: FormGroup;
  passwordForm: FormGroup;

  currentUser = this.authStateService.user; // Use signal from AuthStateService

  isUpdatingProfile = signal(false);
  isUpdatingPreferences = signal(false);
  isChangingPassword = signal(false);
  isResendingVerification = signal(false);

  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  activeTab = signal<'profile' | 'preferences' | 'security'>('profile');
  tabs = [
    { id: 'profile' as const, name: 'Profile Details' },
    { id: 'preferences' as const, name: 'Agent Preferences' },
    { id: 'security' as const, name: 'Security' }
  ];
  
  // Map to track active tab index for MatTabGroup
  private tabIndexMap: { [key: number]: 'profile' | 'preferences' | 'security' } = {
    0: 'profile',
    1: 'preferences',
    2: 'security'
  };

  constructor() {
    this.profileForm = this.fb.nonNullable.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      nickname: [''],
      bio: ['', [Validators.maxLength(250)]]
    });

    this.preferencesForm = this.fb.nonNullable.group({
      language: ['en', Validators.required],
      communicationStyle: ['neutral', Validators.required],
      interests: [''] // Stored as comma-separated string, converted to array on save
    });

    this.passwordForm = this.fb.nonNullable.group({
      currentPassword: ['', [Validators.required]], // Consider removing if not changing password
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmNewPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  setActiveTab(tabId: 'profile' | 'preferences' | 'security') {
    this.activeTab.set(tabId);
  }
  
  // Helper method for the Material Tab Group
  onTabIndexChange(index: number): void {
    const tabId = this.tabIndexMap[index];
    if (tabId) {
      this.activeTab.set(tabId);
    }
  }
  
  // Get current active tab index
  getActiveTabIndex(): number {
    switch (this.activeTab()) {
      case 'profile': return 0;
      case 'preferences': return 1;
      case 'security': return 2;
      default: return 0;
    }
  }

  ngOnInit() {
    this.loadUserProfile();
    // Effect to clear messages when tab changes
    // Removed inject(Router) as it's already available via this.router
    this.router.events.subscribe(() => { // Changed to use this.router
      this.clearMessages();
    });
  }

  private loadUserProfile() {
    const user = this.currentUser();
    if (user) {
      this.profileForm.patchValue({
        displayName: user.displayName || '',
        nickname: user.nickname || '',
        bio: user.bio || ''
      });
      this.preferencesForm.patchValue({
        language: user.preferences?.language || 'en',
        communicationStyle: user.preferences?.communicationStyle || 'neutral',
        interests: user.preferences?.interests?.join(', ') || ''
      });
    }
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword');
    const confirmNewPassword = control.get('confirmNewPassword');
    return newPassword && confirmNewPassword && newPassword.value !== confirmNewPassword.value ? { passwordMismatch: true } : null;
  }

  private clearMessages() {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }
  private showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
    this.successMessage.set(message);
    this.errorMessage.set(null);
    setTimeout(() => this.successMessage.set(null), 5000);
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 7000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
    this.errorMessage.set(message);
    this.successMessage.set(null);
    setTimeout(() => this.errorMessage.set(null), 7000);
  }

  async updateProfile() {
    if (!this.profileForm.valid) return;
    this.isUpdatingProfile.set(true);
    this.clearMessages();

    try {
      const formValue = this.profileForm.value;
      const profileData: Partial<AuthUser> = {
        displayName: formValue.displayName,
        nickname: formValue.nickname,
        bio: formValue.bio
      };

      const { error } = await this.profileService.updateProfile(profileData);
      if (error) {
        this.showError(typeof error === 'string' ? error : 'Failed to update profile.');
      } else {
        this.showSuccess('Profile updated successfully!');
        // Optionally refresh user data if not handled reactively by AuthStateService
        // await this.authStateService.refreshUser(); 
      }
    } catch (err: any) {
      this.showError(err.message || 'An unexpected error occurred.');
    } finally {
      this.isUpdatingProfile.set(false);
    }
  }

  async updatePreferences() {
    if (!this.preferencesForm.valid) return;
    this.isUpdatingPreferences.set(true);
    this.clearMessages();

    try {
      const formValue = this.preferencesForm.value;
      const interestsArray = formValue.interests ? formValue.interests.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];
      
      const preferencesData: Partial<UserPreferences> = {
        language: formValue.language,
        communicationStyle: formValue.communicationStyle,
        interests: interestsArray
      };
      
      const { error } = await this.profileService.updatePreferences(preferencesData);
      if (error) {
         this.showError(typeof error === 'string' ? error : 'Failed to update preferences.');
      } else {
        this.showSuccess('Preferences updated successfully!');
         // Optionally refresh user data
        // await this.authStateService.refreshUser();
      }
    } catch (err: any) {
      this.showError(err.message || 'An unexpected error occurred.');
    } finally {
      this.isUpdatingPreferences.set(false);
    }
  }

  async changePassword() {
    if (!this.passwordForm.valid) return;
    this.isChangingPassword.set(true);
    this.clearMessages();

    try {
      const { newPassword } = this.passwordForm.value;
      // The composed AuthService should have updatePassword
      const { error } = await this.authService.updatePassword(newPassword); 
      if (error) {
        this.showError(error.message || 'Failed to change password.');
      } else {
        this.showSuccess('Password changed successfully!');
        this.passwordForm.reset();
      }
    } catch (err: any) {
      this.showError(err.message || 'An unexpected error occurred.');
    } finally {
      this.isChangingPassword.set(false);
    }
  }

  async resendVerification() {
    const user = this.currentUser();
    if (!user?.email || user.emailConfirmed) return;

    this.isResendingVerification.set(true);
    this.clearMessages();
    try {
      // The composed AuthService should have resendConfirmation
      const { error } = await this.authService.resendConfirmation(user.email);
      if (error) {
        this.showError(typeof error === 'string' ? error : 'Failed to resend verification email.');
      } else {
        this.showSuccess('Verification email sent! Please check your inbox.');
      }
    } catch (err: any) {
      this.showError(err.message || 'An unexpected error occurred.');
    } finally {
      this.isResendingVerification.set(false);
    }
  }
  async signOut() {
    this.clearMessages();
    await this.authService.signOut(); // Composed service
    this.router.navigate(['/auth/login']);
  }
}
