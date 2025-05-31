/**
 * ConfirmationModalComponent - Elegant confirmation dialog
 * A modern, accessible modal for confirmation actions
 * 
 * Este componente ofrece una alternativa estilizada a los diálogos nativos del navegador
 * con soporte completo para accesibilidad, animaciones y temas.
 */

import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmationData {
  type?: 'info' | 'warning' | 'danger';
  title?: string;
  message?: string;
  details?: string;
  confirmText?: string;
  cancelText?: string;
}

export interface ConfirmationRequest extends ConfirmationData {
  id: string;
}

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,  template: `
    @if (currentVisibility() && currentData()) {
      <!-- Modal Backdrop -->
      <div 
        class="modal-backdrop"
        (click)="onBackdropClick()"
      >
        <!-- Modal Dialog -->
        <div 
          class="modal-dialog"
          (click)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="modalId + '-title'"
          [attr.aria-describedby]="modalId + '-description'"
        >
          <!-- Modal Header -->
          <div class="modal-header">
            <div class="modal-icon" [ngClass]="iconClass()">
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="2"
              >                @switch (currentData()?.type) {
                  @case ('warning') {
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  }
                  @case ('danger') {
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  }
                  @default {
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9 12l2 2 4-4"/>
                  }
                }
              </svg>
            </div>            <h2 
              class="modal-title" 
              [id]="modalId + '-title'"
            >
              {{ currentData()?.title || 'Confirmar acción' }}
            </h2>
          </div>

          <!-- Modal Body -->
          <div class="modal-body">            <p 
              class="modal-message"
              [id]="modalId + '-description'"
            >
              {{ currentData()?.message || '¿Estás seguro de que deseas continuar?' }}
            </p>
            
            @if (currentData()?.details) {
              <div class="modal-details">
                <p>{{ currentData()?.details }}</p>
              </div>
            }
          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">            <button
              type="button"
              class="btn btn-secondary"
              (click)="onCancel()"
              [disabled]="isProcessing()"
            >
              {{ currentData()?.cancelText || 'Cancelar' }}
            </button>
            
            <button
              type="button"
              class="btn"
              [ngClass]="confirmButtonClass()"
              (click)="onConfirm()"
              [disabled]="isProcessing()"
            >
              @if (isProcessing()) {
                <span class="spinner"></span>
              }
              {{ currentData()?.confirmText || 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,  styles: [`
    /* Modal Container - Estados de visibilidad */
    :host {
      display: contents;
    }
    
    .modal-visible {
      display: block;
    }
    
    .modal-hidden {
      display: none;
    }
    
    /* Modal Backdrop */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 1rem;
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    /* Modal Dialog */
    .modal-dialog {
      background: white;
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      max-width: 400px;
      width: 100%;
      max-height: 90vh;
      overflow: hidden;
      position: relative;
      animation: slideIn 0.2s ease-out;
      transform-origin: center;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    /* Modal Header */
    .modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .modal-icon {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-icon.warning {
      background-color: #fef3c7;
      color: #d97706;
    }

    .modal-icon.danger {
      background-color: #fee2e2;
      color: #dc2626;
    }

    .modal-icon.info {
      background-color: #dbeafe;
      color: #2563eb;
    }

    .modal-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      line-height: 1.4;
    }

    /* Modal Body */
    .modal-body {
      padding: 1.5rem;
    }

    .modal-message {
      margin: 0;
      color: #6b7280;
      line-height: 1.5;
    }

    .modal-details {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background-color: #f9fafb;
      border-radius: 6px;
      border-left: 3px solid #e5e7eb;
    }

    .modal-details p {
      margin: 0;
      font-size: 0.875rem;
      color: #6b7280;
    }

    /* Modal Footer */
    .modal-footer {
      padding: 1.5rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border: 1px solid transparent;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      min-width: 80px;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background-color: white;
      border-color: #d1d5db;
      color: #374151;
    }

    .btn-secondary:hover:not(:disabled) {
      background-color: #f9fafb;
      border-color: #9ca3af;
    }

    .btn-danger {
      background-color: #dc2626;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background-color: #b91c1c;
    }

    .btn-warning {
      background-color: #d97706;
      color: white;
    }

    .btn-warning:hover:not(:disabled) {
      background-color: #b45309;
    }

    .btn-primary {
      background-color: #2563eb;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #1d4ed8;
    }

    /* Spinner */
    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .modal-dialog {
        background: #1f2937;
        color: #f9fafb;
      }

      .modal-header {
        border-bottom-color: #374151;
      }

      .modal-footer {
        border-top-color: #374151;
      }

      .modal-title {
        color: #f9fafb;
      }

      .modal-message {
        color: #d1d5db;
      }

      .modal-details {
        background-color: #374151;
        border-left-color: #4b5563;
      }

      .modal-details p {
        color: #d1d5db;
      }

      .btn-secondary {
        background-color: #374151;
        border-color: #4b5563;
        color: #f9fafb;
      }

      .btn-secondary:hover:not(:disabled) {
        background-color: #4b5563;
        border-color: #6b7280;
      }
    }

    /* Responsive */
    @media (max-width: 640px) {
      .modal-dialog {
        margin: 0.5rem;
        max-width: none;
      }

      .modal-header,
      .modal-body,
      .modal-footer {
        padding: 1.25rem;
      }

      .modal-footer {
        flex-direction: column-reverse;
      }

      .btn {
        width: 100%;
      }
    }
  `],
  animations: [
    // Puedes agregar animaciones aquí si tienes Angular Animations habilitado
  ]
})
export class ConfirmationModalComponent {
  @Input() set data(value: ConfirmationRequest | null) {
    this._data.set(value);
  }
  
  @Input() set isVisible(value: boolean) {
    this._isVisible.set(value);
  }
  
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  // Internal signals
  private readonly _data = signal<ConfirmationRequest | null>(null);
  private readonly _isVisible = signal<boolean>(false);
  readonly isProcessing = signal<boolean>(false);
    // Public getters for template
  protected currentData = computed(() => this._data());
  protected currentVisibility = computed(() => this._isVisible());
  
  // Computed properties
  readonly modalId = computed(() => `modal-${Math.random().toString(36).substr(2, 9)}`);
  
  readonly iconClass = computed(() => {
    const type = this.currentData()?.type || 'info';
    return type;
  });

  readonly confirmButtonClass = computed(() => {
    const type = this.currentData()?.type || 'info';
    switch (type) {
      case 'danger':
        return 'btn-danger';
      case 'warning':
        return 'btn-warning';
      default:
        return 'btn-primary';
    }
  });

  onConfirm(): void {
    if (this.isProcessing()) return;
    
    this.isProcessing.set(true);
    this.confirmed.emit();
    
    // Reset processing state after a short delay
    setTimeout(() => {
      this.isProcessing.set(false);
    }, 100);
  }

  onCancel(): void {
    if (this.isProcessing()) return;
    this.cancelled.emit();
  }

  onBackdropClick(): void {
    // Only close on backdrop click if not processing
    if (!this.isProcessing()) {
      this.onCancel();
    }
  }
}
