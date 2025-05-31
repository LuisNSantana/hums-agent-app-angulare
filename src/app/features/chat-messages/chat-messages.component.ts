/**
 * Chat Messages Component - Displays conversation messages
 * Optimized for streaming AI responses with modern UI
 */

import { 
  Component, 
  input, 
  output,
  OnChanges, 
  SimpleChanges,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  AfterViewChecked,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../shared/models/chat.models';
import { ChatMessageComponent } from '../chat-message/chat-message.component';

@Component({
  selector: 'app-chat-messages',
  standalone: true,
  imports: [
    CommonModule,
    ChatMessageComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="messages-container" #messagesContainer>
      <div class="messages-content">
        @if (messages().length === 0 && !isLoading()) {
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3 class="empty-title">Start the conversation</h3>
            <p class="empty-description">
              Send a message to begin chatting with your AI assistant.
            </p>
          </div>
        } @else {
          <div class="messages-list">            @for (message of messages(); track message.id) {
              <app-chat-message 
                [message]="message"
                (messageAction)="onMessageAction($event)"
              />
            }
            
            @if (isLoading() && !hasStreamingMessage()) {
              <div class="typing-indicator">
                <div class="message-avatar assistant">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
                  </svg>
                </div>
                <div class="typing-content">
                  <div class="typing-bubbles">
                    <div class="bubble"></div>
                    <div class="bubble"></div>
                    <div class="bubble"></div>
                  </div>
                  <span class="typing-text">
                    <span class="thinking-gradient">Agent Hums is thinking...</span>
                  </span>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .messages-container {
      flex: 1;
      overflow-y: auto;
      scroll-behavior: smooth;
      background: var(--background);

      /* Hide scrollbar while keeping scroll functionality */
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;     /* Firefox */
    }

    .messages-container::-webkit-scrollbar {
      display: none; /* Safari and Chrome */
    }

    .messages-content {
      min-height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }

    .messages-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1.5rem;
      max-width: 48rem;
      margin: 0 auto;
      width: 100%;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 2rem;
      opacity: 0.7;
    }

    .empty-icon {
      color: var(--muted-foreground);
      margin-bottom: 1.5rem;
      opacity: 0.6;
    }

    .empty-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--foreground);
    }

    .empty-description {
      color: var(--muted-foreground);
      font-size: 1rem;
      max-width: 300px;
      line-height: 1.5;
    }

    .typing-indicator {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      animation: fadeIn 0.3s ease-out;
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

    .message-avatar.assistant {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: var(--primary-foreground);
    }

    .typing-content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .typing-bubbles {
      display: flex;
      gap: 0.25rem;
      padding: 0.75rem 1rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 1rem;
      border-bottom-left-radius: 0.25rem;
      width: fit-content;
    }

    .bubble {
      width: 8px;
      height: 8px;
      background: var(--muted-foreground);
      border-radius: 50%;
      animation: bounce 1.4s ease-in-out infinite both;
    }

    .bubble:nth-child(1) { animation-delay: -0.32s; }
    .bubble:nth-child(2) { animation-delay: -0.16s; }
    .bubble:nth-child(3) { animation-delay: 0s; }

    .typing-text {
      font-size: 0.75rem;
      color: var(--muted-foreground);
      margin-left: 0.5rem;
    }

    .thinking-gradient {
      background: linear-gradient(90deg, var(--primary), var(--primary-dark), var(--primary));
      background-size: 200% 200%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-fill-color: transparent;
      animation: gradient-move 2s linear infinite;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    @keyframes gradient-move {
      0% { background-position: 0% 50%; }
      100% { background-position: 100% 50%; }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes bounce {
      0%, 80%, 100% {
        transform: scale(0);
        opacity: 0.5;
      }
      40% {
        transform: scale(1);
        opacity: 1;
      }
    }

    /* Custom scrollbar */
    .messages-container::-webkit-scrollbar {
      width: 6px;
    }

    .messages-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .messages-container::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 3px;
    }

    .messages-container::-webkit-scrollbar-thumb:hover {
      background: var(--muted-foreground);
    }

    @media (max-width: 768px) {
      .messages-list {
        padding: 1rem;
      }

      .empty-title {
        font-size: 1.25rem;
      }

      .empty-description {
        font-size: 0.875rem;
      }
    }
  `]
})
export class ChatMessagesComponent implements OnChanges, AfterViewChecked {
  // Inputs using Angular 20+ syntax
  readonly messages = input<ChatMessage[]>([]);
  readonly isLoading = input<boolean>(false);
  readonly conversationId = input<string>('');

  // Outputs
  readonly messageAction = output<{ type: string; messageId: string; data?: any }>();

  @ViewChild('messagesContainer') 
  private messagesContainer!: ElementRef<HTMLDivElement>;

  private shouldScrollToBottom = true;

  // Computed properties
  readonly hasStreamingMessage = computed(() => 
    this.messages().some(m => m.isStreaming)
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['messages']) {
      this.shouldScrollToBottom = true;
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }
  onMessageAction(action: { type: string; messageId: string; data?: any }): void {
    this.messageAction.emit(action);
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }
}
