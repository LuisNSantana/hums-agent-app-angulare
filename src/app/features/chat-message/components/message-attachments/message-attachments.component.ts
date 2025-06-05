/**
 * Message Attachments Component
 * Displays file and image attachments in chat messages
 */
import { 
  Component, 
  input, 
  ChangeDetectionStrategy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatAttachment } from '../../../../shared/models/chat.models';
import { MessageFormatterService } from '../../services/message-formatter.service';

@Component({
  selector: 'app-message-attachments',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="message-attachments">
      @for (attachment of attachments(); let i = $index; track trackByAttachment(i, attachment)) {
        <div class="attachment-container" [class.document-attachment]="attachment.type === 'document'">
          @if (attachment.type === 'image' && attachment.url) {
            <img 
              [src]="attachment.url"
              [alt]="attachment.name"
              class="attached-image"
              loading="lazy" />
          } @else if (attachment.type === 'document') {
            <div class="document-preview">
              <div class="document-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <line x1="10" y1="9" x2="8" y2="9"/>
                </svg>
              </div>
              <span class="document-type">PDF</span>
            </div>
          }
          <div class="attachment-info">
            <span class="attachment-name">{{ attachment.name }}</span>
            <span class="attachment-size">{{ formatter.formatFileSize(attachment.size) }}</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .message-attachments {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
      width: 100%;
    }

    .attachment-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: var(--mat-app-surface-container);
      border: 1px solid var(--mat-app-border);
      border-radius: 12px;
      padding: 12px;
      transition: all 0.3s ease;
      max-width: 300px;
      box-shadow: var(--mat-app-shadow-sm);
    }

    .attachment-container:hover {
      transform: translateY(-2px);
      box-shadow: var(--mat-app-shadow-md);
      border-color: var(--mat-app-primary);
    }

    .attachment-container.document-attachment {
      max-width: 280px;
    }

    .attached-image {
      width: 100%;
      max-width: 280px;
      height: auto;
      max-height: 200px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid var(--mat-app-border-variant);
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .attached-image:hover {
      transform: scale(1.02);
      box-shadow: var(--mat-app-shadow);
    }

    .document-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--mat-app-surface-elevated);
      border: 1px solid var(--mat-app-border-variant);
      border-radius: 8px;
      min-height: 80px;
      position: relative;
    }

    .document-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--mat-app-primary);
      color: var(--mat-app-on-primary);
      border-radius: 8px;
      flex-shrink: 0;
    }

    .document-icon svg {
      width: 24px;
      height: 24px;
    }

    .document-type {
      font-size: 12px;
      font-weight: 600;
      color: var(--mat-app-on-primary);
      background: var(--mat-app-primary);
      padding: 2px 6px;
      border-radius: 4px;
      position: absolute;
      bottom: 4px;
      right: 4px;
    }

    .attachment-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .attachment-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--mat-app-on-surface);
      word-break: break-word;
    }

    .attachment-size {
      font-size: 11px;
      color: var(--mat-app-on-surface-variant);
      opacity: 0.8;
    }

    /* Responsive design for attachments */
    @media (max-width: 768px) {
      .attachment-image {
        max-width: 250px;
      }

      .attached-image {
        max-width: 230px;
        max-height: 150px;
      }
    }

    @media (max-width: 480px) {
      .attachment-image {
        max-width: 200px;
      }

      .attached-image {
        max-width: 180px;
        max-height: 120px;
      }

      .attachment-name {
        font-size: 12px;
      }

      .attachment-size {
        font-size: 10px;
      }
    }
  `]
})
export class MessageAttachmentsComponent {
  // Inject services
  public formatter = inject(MessageFormatterService);
  
  // Inputs
  readonly attachments = input<ChatAttachment[]>([]);
  
  // Track by function for ngFor
  trackByAttachment(index: number, attachment: ChatAttachment): string {
    return attachment.id;
  }
}
