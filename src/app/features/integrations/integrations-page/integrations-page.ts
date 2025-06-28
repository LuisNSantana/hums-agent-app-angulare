import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { IntegrationsService, IntegrationStatus } from '../../../core/services/integrations.service';
import { Subscription } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-integrations-page',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule, 
    MatProgressSpinnerModule
  ],
  templateUrl: './integrations-page.html',
  styleUrl: './integrations-page.scss'
})
export class IntegrationsPage implements OnInit, OnDestroy {
  private readonly integrationsService = inject(IntegrationsService);
  private readonly router = inject(Router);
  private statusSubscription: Subscription | undefined;

  readonly googleCalendarConnected = signal<boolean>(false);
  readonly googleDriveConnected = signal<boolean>(false);
  readonly isLoading = signal<boolean>(true);
  readonly isConnecting = signal<boolean>(false);
  readonly isDisconnecting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    
    // Cargar el estado de la integración cuando se inicializa el componente
    this.integrationsService.loadIntegrationStatus();
    
    // Suscribirse a los cambios de estado
    this.statusSubscription = this.integrationsService.integrationStatus$.subscribe({
      next: (status: IntegrationStatus) => {
        this.googleCalendarConnected.set(status.googleCalendarConnected);
        this.googleDriveConnected.set(status.googleDriveConnected);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading integration status:', err);
        this.errorMessage.set('Failed to load integration status. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Navega de vuelta a la página de chat
   */
  navigateToChat(): void {
    this.router.navigate(['/chat']);
  }

  /**
   * Inicia el proceso de conexión a Google Calendar
   */
  connectGoogleCalendar(): void {
    this.isConnecting.set(true);
    this.errorMessage.set(null);
    
    try {
      const authUrl = this.integrationsService.getGoogleCalendarAuthUrl();
      if (authUrl) {
        console.log('Redirecting to Google Calendar OAuth...');
        window.location.href = authUrl;
      } else {
        console.error('Could not get Google Calendar Auth URL.');
        this.errorMessage.set('Failed to get authorization URL. Please try again.');
        this.isConnecting.set(false);
      }
    } catch (err) {
      console.error('Error in connectGoogleCalendar:', err);
      this.errorMessage.set('An unexpected error occurred. Please try again.');
      this.isConnecting.set(false);
    }
  }

  /**
   * Desconecta Google Calendar
   */
  disconnectGoogleCalendar(): void {
    this.isDisconnecting.set(true);
    this.errorMessage.set(null);
    console.log('Attempting to disconnect Google Calendar...');
    
    this.integrationsService.disconnectGoogleCalendar().subscribe({
      next: (success: boolean) => {
        this.isDisconnecting.set(false);
        if (success) {
          console.log('Google Calendar disconnected successfully.');
          // El estado debería actualizarse a través de la suscripción a integrationStatus$
        } else {
          console.error('Failed to disconnect Google Calendar.');
          this.errorMessage.set('Failed to disconnect. Please try again.');
        }
      },
      error: (err: any) => {
        console.error('Error disconnecting Google Calendar:', err);
        this.errorMessage.set('An error occurred while disconnecting. Please try again.');
        this.isDisconnecting.set(false);
      }
    });
  }

  /**
   * Inicia el proceso de conexión a Google Drive
   */
  connectGoogleDrive(): void {
    this.isConnecting.set(true);
    this.errorMessage.set(null);
    
    try {
      const authUrl = this.integrationsService.getGoogleDriveAuthUrl();
      if (authUrl) {
        console.log('Redirecting to Google Drive OAuth...');
        window.location.href = authUrl;
      } else {
        console.error('Could not get Google Drive Auth URL.');
        this.errorMessage.set('Failed to get authorization URL. Please try again.');
        this.isConnecting.set(false);
      }
    } catch (err) {
      console.error('Error in connectGoogleDrive:', err);
      this.errorMessage.set('An unexpected error occurred. Please try again.');
      this.isConnecting.set(false);
    }
  }

  /**
   * Desconecta Google Drive
   */
  disconnectGoogleDrive(): void {
    this.isDisconnecting.set(true);
    this.errorMessage.set(null);
    console.log('Attempting to disconnect Google Drive...');
    
    this.integrationsService.disconnectGoogleDrive().subscribe({
      next: (success: boolean) => {
        this.isDisconnecting.set(false);
        if (success) {
          console.log('Google Drive disconnected successfully.');
          // El estado debería actualizarse a través de la suscripción a integrationStatus$
        } else {
          console.error('Failed to disconnect Google Drive.');
          this.errorMessage.set('Failed to disconnect. Please try again.');
        }
      },
      error: (err: any) => {
        console.error('Error disconnecting Google Drive:', err);
        this.errorMessage.set('An error occurred while disconnecting. Please try again.');
        this.isDisconnecting.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
  }
}
