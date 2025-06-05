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

/**
 * Define tipos de acciones de mensaje para type-safety
 */
export type MessageActionType = 'copy' | 'regenerate' | 'edit' | 'delete' | 'openTool';

/**
 * Interface para acciones de mensaje con tipado estricto
 */
export interface MessageAction {
  type: MessageActionType;
  messageId: string;
  data?: unknown;
}

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
        } @else {          <div class="messages-list">
            @for (message of messages(); track message.id) {
              @if (message.role === 'system' && message.metadata?.toolStatus) {
                <!-- Mensajes de sistema para herramientas -->
                <div class="tool-system-message" 
                     [class.pending]="message.metadata?.toolStatus === 'pending'"
                     [class.success]="message.metadata?.toolStatus === 'success'"
                     [class.error]="message.metadata?.toolStatus === 'error'">
                  @if (message.metadata?.toolStatus === 'pending') {
                    <span class="tool-loading-spinner" aria-label="Tool loading"></span>
                  } @else if (message.metadata?.toolStatus === 'success') {
                    <span class="tool-success-icon">✅</span>
                  } @else if (message.metadata?.toolStatus === 'error') {
                    <span class="tool-error-icon">❌</span>
                  }
                  <span class="tool-system-text">
                    {{ message.content }}
                  </span>
                </div>
              } @else {
                <!-- Mensajes regulares (user, assistant) -->
                <app-chat-message 
                  [message]="message"
                  (messageAction)="onMessageAction($event)"
                />
              }
            }
            
            @if (isLoading() && !hasStreamingMessage() && !hasPendingToolSystemMessage()) {
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

    .tool-system-message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--mat-app-surface-container-high);
      border: 1px solid var(--mat-app-border);
      border-radius: 20px;
      width: fit-content;
      margin: 0 auto;
      animation: fadeInScale 0.6s ease-out;
      position: relative;
    }    .tool-system-message.pending {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 193, 7, 0.1);
      color: #ffa000;
      border-radius: 16px;
      padding: 8px 12px;
      margin: 4px 0 4px 2.5em;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
      border-left: 3px solid #ffd600;
      border: 1px solid rgba(255, 193, 7, 0.3);
      animation: fadeInScale 0.3s ease-out;
      width: fit-content;
    }

    .tool-system-message.success {
      background: #1b2e1b;
      color: #81c784;
      border-left: 4px solid #4caf50;
      border: 1px solid #4caf50;
    }

    .tool-system-message.error {
      background: #2e1b1b;
      color: #e57373;
      border-left: 4px solid #f44336;
      border: 1px solid #f44336;
    }    .tool-loading-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 193, 7, 0.3);
      border-top: 2px solid #ffd600;
      border-radius: 50%;
      display: inline-block;
      margin-right: 6px;
      animation: spin 1s linear infinite;
    }

    .tool-success-icon,
    .tool-error-icon {
      font-size: 18px;
      margin-right: 0.5em;
      display: inline-block;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class ChatMessagesComponent implements OnChanges, AfterViewChecked {
  // Inputs using Angular 20+ syntax
  readonly messages = input<ChatMessage[]>([]);
  readonly isLoading = input<boolean>(false);
  readonly conversationId = input<string>('');

  // Outputs con tipado estricto
  readonly messageAction = output<MessageAction>();

  @ViewChild('messagesContainer') 
  private messagesContainer!: ElementRef<HTMLDivElement>;

  private shouldScrollToBottom = true;

  // Computed properties
  readonly hasStreamingMessage = computed(() => 
    this.messages().some(m => m.isStreaming)
  );

  readonly hasPendingToolSystemMessage = computed(() =>
    this.messages().some(m => m.role === 'system' && m.metadata?.toolStatus === 'pending')
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
  /**
   * Maneja acciones desde los mensajes individuales y emite el evento al componente padre
   * @param action - Acción del mensaje con tipo y datos
   */
  onMessageAction(action: MessageAction): void {
    // Validación básica antes de emitir
    if (!action.messageId) {
      console.warn('MessageAction received without messageId');
      return;
    }
    
    // Emitir acción validada al componente padre
    this.messageAction.emit(action);
  }

  /**
   * Realiza scroll hasta la parte inferior de la conversación
   * Optimizado para performance con requestAnimationFrame
   */
  private scrollToBottom(): void {
    if (this.messagesContainer) {
      requestAnimationFrame(() => {
        const container = this.messagesContainer.nativeElement;
        container.scrollTop = container.scrollHeight;
      });
    }
  }

  /**
   * Computed property: Verifica si hay un mensaje de asistente en streaming que utiliza herramientas
   */
  readonly hasAssistantToolLoading = computed(() => {
    const streamingMsg = this.messages().find(m => m.role === 'assistant' && m.isStreaming);
    return !!streamingMsg?.metadata?.toolsUsed?.length;
  });

  /**
   * Computed property: Devuelve el texto de loading según la herramienta usada
   */
  readonly toolLoadingText = computed((): string => {
    const streamingMsg = this.messages().find(m => m.role === 'assistant' && m.isStreaming);
    if (streamingMsg && streamingMsg.metadata?.toolsUsed?.length) {
      const tool = streamingMsg.metadata.toolsUsed[0];
      switch (tool) {
        case 'searchWeb':
          return 'Buscando en la web...';
        case 'analyzeWeb':
          return 'Analizando información web...';
        case 'googleCalendar':
          return 'Accediendo a Google Calendar...';
        case 'googleDrive':
          return 'Accediendo a Google Drive...';
        case 'analyzeDocument':
          return 'Analizando documento...';
        default:
          return `Ejecutando herramienta: ${tool}`;
      }
    }
    return 'Agent Hums is thinking...';
  });
}
