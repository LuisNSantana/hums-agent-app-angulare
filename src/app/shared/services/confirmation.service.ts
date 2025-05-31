/**
 * ConfirmationService - Global service for managing confirmation modals
 * Provides an elegant alternative to browser confirm() dialogs
 */

import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ConfirmationData, ConfirmationRequest } from '../components/confirmation-modal/confirmation-modal.component';

@Injectable({
  providedIn: 'root'
})
export class ConfirmationService {
  private readonly _currentRequest = signal<ConfirmationRequest | null>(null);
  private readonly _isVisible = signal<boolean>(false);
  private confirmationSubject = new Subject<boolean>();

  // Public signals for components to consume
  readonly currentRequest = this._currentRequest.asReadonly();
  readonly isVisible = this._isVisible.asReadonly();  /**
   * Show a confirmation modal and return a promise that resolves to boolean
   * Optimizado para renderización inmediata
   */
  confirm(data: ConfirmationData): Promise<boolean> {
    const request: ConfirmationRequest = {
      ...data,
      id: this.generateId()
    };

    // Usar setTimeout(0) para mover al final de la cola de eventos 
    // y asegurar que la UI se actualice inmediatamente
    this._currentRequest.set(request);
    
    // Pequeño retraso para asegurar que el modal esté listo antes de mostrarlo
    return Promise.resolve().then(() => {
      // Ahora mostrar el modal después de que el request se haya procesado
      this._isVisible.set(true);
      
      return new Promise<boolean>((resolve) => {
        const subscription = this.confirmationSubject.subscribe((result) => {
          resolve(result);
          subscription.unsubscribe();
        });
      });
    });
  }

  /**
   * Show a deletion confirmation modal with pre-configured styling
   */
  confirmDelete(
    title: string = 'Delete Item',
    message: string = 'Are you sure you want to delete this item? This action cannot be undone.',
    confirmText: string = 'Delete'
  ): Promise<boolean> {
    return this.confirm({
      title,
      message,
      confirmText,
      cancelText: 'Cancel',
      type: 'danger'
    });
  }

  /**
   * Show a conversation deletion confirmation modal
   */
  confirmDeleteConversation(
    conversationTitle?: string
  ): Promise<boolean> {
    const title = conversationTitle 
      ? `Delete "${conversationTitle}"?`
      : 'Delete Conversation?';

    return this.confirmDelete(
      title,
      'This conversation and all its messages will be permanently deleted. This action cannot be undone.',
      'Delete Conversation'
    );
  }
  /**
   * Handle confirmation (user clicked confirm/delete button)
   */
  handleConfirm(): void {
    this._isVisible.set(false);
    this.confirmationSubject.next(true);
    // Clear request after a small delay to allow for exit animations
    setTimeout(() => this._currentRequest.set(null), 200);
  }

  /**
   * Handle cancellation (user clicked cancel or pressed escape)
   */
  handleCancel(): void {
    this._isVisible.set(false);
    this.confirmationSubject.next(false);
    // Clear request after a small delay to allow for exit animations
    setTimeout(() => this._currentRequest.set(null), 200);
  }

  /**
   * Programmatically close the modal without triggering confirmation
   */
  close(): void {
    this._isVisible.set(false);
    this._currentRequest.set(null);
  }

  private generateId(): string {
    return `confirm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
