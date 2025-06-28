import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { IntegrationsPage } from './features/integrations/integrations-page/integrations-page';
import { IntegrationsCallback } from './features/integrations/integrations-callback/integrations-callback';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

// Lucide Angular se importa directamente en los componentes que lo necesitan
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter([...routes]),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideClientHydration(withEventReplay())
  ]
};
