/**
 * Password Strength Indicator Component
 * Visual feedback component for password strength with animations
 * Following Material Design 3.0 principles
 */

import { Component, Input, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MaterialModule } from '../../../shared/modules/material.module';
import { PasswordStrength, PasswordStrengthValidator } from '../../../core/validators/password-strength.validator';

@Component({
  selector: 'app-password-strength-indicator',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="password-strength-container" [class.visible]="passwordSignal() && passwordSignal().length > 0" role="region" aria-label="Password strength feedback">
      <!-- Strength Bar -->
      <div class="strength-bar-container">
        <div class="strength-label" aria-live="polite">
          <span [style.color]="strengthColor()">{{ strengthLabel() }}</span>
          <span class="strength-score">{{ currentStrength.score }}/5</span>
        </div>
        <div class="strength-bar">
          @for (segment of strengthSegments; track $index) {
            <div 
              class="strength-segment"
              [class.active]="$index < currentStrength.score"
              [style.background-color]="$index < currentStrength.score ? strengthColor() : 'var(--mat-app-surface-variant)'"
            ></div>
          }
        </div>
      </div>

      <!-- Criteria Checklist -->
      <div class="criteria-container" [class.expanded]="showDetails()">
        <button 
          mat-button 
          class="toggle-details" 
          (click)="toggleDetails()"
          type="button"
          [attr.aria-expanded]="showDetails()"
          aria-controls="criteria-details"
        >
          <mat-icon>{{ showDetails() ? 'expand_less' : 'expand_more' }}</mat-icon>
          {{ showDetails() ? 'Hide' : 'Show' }} Requirements
        </button>
        
        @if (showDetails()) {
          <div id="criteria-details" class="criteria-list" [@slideDown]>
            <div class="criteria-section">
              <h4>Requirements</h4>
              <div class="criteria-items">
                <div class="criteria-item" [class.met]="currentStrength.criteria.length" aria-label="At least 8 characters" tabindex="0">
                  <mat-icon [color]="currentStrength.criteria.length ? 'primary' : ''">
                    {{ currentStrength.criteria.length ? 'check_circle' : 'radio_button_unchecked' }}
                  </mat-icon>
                  <span>At least 8 characters</span>
                </div>
                <div class="criteria-item" [class.met]="currentStrength.criteria.lowercase" aria-label="Lowercase letter (a-z)" tabindex="0">
                  <mat-icon [color]="currentStrength.criteria.lowercase ? 'primary' : ''">
                    {{ currentStrength.criteria.lowercase ? 'check_circle' : 'radio_button_unchecked' }}
                  </mat-icon>
                  <span>Lowercase letter (a-z)</span>
                </div>
                <div class="criteria-item" [class.met]="currentStrength.criteria.uppercase" aria-label="Uppercase letter (A-Z)" tabindex="0">
                  <mat-icon [color]="currentStrength.criteria.uppercase ? 'primary' : ''">
                    {{ currentStrength.criteria.uppercase ? 'check_circle' : 'radio_button_unchecked' }}
                  </mat-icon>
                  <span>Uppercase letter (A-Z)</span>
                </div>
                <div class="criteria-item" [class.met]="currentStrength.criteria.numbers" aria-label="Number (0-9)" tabindex="0">
                  <mat-icon [color]="currentStrength.criteria.numbers ? 'primary' : ''">
                    {{ currentStrength.criteria.numbers ? 'check_circle' : 'radio_button_unchecked' }}
                  </mat-icon>
                  <span>Number (0-9)</span>
                </div>
                <div class="criteria-item" [class.met]="currentStrength.criteria.symbols" aria-label="Special character (symbols)" tabindex="0">
                  <mat-icon [color]="currentStrength.criteria.symbols ? 'primary' : ''">
                    {{ currentStrength.criteria.symbols ? 'check_circle' : 'radio_button_unchecked' }}
                  </mat-icon>
                  <span>Special character (!#$%&amp;*)</span>
                </div>
              </div>
            </div>

            @if (currentStrength.warnings && currentStrength.warnings.length > 0) {
              <div class="warnings-section" role="alert" aria-live="assertive">
                <h4>⚠️ Security Warnings</h4>
                <div class="warning-items">
                  @for (warning of currentStrength.warnings; track warning) {
                    <div class="warning-item">
                      <mat-icon color="warn">warning</mat-icon>
                      <span>{{ warning }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            @if (currentStrength.suggestions && currentStrength.suggestions.length > 0) {
              <div class="suggestions-section" aria-live="polite">
                <h4>💡 Suggestions</h4>
                <div class="suggestion-items">
                  @for (suggestion of currentStrength.suggestions; track suggestion) {
                    <div class="suggestion-item">
                      <mat-icon color="accent">lightbulb</mat-icon>
                      <span>{{ suggestion }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .password-strength-container {
      margin-top: 0.5rem;
      opacity: 0;
      transform: translateY(-10px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      max-height: 0;
      overflow: hidden;
    }

    .password-strength-container.visible {
      opacity: 1;
      transform: translateY(0);
      max-height: 500px;
    }

    .strength-bar-container {
      margin-bottom: 0.75rem;
    }

    .strength-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .strength-score {
      color: var(--mat-app-on-surface-variant);
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background: var(--mat-app-surface-variant);
      border-radius: 8px;
    }

    .strength-bar {
      display: flex;
      gap: 2px;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      background: var(--mat-app-surface-variant);
    }

    .strength-segment {
      flex: 1;
      background: var(--mat-app-surface-variant);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 1px;
    }

    .strength-segment.active {
      transform: scaleY(1.2);
      box-shadow: 0 0 8px currentColor;
    }

    .toggle-details {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 1rem;
      margin: 1.5rem 0;
      border: 3px solid var(--mat-app-primary);
      border-radius: 12px;
      background: var(--mat-app-primary-dark);
      color: white;
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);
    }

    .toggle-details:hover {
      background: var(--mat-app-primary);
      border-color: var(--mat-app-primary-light);
      color: var(--mat-app-on-primary);
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(99, 102, 241, 0.5);
    }

    .criteria-list {
      margin-top: 1rem;
      padding: 1rem;
      background: var(--mat-app-surface);
      border: 1px solid var(--mat-app-outline-variant);
      border-radius: 12px;
      animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .criteria-section h4,
    .warnings-section h4,
    .suggestions-section h4 {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--mat-app-on-surface);
    }

    .criteria-items,
    .warning-items,
    .suggestion-items {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .criteria-item,
    .warning-item,
    .suggestion-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      border-radius: 8px;
      background: var(--mat-app-surface-variant);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-size: 0.875rem;
    }

    .criteria-item.met {
      background: rgba(16, 185, 129, 0.1);
      color: var(--mat-app-success);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .criteria-item .mat-icon {
      font-size: 18px;
      height: 18px;
      width: 18px;
    }

    .warning-item {
      background: rgba(239, 68, 68, 0.1);
      color: var(--mat-app-error);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .suggestion-item {
      background: rgba(139, 92, 246, 0.1);
      color: var(--mat-app-accent);
      border: 1px solid rgba(139, 92, 246, 0.3);
    }

    .warnings-section,
    .suggestions-section {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--mat-app-outline-variant);
    }

    /* Mobile optimizations */
    @media (max-width: 600px) {
      .criteria-list {
        padding: 0.75rem;
      }
      
      .criteria-item,
      .warning-item,
      .suggestion-item {
        padding: 0.375rem;
        font-size: 0.8125rem;
      }
      
      .criteria-item .mat-icon {
        font-size: 16px;
        height: 16px;
        width: 16px;
      }
    }
  `],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class PasswordStrengthIndicatorComponent {
  readonly passwordSignal = signal('');
  
  @Input() 
  set password(value: string) {
    this.passwordSignal.set(value || '');
  }
  
  get password() {
    return this.passwordSignal();
  }

  readonly showDetails = signal(false);
  readonly strengthSegments = [1, 2, 3, 4, 5];
  
  readonly strength = computed(() => {
    const pwd = this.passwordSignal();
    return pwd ? PasswordStrengthValidator.validatePassword(pwd) : null;
  });

  // Getter para acceso seguro a strength con valores por defecto
  get currentStrength(): PasswordStrength {
    return this.strength() || {
      score: 0,
      feedback: [],
      warnings: [],
      suggestions: [],
      isValid: false,
      criteria: {
        length: false,
        lowercase: false,
        uppercase: false,
        numbers: false,
        symbols: false,
        commonPassword: false,
        sequential: false,
        repeated: false
      }
    };
  }
  
  readonly strengthColor = computed(() => {
    const score = this.currentStrength.score;
    return PasswordStrengthValidator.getStrengthColor(score);
  });
  
  readonly strengthLabel = computed(() => {
    const score = this.currentStrength.score;
    return PasswordStrengthValidator.getStrengthLabel(score);
  });

  toggleDetails(): void {
    this.showDetails.update(show => !show);
  }
}
