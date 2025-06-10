/**
 * Message Content Component
 * Displays the main content of a chat message with formatting
 */
import { 
  Component, 
  input, 
  output,
  ChangeDetectionStrategy,
  inject,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../../../shared/models/chat.models';
import { MessageFormatterService } from '../../services/message-formatter.service';

@Component({
  selector: 'app-message-content',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="message-content" [class.user-message]="message().role === 'user'" [class.assistant-message]="message().role === 'assistant'">
      <!-- Message Header -->
      <div class="message-header">
        <span class="message-role">
          {{ message().role === 'user' ? 'You' : 'Cleo' }}
        </span>
        <span class="message-time">
          {{ formatter.formatTime(message().timestamp) }}
        </span>
        @if (message().metadata?.model) {
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
      }

      <!-- Message Body -->
      <div class="message-body" [class.user-bubble]="message().role === 'user'" [class.assistant-bubble]="message().role === 'assistant'">
        @if (message().isError) {
          <div class="error-content">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {{ message().content }}
          </div>
        } @else {
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
        <div class="message-metadata">
          @if (message().metadata?.tokens) {
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
            <span class="tool-badge">{{ formatter.getToolBadgeLabel(tool) }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .message-content {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 80%;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--mat-app-on-surface-muted);
      font-weight: 500;
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
    }

    .message-body {
      padding: 16px 20px;
      position: relative;
      word-wrap: break-word;
      line-height: 1.7;
      font-size: 15px;
      transition: all 0.3s ease;
      border-radius: 20px;
      box-shadow: var(--mat-app-shadow-sm);
    }
    
    /* Estilos para burbujas de mensaje */
    .user-bubble {
      background: var(--mat-app-primary);
      color: white;
      border: none;
      border-bottom-right-radius: 4px;
      align-self: flex-end;
      margin-left: auto;
      max-width: 100%;
    }
    
    .assistant-bubble {
      background: var(--mat-app-surface-container-high);
      color: var(--mat-app-on-surface);
      border: 1px solid var(--mat-app-border-variant);
      border-bottom-left-radius: 4px;
      max-width: 100%;
    }
    
    /* Alineación de contenido según emisor */
    .user-message {
      align-items: flex-end;
      text-align: right;
      align-self: flex-end;
    }
    
    .assistant-message {
      align-items: flex-start;
      text-align: left;
      align-self: flex-start;
    }

    .message-text {
      color: inherit;
    }

    .message-text :global(pre) {
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
    }

    .error-content {
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

    /* Estilos para el indicador de puntos */
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

    :host-context(.message:hover) .message-actions {
      opacity: 1;
      transform: translateY(0);
    }

    .action-button {
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
    }

    .metadata-item {
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
    }

    .agent-thoughts summary {
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
    }

    .agent-thoughts .thought-text {
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

      .action-button {
        width: 28px;
        height: 28px;
      }
    }

    @media (max-width: 480px) {
      .message-content {
        max-width: calc(100% - 44px);
      }

      .message-body {
        padding: 10px 14px;
      }
    }
  `]
})
export class MessageContentComponent {
  readonly attachments = computed(() => this.message().metadata?.attachments ?? []);

  // Inject services
  public formatter = inject(MessageFormatterService);
  
  // Inputs
  readonly message = input.required<ChatMessage>();
  readonly showMetadata = input<boolean>(false);
  
  // Outputs
  readonly actionTriggered = output<{
    type: string;
    messageId: string;
    data?: any;
  }>();
  
  // Computed values
  readonly formattedContent = computed(() => {
    const content = this.message().content;
    return this.formatter.formatContent(content);
  });
  
  // Event handlers
  onCopy(): void {
    this.actionTriggered.emit({
      type: 'copy',
      messageId: this.message().id
    });
  }

  onRegenerate(): void {
    this.actionTriggered.emit({
      type: 'regenerate',
      messageId: this.message().id
    });
  }
  
  onEdit(): void {
    this.actionTriggered.emit({
      type: 'edit',
      messageId: this.message().id
    });
  }
}
