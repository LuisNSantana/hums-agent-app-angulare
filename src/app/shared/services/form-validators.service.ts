/**
 * Custom Form Validators Service
 * Following Angular 20+ best practices for form validation
 * Clean Architecture with reusable validation logic
 */

import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class FormValidatorsService {

  /**
   * Password match validator for form groups
   * Validates that password and confirmPassword fields match
   * 
   * @param passwordFieldName - Name of the password field (default: 'password')
   * @param confirmPasswordFieldName - Name of the confirm password field (default: 'confirmPassword')
   * @returns ValidatorFn that can be used with FormGroup
   * 
   * @example
   * ```typescript
   * const form = this.fb.group({
   *   password: ['', [Validators.required, Validators.minLength(8)]],
   *   confirmPassword: ['', [Validators.required]]
   * }, { 
   *   validators: this.formValidators.passwordMatch() 
   * });
   * ```
   */
  passwordMatch(
    passwordFieldName: string = 'password',
    confirmPasswordFieldName: string = 'confirmPassword'
  ): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get(passwordFieldName);
      const confirmPassword = control.get(confirmPasswordFieldName);

      // Return null if controls don't exist
      if (!password || !confirmPassword) {
        return null;
      }

      // Return null if both fields are empty (other validators will handle required)
      if (!password.value && !confirmPassword.value) {
        return null;
      }

      // Check if passwords match
      if (password.value !== confirmPassword.value) {
        // Set error on the confirm password field
        confirmPassword.setErrors({ passwordMismatch: true });
        return { passwordMismatch: true };
      } else {
        // Clear the password mismatch error if passwords match
        // But preserve other errors if they exist
        const errors = confirmPassword.errors;
        if (errors) {
          delete errors['passwordMismatch'];
          confirmPassword.setErrors(Object.keys(errors).length ? errors : null);
        }
        return null;
      }
    };
  }

  /**
   * Strong password validator
   * Validates password strength with configurable requirements
   * 
   * @param options - Configuration for password strength requirements
   * @returns ValidatorFn for password strength validation
   */
  strongPassword(options: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  } = {}): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const {
        minLength = 8,
        requireUppercase = true,
        requireLowercase = true,
        requireNumbers = true,
        requireSpecialChars = false
      } = options;

      const value = control.value as string;

      if (!value) {
        return null; // Let required validator handle empty values
      }

      const errors: ValidationErrors = {};

      // Check minimum length
      if (value.length < minLength) {
        errors['minLength'] = { requiredLength: minLength, actualLength: value.length };
      }

      // Check for uppercase letters
      if (requireUppercase && !/[A-Z]/.test(value)) {
        errors['requireUppercase'] = true;
      }

      // Check for lowercase letters
      if (requireLowercase && !/[a-z]/.test(value)) {
        errors['requireLowercase'] = true;
      }

      // Check for numbers
      if (requireNumbers && !/\d/.test(value)) {
        errors['requireNumbers'] = true;
      }

      // Check for special characters
      if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
        errors['requireSpecialChars'] = true;
      }

      return Object.keys(errors).length ? { strongPassword: errors } : null;
    };
  }

  /**
   * Email domain validator
   * Validates that email belongs to allowed domains
   * 
   * @param allowedDomains - Array of allowed email domains
   * @returns ValidatorFn for domain validation
   */
  emailDomain(allowedDomains: string[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value as string;

      if (!value) {
        return null; // Let required validator handle empty values
      }

      const emailParts = value.split('@');
      if (emailParts.length !== 2) {
        return null; // Let email validator handle invalid email format
      }

      const domain = emailParts[1].toLowerCase();
      const isAllowed = allowedDomains.some(allowedDomain => 
        domain === allowedDomain.toLowerCase()
      );

      return isAllowed ? null : { emailDomain: { allowedDomains } };
    };
  }

  /**
   * No whitespace validator
   * Validates that the field contains no leading or trailing whitespace
   * 
   * @returns ValidatorFn for whitespace validation
   */
  noWhitespace(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value as string;

      if (!value) {
        return null;
      }

      const trimmed = value.trim();
      return value !== trimmed ? { noWhitespace: true } : null;
    };
  }

  /**
   * Gets a user-friendly error message for a given validation error
   * 
   * @param error - The validation error key
   * @param errorValue - The error value object
   * @returns Human-readable error message
   */
  getErrorMessage(error: string, errorValue?: any): string {
    const errorMessages: Record<string, string | ((value: any) => string)> = {
      required: 'This field is required',
      email: 'Please enter a valid email address',
      minlength: (value) => `Minimum length is ${value.requiredLength} characters`,
      maxlength: (value) => `Maximum length is ${value.requiredLength} characters`,
      passwordMismatch: 'Passwords do not match',
      strongPassword: 'Password must meet strength requirements',
      emailDomain: (value) => `Email must be from one of these domains: ${value.allowedDomains.join(', ')}`,
      noWhitespace: 'Field cannot start or end with spaces'
    };

    const messageOrFunction = errorMessages[error];
    if (typeof messageOrFunction === 'function') {
      return messageOrFunction(errorValue);
    }
    return messageOrFunction || `Invalid ${error}`;
  }
}