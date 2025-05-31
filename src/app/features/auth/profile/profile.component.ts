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
        </div>

        <!-- Success/Error Messages -->
        <div *ngIf="successMessage()" class="message-container success">
          <mat-icon>check_circle</mat-icon>
          {{ successMessage() }}
        </div>
        <div *ngIf="errorMessage()" class="message-container error">
          <mat-icon>error</mat-icon>
          {{ errorMessage() }}
        </div>

        <!-- Main Grid -->
        <div class="profile-grid">
          <!-- Left Column: Avatar & Basic Info -->
          <mat-card class="profile-sidebar">
            <mat-card-content>
              <div class="profile-user-info">                <div class="avatar-container">
                  <div class="avatar-wrapper">
                    <mat-icon 
                      *ngIf="!currentUser()?.avatarUrl" 
                      class="default-avatar-icon">
                      account_circle
                    </mat-icon>
                    <img
                      *ngIf="currentUser()?.avatarUrl"
                      [src]="currentUser()?.avatarUrl"
                      alt="User Avatar"
                      class="avatar-image"
                    />
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
                      <input matInput formControlName="displayName" placeholder="Your public name" required>
                      <mat-error *ngIf="profileForm.get('displayName')?.hasError('required')">
                        Display name is required
                      </mat-error>
                      <mat-error *ngIf="profileForm.get('displayName')?.hasError('minlength')">
                        Display name must be at least 3 characters
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Nickname (Optional)</mat-label>
                      <input matInput formControlName="nickname" placeholder="A friendly name for the agent to use">
                      <mat-hint>A friendly name for the agent to use</mat-hint>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Bio (Optional)</mat-label>
                      <textarea matInput formControlName="bio" placeholder="Tell us a bit about yourself..." rows="3" matTextareaAutosize></textarea>
                      <mat-hint>{{ profileForm.get('bio')?.value?.length || 0 }}/250 characters</mat-hint>
                      <mat-error *ngIf="profileForm.get('bio')?.hasError('maxlength')">
                        Bio cannot exceed 250 characters
                      </mat-error>
                    </mat-form-field>

                    <button 
                      mat-raised-button 
                      color="primary" 
                      type="submit" 
                      [disabled]="profileForm.invalid || isUpdatingProfile()"
                      class="submit-button">
                      <mat-icon *ngIf="isUpdatingProfile()">sync</mat-icon>
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
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Interests (Optional)</mat-label>
                      <input matInput formControlName="interests" placeholder="e.g., technology, hiking, art">
                      <mat-hint>Comma-separated interests to help the agent personalize suggestions</mat-hint>
                    </mat-form-field>

                    <button 
                      mat-raised-button 
                      color="accent" 
                      type="submit" 
                      [disabled]="preferencesForm.invalid || isUpdatingPreferences()"
                      class="submit-button">
                      <mat-icon *ngIf="isUpdatingPreferences()">sync</mat-icon>
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
                          <button 
                            *ngIf="!currentUser()?.emailConfirmed && !isResendingVerification()"
                            mat-button 
                            color="warn"
                            (click)="resendVerification()">
                            Resend Email
                          </button>
                          <span *ngIf="isResendingVerification()" class="resending-text">Sending...</span>
                        </div>
                      </mat-card-content>
                    </mat-card>

                    <!-- Password Change Form -->
                    <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="profile-form">
                      <mat-form-field appearance="outline">
                        <mat-label>Current Password</mat-label>
                        <input matInput type="password" formControlName="currentPassword" placeholder="Enter current password" required>
                        <mat-error *ngIf="passwordForm.get('currentPassword')?.hasError('required')">
                          Current password is required
                        </mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>New Password</mat-label>
                        <input matInput type="password" formControlName="newPassword" placeholder="Enter new password" required>
                        <mat-hint>Minimum 8 characters</mat-hint>
                        <mat-error *ngIf="passwordForm.get('newPassword')?.hasError('required')">
                          New password is required
                        </mat-error>
                        <mat-error *ngIf="passwordForm.get('newPassword')?.hasError('minlength')">
                          Password must be at least 8 characters long
                        </mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Confirm New Password</mat-label>
                        <input matInput type="password" formControlName="confirmNewPassword" placeholder="Confirm new password" required>
                        <mat-error *ngIf="passwordForm.get('confirmNewPassword')?.hasError('required')">
                          Please confirm your new password
                        </mat-error>
                        <mat-error *ngIf="passwordForm.hasError('passwordMismatch') && passwordForm.get('confirmNewPassword')?.touched">
                          Passwords do not match
                        </mat-error>
                      </mat-form-field>

                      <button 
                        mat-raised-button 
                        color="warn" 
                        type="submit" 
                        [disabled]="passwordForm.invalid || isChangingPassword()"
                        class="submit-button">
                        <mat-icon *ngIf="isChangingPassword()">sync</mat-icon>
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
    }

    .message-container {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
      border-radius: 12px;
      font-size: 14px;
      box-shadow: var(--mat-app-shadow);
      backdrop-filter: blur(10px);
    }

    .message-container.success {
      background: rgba(76, 175, 80, 0.15);
      color: var(--mat-app-success);
      border: 1px solid rgba(76, 175, 80, 0.3);
    }

    .message-container.error {
      background: rgba(207, 102, 121, 0.15);
      color: var(--mat-app-error);
      border: 1px solid rgba(207, 102, 121, 0.3);
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
    }

    .profile-sidebar {
      position: sticky;
      top: 24px;
      background: var(--mat-app-surface) !important;
      border-radius: 16px !important;
      box-shadow: var(--mat-app-shadow-elevated) !important;
      border: 1px solid rgba(99, 102, 241, 0.1) !important;
      overflow: hidden;
    }

    .profile-user-info {
      text-align: center;
      padding: 8px 0;
    }

    .avatar-container {
      position: relative;
      display: inline-block;
      margin-bottom: 20px;
    }

    .avatar-image {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid var(--mat-app-primary);
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .avatar-image:hover {
      transform: scale(1.05);
      box-shadow: 0 12px 32px rgba(99, 102, 241, 0.4);
    }

    .avatar-edit-button {
      position: absolute;
      bottom: 0;
      right: 0;
      background: var(--mat-app-primary) !important;
      color: white !important;
      box-shadow: var(--mat-app-shadow) !important;
    }

    .user-email {
      color: var(--mat-app-on-surface-variant);
      margin-bottom: 20px;
      font-size: 14px;
    }

    .profile-main {
      min-height: 600px;
      background: var(--mat-app-surface) !important;
      border-radius: 16px !important;
      box-shadow: var(--mat-app-shadow-elevated) !important;
      border: 1px solid rgba(99, 102, 241, 0.1) !important;
      overflow: hidden;
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
    }

    .verification-card {
      margin: 24px 0;
      border-radius: 12px !important;
      border: none !important;
      box-shadow: var(--mat-app-shadow) !important;
    }

    .verification-card.verified {
      background: rgba(76, 175, 80, 0.1) !important;
      border: 1px solid rgba(76, 175, 80, 0.2) !important;
    }

    .verification-card.pending {
      background: rgba(255, 152, 0, 0.1) !important;
      border: 1px solid rgba(255, 152, 0, 0.2) !important;
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
      background: var(--mat-app-surface-variant);
      border-radius: 6px;
    }

    /* Material Form Field Customizations */
    ::ng-deep .mat-mdc-form-field {
      width: 100%;
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-focus-overlay {
      background-color: var(--mat-app-primary);
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-form-field-label {
      color: var(--mat-app-primary);
    }

    ::ng-deep .mat-mdc-form-field .mdc-outlined-text-field--focused .mdc-notched-outline__leading,
    ::ng-deep .mat-mdc-form-field .mdc-outlined-text-field--focused .mdc-notched-outline__notch,
    ::ng-deep .mat-mdc-form-field .mdc-outlined-text-field--focused .mdc-notched-outline__trailing {
      border-color: var(--mat-app-primary);
    }

    ::ng-deep .mat-mdc-card {
      background: var(--mat-app-surface);
      color: var(--mat-app-on-surface);
    }

    mat-card-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      padding: 16px 24px !important;
      background: var(--mat-app-surface-variant);
      margin: 0 -24px -24px -24px;
    }

    mat-chip-set {
      justify-content: center;
      margin-top: 8px;
    }

    ::ng-deep .mat-mdc-chip {
      border-radius: 16px;
      font-weight: 500;
    }

    ::ng-deep .mat-mdc-chip.mat-accent {
      background-color: rgba(76, 175, 80, 0.2);
      color: var(--mat-app-success);
    }

    ::ng-deep .mat-mdc-chip.mat-warn {
      background-color: rgba(255, 152, 0, 0.2);
      color: var(--mat-app-warning);
    }

    /* Tab styling */
    ::ng-deep .mat-mdc-tab-group {
      background: transparent;
    }

    ::ng-deep .mat-mdc-tab-header {
      border-bottom: 1px solid rgba(99, 102, 241, 0.1);
      background: var(--mat-app-surface-variant);
      margin: 0 -24px 0 -24px;
      padding: 0 24px;
    }

    ::ng-deep .mat-mdc-tab {
      color: var(--mat-app-on-surface-variant);
      font-weight: 500;
      text-transform: none;
    }

    ::ng-deep .mat-mdc-tab.mdc-tab--active {
      color: var(--mat-app-primary);
    }

    ::ng-deep .mat-mdc-tab-indicator .mdc-tab-indicator__content--underline {
      background-color: var(--mat-app-primary);
      height: 3px;
      border-radius: 2px 2px 0 0;
    }

    /* Button styling */
    ::ng-deep .mat-mdc-raised-button.mat-primary {
      background-color: var(--mat-app-primary);
      color: var(--mat-app-on-primary);
    }

    ::ng-deep .mat-mdc-raised-button.mat-accent {
      background-color: var(--mat-app-secondary);
      color: var(--mat-app-on-secondary);
    }

    ::ng-deep .mat-mdc-raised-button.mat-warn {
      background-color: var(--mat-app-error);
      color: var(--mat-app-on-error);
    }

    ::ng-deep .mat-mdc-outlined-button {
      border-color: var(--mat-app-primary);
      color: var(--mat-app-primary);
    }

    /* Responsive adjustments */
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
    }

    @media (max-width: 600px) {
      .avatar-image {
        width: 100px;
        height: 100px;
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

    /* Loading animation enhancement */
    .submit-button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    /* Hover effects */
    .profile-sidebar:hover,
    .profile-main:hover {
      transform: translateY(-2px);
      transition: transform 0.3s ease;
    }

    /* Focus enhancements */
    button:focus-visible {
      outline: 2px solid var(--mat-app-primary);
      outline-offset: 2px;
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
