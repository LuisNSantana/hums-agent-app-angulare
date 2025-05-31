import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Public routes (guest only)
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'signup',
        loadComponent: () => import('./features/auth/signup/signup.component').then(m => m.SignupComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
      },
      {
        path: 'callback',
        loadComponent: () => import('./features/auth/auth-callback/auth-callback.component').then(m => m.AuthCallbackComponent)
      },
      {
        path: 'verify-email',
        loadComponent: () => import('./features/auth/verify-email/verify-email.component').then(m => m.VerifyEmailComponent)
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },

  // Protected routes (authenticated users only)
  {
    path: 'chat',
    canActivate: [authGuard],
    loadComponent: () => import('./features/chat-interface/chat-interface.component').then(m => m.ChatInterfaceComponent)
  },  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/profile/profile.component').then(m => m.ProfileComponent)
  },  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/profile/profile.component').then(m => m.ProfileComponent)
  },

  // Default redirect
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  },
  
  // Wildcard route
  {
    path: '**',
    redirectTo: '/auth/login'
  }
];
