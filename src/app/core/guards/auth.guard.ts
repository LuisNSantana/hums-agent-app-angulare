/**
 * Auth Guard - Route protection for authenticated users
 * Following Angular 20+ functional guards pattern with signals
 */

import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Guard to protect routes that require authentication
 */
export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  // Esperar a que AuthService termine de inicializar
  await auth.initialized;
  if (auth.isAuthenticated()) {
    return true;
  } else {
    router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
};

/**
 * Guard to protect routes that should only be accessible to guests (non-authenticated users)
 */
export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  if (authService.isAuthenticated()) {
    router.navigate(['/chat']);
    return false;
  }

  // If still loading, wait for auth state to resolve
  if (authService.isLoading()) {
    return authService.user$.pipe(
      take(1),
      map(user => {
        if (user) {
          router.navigate(['/chat']);
          return false;
        } else {
          return true;
        }
      })
    );
  }

  return true;
};

/**
 * Guard to check if email is verified
 */
export const emailVerifiedGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.user();
  
  if (!user) {
    router.navigate(['/auth/login']);
    return false;
  }

  if (!user.emailConfirmed) {
    router.navigate(['/auth/verify-email']);
    return false;
  }

  return true;
};
