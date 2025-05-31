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
  `,  styles: [`    .messages-container {
      flex: 1;
      overflow-y: auto;
      scroll-behavior: smooth;
      background: var(--mat-app-background);
      position: relative;
    }

    .messages-container::-webkit-scrollbar {
      width: 8px;
    }

    .messages-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .messages-container::-webkit-scrollbar-thumb {
      background: var(--mat-app-surface-variant);
      border-radius: 4px;
      transition: background 0.2s ease;
    }

    .messages-container::-webkit-scrollbar-thumb:hover {
      background: var(--mat-app-primary);
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
      gap: 24px;
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
      width: 100%;
    }    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 48px 24px;
      background: var(--mat-app-surface-container);
      border: 1px solid var(--mat-app-border);
      border-radius: 24px;
      margin: 48px auto;
      max-width: 500px;
      box-shadow: var(--mat-app-shadow);
      animation: fadeInScale 0.6s ease-out;
    }

    .empty-icon {
      color: var(--mat-app-primary);
      margin-bottom: 24px;
      opacity: 0.8;
      background: var(--mat-app-gradient-primary);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 2px 4px rgba(99, 102, 241, 0.3));
    }

    .empty-title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 12px;
      color: var(--mat-app-on-surface);
      background: var(--mat-app-gradient-primary);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .empty-description {
      color: var(--mat-app-on-surface-variant);
      font-size: 16px;
      max-width: 400px;
      line-height: 1.6;
      font-weight: 400;
    }

    .typing-indicator {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      animation: slideInLeft 0.4s ease-out;
      padding: 0 8px;
    }

    .message-avatar {
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
    }

    .message-avatar.assistant {
      background: var(--mat-app-gradient-primary);
      color: var(--mat-app-on-primary);
      animation: avatarPulse 2s ease-in-out infinite;
    }

    .typing-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }    .typing-bubbles {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 16px 20px;
      background: var(--mat-app-surface-container-high);
      border: 1px solid var(--mat-app-border);
      border-radius: 20px;
      border-bottom-left-radius: 6px;
      width: fit-content;
      box-shadow: var(--mat-app-shadow);
    }

    .bubble {
      width: 10px;
      height: 10px;
      background: var(--mat-app-primary);
      border-radius: 50%;
      animation: bubbleBounce 1.4s ease-in-out infinite both;
      box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
    }

    .bubble:nth-child(1) { animation-delay: -0.32s; }
    .bubble:nth-child(2) { animation-delay: -0.16s; }
    .bubble:nth-child(3) { animation-delay: 0s; }

    .typing-text {
      font-size: 12px;
      color: var(--mat-app-on-surface-variant);
      margin-left: 8px;
      font-weight: 500;
    }

    .thinking-gradient {
      background: var(--mat-app-gradient-hero);
      background-size: 200% 200%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: gradientShift 3s linear infinite;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    @keyframes slideInLeft {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes bubbleBounce {
      0%, 80%, 100% {
        transform: scale(0.8);
        opacity: 0.7;
      }
      40% {
        transform: scale(1.2);
        opacity: 1;
      }
    }

    @keyframes avatarPulse {
      0%, 100% {
        transform: scale(1);
        box-shadow: var(--mat-app-shadow), 0 0 0 0 rgba(99, 102, 241, 0.4);
      }
      50% {
        transform: scale(1.05);
        box-shadow: var(--mat-app-shadow-md), 0 0 0 8px rgba(99, 102, 241, 0);
      }
    }

    @media (max-width: 768px) {
      .messages-list {
        padding: 16px;
        gap: 20px;
      }

      .empty-state {
        margin: 24px;
        padding: 32px 20px;
      }

      .empty-title {
        font-size: 24px;
      }

      .empty-description {
        font-size: 14px;
      }

      .message-avatar {
        width: 36px;
        height: 36px;
      }

      .typing-bubbles {
        padding: 12px 16px;
      }
    }

    @media (max-width: 480px) {
      .messages-list {
        padding: 12px;
      }

      .empty-state {
        margin: 16px;
        padding: 24px 16px;
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
