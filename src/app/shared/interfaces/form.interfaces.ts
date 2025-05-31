/**
 * Form Interfaces - Type definitions for form validation and controls
 * Following Angular 20+ best practices for strongly typed reactive forms
 */

import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Interface for password reset form data
 */
export interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

/**
 * Interface for email verification form data
 */
export interface EmailVerificationFormData {
  email: string;
}

/**
 * Interface for login form data
 */
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Interface for signup form data
 */
export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Interface for forgot password form data
 */
export interface ForgotPasswordFormData {
  email: string;
}

/**
 * Custom validator function type for form group validation
 */
export type FormGroupValidator = (control: AbstractControl) => ValidationErrors | null;

/**
 * Interface for form validation result
 */
export interface FormValidationResult {
  isValid: boolean;
  errors?: ValidationErrors;
}

/**
 * Interface for authentication error responses
 */
export interface AuthErrorResponse {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

/**
 * Interface for authentication success responses
 */
export interface AuthSuccessResponse<T = any> {
  data: T;
  message?: string;
}