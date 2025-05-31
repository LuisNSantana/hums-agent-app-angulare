/**
 * Auth Interceptor - Automatically adds auth tokens to HTTP requests
 * Following Angular 20+ functional interceptor pattern
 */

import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, switchMap, take } from 'rxjs/operators';
import { throwError, from } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

/**
 * Functional HTTP interceptor that adds authentication tokens to requests
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Skip auth token for certain URLs
  const skipAuth = shouldSkipAuth(req.url);
  
  if (skipAuth) {
    return next(req);
  }

  // Get access token and add to request
  return from(authService.getAccessToken()).pipe(
    take(1),
    switchMap(token => {
      // Clone request and add authorization header
      const authReq = token 
        ? req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          })
        : req;

      // Execute request with error handling
      return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          // Handle 401 Unauthorized errors
          if (error.status === 401) {
            handleUnauthorizedError(authService, router);
          }
          
          return throwError(() => error);
        })
      );
    })
  );
};

/**
 * Determine if request should skip authentication
 */
function shouldSkipAuth(url: string): boolean {
  const skipPatterns = [
    '/auth/',
    'supabase.co',
    'localhost:11434', // Ollama API
    '/api/public'
  ];

  return skipPatterns.some(pattern => url.includes(pattern));
}

/**
 * Handle unauthorized errors by signing out user
 */
function handleUnauthorizedError(authService: AuthService, router: Router): void {
  // Only sign out if user is currently authenticated
  if (authService.isAuthenticated()) {
    console.warn('Authentication token expired or invalid. Signing out user.');
    authService.signOut();
  }
}
