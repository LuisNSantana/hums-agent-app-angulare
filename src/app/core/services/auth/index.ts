/**
 * Auth Module Barrel Export
 * Centralized exports for the authentication system
 */

// Main Auth Service
export { AuthService } from './auth.service';

// Specialized Services
export { AuthStateService } from './services/auth-state.service';
export { AuthOperationsService } from './services/auth-operations.service';
export { AuthDataMapper } from './services/auth-data-mapper.service';
export { ProfileService } from './services/profile.service';
export { SessionService } from './services/session.service';

// Types and Interfaces
export * from './types/auth.types';

// Legacy exports for backward compatibility
export type {
  AuthUser,
  UserPreferences,
  LoginCredentials,
  SignupCredentials,
  AuthState
} from './types/auth.types';
