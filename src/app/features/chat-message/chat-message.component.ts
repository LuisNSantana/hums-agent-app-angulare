/**
 * Chat Message Component - Individual message display
 * Supports markdown rendering, code highlighting, and actions
 */

import { 
  Component, 
  input,
  output, 
  ChangeDetectionStrategy,
  signal,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../shared/models/chat.models';
import { AuthService } from '../../core/services/auth/auth.service';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="message" [class]="messageClasses()">      <!-- Message Avatar -->
      <div class="message-avatar" [class]="message().role">
        @if (message().role === 'user') {          @if (currentUser()?.avatarUrl; as avatarUrl) {
            <img 
              [src]="avatarUrl" 
              [alt]="currentUser()?.displayName || 'User'"
              class="avatar-image"
              (error)="onAvatarError($event)"
            />
          } @else {
            @if (userInitials(); as initials) {
              <span class="avatar-initials">{{ initials }}</span>
            } @else {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            }
          }
        } @else {
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
          </svg>
        }
      </div>

      <!-- Message Content -->
      <div class="message-content">
        <!-- Message Header -->
        <div class="message-header">
          <span class="message-role">
            {{ message().role === 'user' ? 'You' : 'Agent Hums' }}
          </span>
          <span class="message-time">
            {{ formatTime(message().timestamp) }}
          </span>          @if (message().metadata?.model) {
            <span class="message-model">
              {{ message().metadata?.model }}
            </span>
          }
        </div>

        <!-- Agent Thoughts (Moved Before Message Body) -->
        @if (message().metadata?.thoughts && message().role === 'assistant') {
          <details class="agent-thoughts">
            <summary>🧠 Show Thinking</summary>
            <div class="thought-text" [innerText]="message().metadata?.thoughts"></div>
          </details>
        }        <!-- Message Body -->
        <div class="message-body">
          @if (message().isError) {
            <div class="error-content">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {{ message().content }}
            </div>
          } @else {            <!-- Attached Files (for user messages) -->
            @if (attachments().length > 0) {
              <div class="message-attachments">
                @for (attachment of attachments(); track attachment.id) {
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
                      <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
                    </div>
                  </div>
                }
              </div>
            }

            <div class="message-text" [innerHTML]="formattedContent()"></div>
            
            @if (message().isStreaming) {
              <div class="streaming-indicator" aria-label="AI is thinking...">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              </div>
            }
          }
        </div>

        <!-- Message Actions -->
        @if (!message().isStreaming && !message().isError) {
          <div class="message-actions">
            <button 
              class="action-button"
              (click)="onCopy()"
              title="Copy message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>

            @if (message().role === 'assistant') {
              <button 
                class="action-button"
                (click)="onRegenerate()"
                title="Regenerate response"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <polyline points="1 20 1 14 7 14"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
              </button>
            }

            @if (message().role === 'user') {
              <button 
                class="action-button"
                (click)="onEdit()"
                title="Edit message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            }
          </div>
        }

        <!-- Message Metadata -->
        @if (message().metadata && showMetadata()) {
          <div class="message-metadata">            @if (message().metadata?.tokens) {
              <span class="metadata-item">
                {{ message().metadata?.tokens }} tokens
              </span>
            }
            @if (message().metadata?.processingTime) {
              <span class="metadata-item">
                {{ message().metadata?.processingTime }}ms
              </span>
            }
          </div>
        }

        <!-- Tool Used Badge -->
        @if (message().metadata?.toolsUsed?.length && message().role === 'assistant') {
          <div class="tool-badge-list">
            @for (tool of message().metadata?.toolsUsed; track tool) {
              <span class="tool-badge">{{ toolBadgeLabel(tool) }}</span>
            }
          </div>
        }
      </div>
    </div>
  `,  styles: [`
    .message {
      display: flex;
      gap: 16px;
      width: 100%;
      animation: slideInUp 0.4s ease-out;
      margin-bottom: 8px;
    }

    .message.user {
      flex-direction: row-reverse;
    }

    .message.user .message-content {
      align-items: flex-end;
    }    .message.user .message-body {
      background: var(--mat-app-gradient-primary);
      color: var(--mat-app-on-primary);
      border-radius: 20px;
      border-bottom-right-radius: 6px;
      border: 1px solid rgba(99, 102, 241, 0.3);
      box-shadow: 
        var(--mat-app-shadow-md),
        0 4px 20px rgba(99, 102, 241, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }.message.assistant .message-body {
      background: var(--mat-app-surface-container);
      border: 1px solid var(--mat-app-border-variant);
      border-radius: 20px;
      border-bottom-left-radius: 6px;
      color: var(--mat-app-on-surface);
      box-shadow: 
        var(--mat-app-shadow),
        0 2px 16px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }    .message-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 16px;
      font-weight: 600;
      box-shadow: var(--mat-app-shadow);
      border: 2px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }    .avatar-initials {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .message-avatar.avatar-error .avatar-image {
      display: none !important;
    }.message-avatar.user {
      background: var(--mat-app-gradient-surface);
      color: var(--mat-app-on-surface-variant);
      border: 2px solid var(--mat-app-border-variant);
    }

    .message-avatar.assistant {
      background: var(--mat-app-gradient-primary);
      color: var(--mat-app-on-primary);
    }

    .message-avatar:hover {
      transform: scale(1.05);
      box-shadow: var(--mat-app-shadow-md);
    }

    .message-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
      max-width: calc(100% - 56px);
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--mat-app-on-surface-muted);
      font-weight: 500;
    }

    .message.user .message-header {
      justify-content: flex-end;
    }

    .message-role {
      font-weight: 600;
      color: var(--mat-app-primary);
    }

    .message-time {
      opacity: 0.7;
    }

    .message-model {
      background: var(--mat-app-surface-variant);
      color: var(--mat-app-on-surface-variant);
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      border: 1px solid var(--mat-app-border);
    }    .message-body {
      padding: 16px 20px;
      position: relative;
      word-wrap: break-word;
      line-height: 1.7;
      font-size: 15px;
      transition: all 0.3s ease;
    }

    .message.assistant .message-body:hover {
      transform: translateY(-1px);
      box-shadow: 
        var(--mat-app-shadow-md),
        0 4px 20px rgba(0, 0, 0, 0.15);
    }

    .message.user .message-body:hover {
      transform: translateY(-1px);
      box-shadow: 
        var(--mat-app-shadow-lg),
        0 6px 24px rgba(99, 102, 241, 0.5);
    }

    .message-text {
      color: inherit;
    }    .message-text :global(pre) {
      background: var(--mat-app-surface-elevated);
      border: 1px solid var(--mat-app-border-variant);
      border-radius: 12px;
      padding: 16px;
      overflow-x: auto;
      margin: 12px 0;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
      font-size: 14px;
      box-shadow: var(--mat-app-shadow-sm);
      color: var(--mat-app-on-surface);
    }

    .message-text :global(code) {
      background: var(--mat-app-surface-elevated);
      padding: 2px 6px;
      border-radius: 6px;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
      font-size: 13px;
      border: 1px solid var(--mat-app-border);
      color: var(--mat-app-accent-light);
    }

    .message-text :global(p) {
      margin: 0 0 12px 0;
    }

    .message-text :global(p:last-child) {
      margin-bottom: 0;
    }

    .message-text :global(strong) {
      color: var(--mat-app-primary);
      font-weight: 600;
    }

    .message-text :global(em) {
      color: var(--mat-app-secondary);
      font-style: italic;
    }    .error-content {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--mat-app-error-light);
      font-weight: 500;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      padding: 12px;
      box-shadow: var(--mat-app-shadow-sm);
    }

    .streaming-indicator {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-left: 6px;
      vertical-align: middle;
    }

    .streaming-indicator .dot {
      width: 8px;
      height: 8px;
      background: var(--mat-app-primary);
      border-radius: 50%;
      animation: streamingPulse 1.4s infinite ease-in-out both;
      box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
    }

    .streaming-indicator .dot:nth-child(1) {
      animation-delay: -0.32s;
    }

    .streaming-indicator .dot:nth-child(2) {
      animation-delay: -0.16s;
    }

    .message-actions {
      display: flex;
      gap: 6px;
      margin-top: 8px;
      opacity: 0;
      transition: all 0.3s ease;
      transform: translateY(4px);
    }

    .message:hover .message-actions {
      opacity: 1;
      transform: translateY(0);
    }    .action-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: var(--mat-app-surface-elevated);
      border: 1px solid var(--mat-app-border-variant);
      border-radius: 8px;
      color: var(--mat-app-on-surface-variant);
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: var(--mat-app-shadow-sm);
    }

    .action-button:hover {
      background: var(--mat-app-primary);
      color: var(--mat-app-on-primary);
      border-color: var(--mat-app-primary);
      transform: translateY(-2px);
      box-shadow: var(--mat-app-shadow);
    }

    .message-metadata {
      display: flex;
      gap: 12px;
      font-size: 11px;
      color: var(--mat-app-on-surface-muted);
      margin-top: 4px;
      font-weight: 500;
    }    .metadata-item {
      background: var(--mat-app-surface-elevated);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid var(--mat-app-border);
      color: var(--mat-app-on-surface-variant);
    }

    .agent-thoughts {
      margin-bottom: 12px;
      font-size: 14px;
      color: var(--mat-app-on-surface-variant);
      align-self: flex-start;
      width: auto;
    }    .agent-thoughts summary {
      cursor: pointer;
      font-weight: 600;
      padding: 8px 12px;
      border-radius: 12px;
      background: var(--mat-app-surface-variant);
      border: 1px solid var(--mat-app-border);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.3s ease;
      color: var(--mat-app-on-surface);
      box-shadow: var(--mat-app-shadow-sm);
    }

    .agent-thoughts summary:hover {
      background: var(--mat-app-primary);
      color: var(--mat-app-on-primary);
      transform: translateY(-1px);
      box-shadow: var(--mat-app-shadow);
    }

    .agent-thoughts[open] summary {
      background: var(--mat-app-primary);
      color: var(--mat-app-on-primary);
      border-bottom-left-radius: 4px;
      border-bottom-right-radius: 4px;
    }    .agent-thoughts .thought-text {
      padding: 16px;
      background: var(--mat-app-surface-elevated);
      border: 1px solid var(--mat-app-border-variant);
      border-top: none;
      border-radius: 0 0 12px 12px;
      white-space: pre-wrap;
      line-height: 1.6;
      font-size: 13px;
      color: var(--mat-app-on-surface);
      box-shadow: var(--mat-app-shadow-sm);
    }    /* Multimodal Attachment Styles */
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

    .document-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--mat-app-surface-elevated);
      border: 1px solid var(--mat-app-border-variant);
      border-radius: 8px;
      min-height: 80px;
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
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .attached-image:hover {
      transform: scale(1.02);
      box-shadow: var(--mat-app-shadow);
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

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes streamingPulse {
      0%, 80%, 100% {
        transform: scale(0.6);
        opacity: 0.5;
      }
      40% {
        transform: scale(1.2);
        opacity: 1;
      }
    }

    @media (max-width: 768px) {
      .message {
        gap: 12px;
      }

      .message-content {
        max-width: calc(100% - 48px);
      }

      .message-body {
        padding: 12px 16px;
        font-size: 14px;
      }

      .message-header {
        font-size: 11px;
      }

      .message-avatar {
        width: 36px;
        height: 36px;
      }

      .action-button {
        width: 28px;
        height: 28px;
      }
    }

    @media (max-width: 480px) {
      .message {
        gap: 8px;
      }

      .message-content {
        max-width: calc(100% - 44px);
      }

      .message-body {
        padding: 10px 14px;
      }

      .message-avatar {
        width: 32px;
        height: 32px;
      }
    }

    /* Tool System Message Styles */
    .tool-system-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-radius: 12px;
      margin: 8px 0;
      font-size: 14px;
      color: var(--mat-app-on-surface);
      background: var(--mat-app-surface-variant);
      border: 1px solid var(--mat-app-border);
      box-shadow: var(--mat-app-shadow-sm);
    }

    .tool-system-message.success {
      background: rgba(76, 175, 80, 0.1);
      border-color: rgba(76, 175, 80, 0.3);
    }

    .tool-system-message.error {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
    }

    .tool-system-message.pending {
      background: rgba(255, 193, 7, 0.1);
      border-color: rgba(255, 193, 7, 0.3);
    }

    .tool-loading-spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* SCSS for tool-system-message */
    :host ::ng-deep .tool-system-message {
      background: #23263a;
      color: #ffe082;
      border-radius: 8px;
      padding: 0.75em 1.2em;
      margin: 0.5em 0 0.5em 2.5em;
      font-size: 1em;
      display: flex;
      align-items: center;
      gap: 0.5em;
      box-shadow: 0 2px 8px 0 #0002;
      border-left: 4px solid #ffd600;
      font-family: inherit;
    }
    :host ::ng-deep .tool-system-message.pending .tool-system-text {
      font-style: italic;
      color: #ffd600;
    }
    :host ::ng-deep .tool-system-message .tool-loading-spinner {
      display: inline-block;
      vertical-align: middle;
      margin-right: 0.5em;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
    :host ::ng-deep .tool-system-message.success {
      color: #a5d6a7;
      border-left-color: #66bb6a;    }
    :host ::ng-deep .tool-system-message.error {
      color: #ef9a9a;
      border-left-color: #e53935;
    }

    /* Tool Badge Styles */
    .tool-badge-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 8px;
    }

    .tool-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      background: rgba(99, 102, 241, 0.1);
      color: var(--mat-app-primary);
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      border: 1px solid rgba(99, 102, 241, 0.2);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
    }

    .tool-badge:hover {
      background: rgba(99, 102, 241, 0.15);
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
  `]
})
export class ChatMessageComponent {
  // Services
  private readonly authService = inject(AuthService);

  // Modern Angular 20+ input/output syntax
  readonly message = input.required<ChatMessage>();
  readonly messageAction = output<{
    type: string;
    messageId: string;
    data?: any;
  }>();

  readonly showMetadata = signal(false);
  // User data computed signals
  readonly currentUser = computed(() => {
    const user = this.authService.user();
    console.log('🔍 Debug - Current user in chat message:', user);
    return user;
  });
  
  readonly userInitials = computed(() => {
    const user = this.currentUser();
    if (!user) return null;
    
    console.log('🔍 Debug - User avatar URL:', user.avatarUrl);
    console.log('🔍 Debug - User display name:', user.displayName);
    
    if (user.displayName) {
      const names = user.displayName.trim().split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
      } else {
        return names[0].charAt(0).toUpperCase();
      }
    }
    
    return user.email?.charAt(0).toUpperCase() || null;
  });

  readonly messageClasses = computed(() => {
    const msg = this.message();
    return {
      [msg.role]: true,
      'streaming': msg.isStreaming,
      'error': msg.isError
    };
  });

  readonly formattedContent = computed(() => {
    const content = this.message().content;
    
    // Basic markdown-like formatting
    return content
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/```([^```]+)```/g, '<pre><code>$1</code></pre>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  });

  // Add computed attachments signal to safely handle optional metadata
  readonly attachments = computed(() => this.message().metadata?.attachments ?? []);

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return timestamp.toLocaleDateString();
  }

  onCopy(): void {
    this.messageAction.emit({
      type: 'copy',
      messageId: this.message().id
    });
  }

  onRegenerate(): void {
    this.messageAction.emit({
      type: 'regenerate',
      messageId: this.message().id
    });
  }
  onEdit(): void {
    this.messageAction.emit({
      type: 'edit',
      messageId: this.message().id
    });
  }
  onAvatarError(event: Event): void {
    console.log('🚨 Avatar image failed to load:', event);
    const imgElement = event.target as HTMLImageElement;
    imgElement.style.display = 'none';
    
    // Force update to show fallback
    const userElement = imgElement.closest('.message-avatar');
    if (userElement) {
      userElement.classList.add('avatar-error');
    }
  }

  /**
   * Format file size in human-readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  trackByAttachment(index: number, attachment: any): string {
    return attachment.id;
  }

  /**
   * Devuelve un label amigable para la herramienta usada
   */
  toolBadgeLabel(tool: string): string {
    switch (tool) {
      case 'searchWeb':
        return '🔎 Web Search';
      case 'analyzeWeb':
        return '📊 Analyze Web';
      case 'googleCalendar':
        return '📅 Google Calendar';
      case 'googleDrive':
        return '📁 Google Drive';
      case 'analyzeDocument':
        return '📄 Document Analyzer';
      default:
        return `🛠️ ${tool}`;
    }
  }
}
