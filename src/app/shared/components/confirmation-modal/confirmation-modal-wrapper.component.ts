/**
 * ConfirmationModalWrapperComponent - Global modal wrapper
 * Renders confirmation modals using the ConfirmationService
 */

import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationModalComponent } from './confirmation-modal.component';
import { ConfirmationService } from '../../services/confirmation.service';

@Component({
  selector: 'app-confirmation-modal-wrapper',
  standalone: true,
  imports: [CommonModule, ConfirmationModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,  template: `
    <!-- El modal siempre está presente en el DOM para evitar retrasos en la primera renderización -->
    <app-confirmation-modal
      [data]="confirmationService.currentRequest()"
      [isVisible]="confirmationService.isVisible()"
      (confirmed)="onConfirm()"
      (cancelled)="onCancel()"
    />
  `
})
export class ConfirmationModalWrapperComponent {
  readonly confirmationService = inject(ConfirmationService);

  onConfirm(): void {
    this.confirmationService.handleConfirm();
  }

  onCancel(): void {
    this.confirmationService.handleCancel();
  }
}
