/**
 * Password Strength Validator
 * Provides comprehensive password validation with real-time feedback
 * Following 2025 best practices for security and UX
 */

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface PasswordStrength {
  score: number; // 0-5 (0: very weak, 5: excellent)
  feedback: string[];
  warnings: string[];
  suggestions: string[];
  isValid: boolean;
  criteria: {
    length: boolean;
    lowercase: boolean;
    uppercase: boolean;
    numbers: boolean;
    symbols: boolean;
    commonPassword: boolean;
    sequential: boolean;
    repeated: boolean;
  };
}

export class PasswordStrengthValidator {
  private static readonly COMMON_PASSWORDS = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'iloveyou',
    'master', 'login', 'pass', 'test', 'guest', 'user', 'root', 'administrator'
  ];

  private static readonly SEQUENTIAL_PATTERNS = [
    'abcdefghijklmnopqrstuvwxyz',
    '01234567890',
    'qwertyuiopasdfghjklzxcvbnm'
  ];

  static validatePassword(password: string): PasswordStrength {
    const criteria = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /[0-9]/.test(password),
      symbols: /[^A-Za-z0-9]/.test(password),
      commonPassword: !this.isCommonPassword(password),
      sequential: !this.hasSequentialChars(password),
      repeated: !this.hasRepeatedChars(password)
    };

    const score = this.calculateScore(password, criteria);
    const feedback = this.generateFeedback(criteria, password);
    const warnings = this.generateWarnings(criteria, password);
    const suggestions = this.generateSuggestions(criteria, password);

    return {
      score,
      feedback,
      warnings,
      suggestions,
      isValid: score >= 3 && criteria.length,
      criteria
    };
  }

  static passwordStrengthValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const strength = this.validatePassword(control.value);
      
      if (!strength.isValid) {
        return {
          passwordStrength: {
            score: strength.score,
            feedback: strength.feedback,
            warnings: strength.warnings,
            suggestions: strength.suggestions
          }
        };
      }

      return null;
    };
  }

  private static calculateScore(password: string, criteria: any): number {
    let score = 0;
    
    // Length scoring
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    
    // Character variety scoring
    if (criteria.lowercase) score += 0.5;
    if (criteria.uppercase) score += 0.5;
    if (criteria.numbers) score += 0.5;
    if (criteria.symbols) score += 0.5;
    
    // Security checks
    if (criteria.commonPassword) score += 0.5;
    if (criteria.sequential) score += 0.5;
    if (criteria.repeated) score += 0.5;
    
    // Bonus for entropy
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.8) score += 0.5;
    
    return Math.min(Math.round(score), 5);
  }

  private static generateFeedback(criteria: any, password: string): string[] {
    const feedback: string[] = [];
    
    if (criteria.length) {
      feedback.push('✓ Length requirement met');
    }
    if (criteria.lowercase) {
      feedback.push('✓ Contains lowercase letters');
    }
    if (criteria.uppercase) {
      feedback.push('✓ Contains uppercase letters');
    }
    if (criteria.numbers) {
      feedback.push('✓ Contains numbers');
    }
    if (criteria.symbols) {
      feedback.push('✓ Contains special characters');
    }
    
    return feedback;
  }

  private static generateWarnings(criteria: any, password: string): string[] {
    const warnings: string[] = [];
    
    if (!criteria.commonPassword) {
      warnings.push('⚠️ This is a commonly used password');
    }
    if (!criteria.sequential) {
      warnings.push('⚠️ Avoid sequential characters');
    }
    if (!criteria.repeated) {
      warnings.push('⚠️ Too many repeated characters');
    }
    
    return warnings;
  }

  private static generateSuggestions(criteria: any, password: string): string[] {
    const suggestions: string[] = [];
    
    if (!criteria.length) {
      suggestions.push('Use at least 8 characters (12+ recommended)');
    }
    if (!criteria.lowercase) {
      suggestions.push('Add lowercase letters (a-z)');
    }
    if (!criteria.uppercase) {
      suggestions.push('Add uppercase letters (A-Z)');
    }
    if (!criteria.numbers) {
      suggestions.push('Add numbers (0-9)');
    }
    if (!criteria.symbols) {
      suggestions.push('Add special characters (!@#$%^&*)');
    }
    
    if (password.length < 12) {
      suggestions.push('Consider using 12+ characters for better security');
    }
    
    return suggestions;
  }

  private static isCommonPassword(password: string): boolean {
    const lowerPassword = password.toLowerCase();
    return this.COMMON_PASSWORDS.some(common => 
      lowerPassword.includes(common) || common.includes(lowerPassword)
    );
  }

  private static hasSequentialChars(password: string): boolean {
    const lowerPassword = password.toLowerCase();
    
    for (const pattern of this.SEQUENTIAL_PATTERNS) {
      for (let i = 0; i <= pattern.length - 3; i++) {
        const sequence = pattern.substring(i, i + 3);
        const reverseSequence = sequence.split('').reverse().join('');
        
        if (lowerPassword.includes(sequence) || lowerPassword.includes(reverseSequence)) {
          return true;
        }
      }
    }
    
    return false;
  }

  private static hasRepeatedChars(password: string): boolean {
    // Check for more than 2 consecutive repeated characters
    const repeatedPattern = /(.)\1{2,}/;
    return repeatedPattern.test(password);
  }

  static getStrengthColor(score: number): string {
    switch (score) {
      case 0:
      case 1:
        return 'var(--mat-app-error)';
      case 2:
        return 'var(--mat-app-warning)';
      case 3:
        return '#f59e0b'; // amber
      case 4:
        return 'var(--mat-app-secondary)';
      case 5:
        return 'var(--mat-app-success)';
      default:
        return 'var(--mat-app-surface-variant)';
    }
  }

  static getStrengthLabel(score: number): string {
    switch (score) {
      case 0:
      case 1:
        return 'Very Weak';
      case 2:
        return 'Weak';
      case 3:
        return 'Fair';
      case 4:
        return 'Strong';
      case 5:
        return 'Excellent';
      default:
        return 'Unknown';
    }
  }
}
