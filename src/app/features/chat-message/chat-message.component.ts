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
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../shared/models/chat.models';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="message" [class]="messageClasses()">
      <!-- Message Avatar -->
      <div class="message-avatar" [class]="message().role">
        @if (message().role === 'user') {
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
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

        <!-- Message Body -->
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
          } @else {
            <div class="message-text" [innerHTML]="formattedContent()"></div>
            
            @if (message().isStreaming) {
              <div class="streaming-cursor">▊</div>
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
      </div>
    </div>
  `,
  styles: [`
    .message {
      display: flex;
      gap: 0.75rem;
      width: 100%;
      animation: fadeInUp 0.3s ease-out;
    }

    .message.user {
      flex-direction: row-reverse;
    }

    .message.user .message-content {
      align-items: flex-end;
    }

    .message.user .message-body {
      background: var(--primary);
      color: var(--primary-foreground);
      border-radius: 1rem;
      border-bottom-right-radius: 0.25rem;
    }

    .message.assistant .message-body {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 1rem;
      border-bottom-left-radius: 0.25rem;
    }

    .message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .message-avatar.user {
      background: var(--muted);
      color: var(--muted-foreground);
    }

    .message-avatar.assistant {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: var(--primary-foreground);
    }

    .message-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-width: 0;
      max-width: calc(100% - 3rem);
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }

    .message.user .message-header {
      justify-content: flex-end;
    }

    .message-role {
      font-weight: 600;
    }

    .message-time {
      opacity: 0.7;
    }

    .message-model {
      background: var(--muted);
      color: var(--muted-foreground);
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-size: 0.625rem;
      font-weight: 500;
    }

    .message-body {
      padding: 0.75rem 1rem;
      position: relative;
      word-wrap: break-word;
      line-height: 1.6;
    }

    .message-text {
      color: inherit;
    }

    .message-text :global(pre) {
      background: var(--muted);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1rem;
      overflow-x: auto;
      margin: 0.5rem 0;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
      font-size: 0.875rem;
    }

    .message-text :global(code) {
      background: var(--muted);
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
      font-size: 0.875rem;
    }

    .message-text :global(p) {
      margin: 0 0 0.75rem 0;
    }

    .message-text :global(p:last-child) {
      margin-bottom: 0;
    }

    .error-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--destructive);
      font-weight: 500;
    }

    .streaming-cursor {
      display: inline-block;
      animation: blink 1s infinite;
      color: var(--primary);
      font-weight: bold;
    }

    .message-actions {
      display: flex;
      gap: 0.25rem;
      margin-top: 0.5rem;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .message:hover .message-actions {
      opacity: 1;
    }

    .action-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 0.375rem;
      color: var(--muted-foreground);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .action-button:hover {
      background: var(--muted);
      color: var(--foreground);
      border-color: var(--border);
    }

    .message-metadata {
      display: flex;
      gap: 0.75rem;
      font-size: 0.75rem;
      color: var(--muted-foreground);
      margin-top: 0.25rem;
    }

    .metadata-item {
      opacity: 0.7;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }

    @media (max-width: 768px) {
      .message-content {
        max-width: calc(100% - 2.5rem);
      }

      .message-body {
        padding: 0.625rem 0.875rem;
      }

      .message-header {
        font-size: 0.6875rem;
      }
    }
  `]
})
export class ChatMessageComponent {
  // Modern Angular 20+ input/output syntax
  readonly message = input.required<ChatMessage>();
  readonly messageAction = output<{
    type: string;
    messageId: string;
    data?: any;
  }>();

  readonly showMetadata = signal(false);

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
}
