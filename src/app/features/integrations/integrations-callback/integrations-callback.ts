import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IntegrationsService } from '../../../core/services/integrations.service';

@Component({
  selector: 'app-integrations-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './integrations-callback.html',
  styleUrl: './integrations-callback.scss'
})
export class IntegrationsCallback implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly integrationsService = inject(IntegrationsService);

  loading = true;
  error = false;
  message = 'Processing your authorization...';

  ngOnInit(): void {
    // Obtener los parámetros de la URL
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');
    
    // Verificar que tenemos los parámetros necesarios
    if (!code || !state) {
      this.error = true;
      this.message = 'Missing required parameters for OAuth callback.';
      return;
    }

    // Procesar el callback
    this.integrationsService.handleOAuthCallback(code, state).subscribe({
      next: (success: boolean) => {
        if (success) {
          this.message = 'Authorization successful!';
          // Redirigir después de un breve retraso para que el usuario vea el mensaje
          setTimeout(() => this.router.navigate(['/integrations']), 1500);
        } else {
          this.error = true;
          this.message = 'Failed to complete authorization process. Please try again.';
        }
      },
      error: (err: any) => {
        console.error('OAuth callback error:', err);
        this.error = true;
        this.message = 'An error occurred during authorization. Please try again.';
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
  
  // Método público para navegación desde la plantilla
  navigateToIntegrations(): void {
    this.router.navigate(['/integrations']);
  }
}
