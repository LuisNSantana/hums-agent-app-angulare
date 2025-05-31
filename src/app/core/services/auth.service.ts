/**
 * Auth Service - Direct implementation to avoid re-export issues
 * Contains the full AuthService implementation for compatibility
 */

export { AuthService } from './auth';
export {
  AuthStateService,
  AuthOperationsService, 
  AuthDataMapper,
  ProfileService,
  SessionService
} from './auth';
export type {
  AuthUser,
  UserPreferences,
  LoginCredentials,
  SignupCredentials,
  AuthState,
  AuthResponse,
  AuthUserResponse,
  AuthSessionResponse,
  IAuthStateService,
  IAuthOperationsService,
  IProfileService,
  ISessionService
} from './auth';
