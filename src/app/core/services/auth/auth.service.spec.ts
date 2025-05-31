import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { AuthStateService } from './services/auth-state.service';
import { ProfileService } from './services/profile.service';
import { SessionService } from './services/session.service';
import { AuthDataMapper } from './services/auth-data-mapper.service';
import { UserPreferences } from './types/auth.types';

// Mocks
class MockAuthStateService {
  user = () => ({ id: '123', email: 'test@example.com', emailConfirmed: true, preferences: { theme: 'dark' } });
  isAuthenticated = () => true;
}
class MockProfileService {
  getProfile = async (userId: string) => ({ data: { id: userId, name: 'Test' }, error: null });
}
class MockSessionService {}
class MockAuthDataMapper {
  getDefaultPreferences = () => ({ theme: 'light' });
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AuthStateService, useClass: MockAuthStateService },
        { provide: ProfileService, useClass: MockProfileService },
        { provide: SessionService, useClass: MockSessionService },
        { provide: AuthDataMapper, useClass: MockAuthDataMapper },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should get user profile by ID', async () => {
    const result = await service.getProfile('123');
    expect(result.data).toEqual({ id: '123', name: 'Test' });
    expect(result.error).toBeNull();
  });

  it('should check if user is authenticated', () => {
    expect(service.isUserAuthenticated()).toBeTrue();
  });

  it('should get current user ID', () => {
    expect(service.getCurrentUserId()).toBe('123');
  });

  it('should get current user email', () => {
    expect(service.getCurrentUserEmail()).toBe('test@example.com');
  });

  it('should check if email is confirmed', () => {
    expect(service.isEmailConfirmed()).toBeTrue();
  });
    
});
