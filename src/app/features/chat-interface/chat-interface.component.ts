/**
 * Chat Interface Component - Main chat container
 * Modern UI with AI-powered features
 */

import { 
  Component, 
  OnInit, 
  OnDestroy, 
  ChangeDetectionStrategy, 
  inject,
  signal,
  computed,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { ChatService } from '../../core/services/chat.service';
import { ChatMessage, Conversation } from '../../shared/models/chat.models';
import { ChatSidebarComponent } from '../chat-sidebar/chat-sidebar.component';
import { ChatMessagesComponent } from '../chat-messages/chat-messages.component';
import { ChatInputComponent } from '../chat-input/chat-input.component';
import { ChatHeaderComponent } from '../chat-header/chat-header.component';

@Component({
  selector: 'app-chat-interface',
  standalone: true,  imports: [
    CommonModule,
    ChatSidebarComponent,
    ChatMessagesComponent,
    ChatInputComponent,
    ChatHeaderComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chat-interface" [class.sidebar-open]="sidebarOpen()">
      <!-- Sidebar -->
      <app-chat-sidebar
        [conversations]="conversations()"
        [currentConversationId]="currentConversationId()"
        [isOpen]="sidebarOpen()"
        (conversationSelected)="onConversationSelected($event)"
        (newConversation)="onNewConversation()"
        (deleteConversation)="onDeleteConversation($event)"
        (toggleSidebar)="toggleSidebar()"
      />

      <!-- Main Chat Area -->
      <div class="chat-main">
        <!-- Header -->
        <app-chat-header
          [currentConversation]="currentConversation()"
          [availableModels]="availableModels()"
          [selectedModel]="selectedModel()"
          [sidebarOpen]="sidebarOpen()"
          (toggleSidebar)="toggleSidebar()"
          (modelChanged)="onModelChanged($event)"
        />

        <!-- Messages Container -->
        <div class="chat-content">          @if (currentConversation()) {
            <app-chat-messages
              [messages]="messages()"
              [isLoading]="isProcessing()"
              [conversationId]="currentConversationId()!"
              (messageAction)="onMessageAction($event)"
            />
          } @else {
            <div class="welcome-screen">
              <div class="welcome-content">
                <div class="welcome-icon">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 12l2 2 4-4"/>
                    <path d="M21 12c0 1.657-.25 3.25-.713 4.727-.46 1.477-1.146 2.829-2.006 3.956-.86 1.127-1.895 2.03-3.036 2.647C13.965 23.948 12.5 24 12 24s-1.965-.052-3.245-.67c-1.14-.617-2.176-1.52-3.036-2.647-.86-1.127-1.546-2.479-2.006-3.956C3.25 15.25 3 13.657 3 12s.25-3.25.713-4.727c.46-1.477 1.146-2.829 2.006-3.956.86-1.127 1.895-2.03 3.036-2.647C10.035.052 11.5 0 12 0s1.965.052 3.245.67c1.14.617 2.176 1.52 3.036 2.647.86 1.127 1.546 2.479 2.006 3.956C20.75 8.75 21 10.343 21 12z"/>
                  </svg>
                </div>
                <h1 class="welcome-title">Welcome to Agent Hums</h1>
                <p class="welcome-subtitle">
                  Your AI-powered assistant ready to help with any task.
                  Start a conversation to get started.
                </p>
                <button 
                  class="welcome-button"
                  (click)="onNewConversation()"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Start New Conversation
                </button>
              </div>
            </div>
          }
        </div>        <!-- Input Area -->
        <app-chat-input
          [disabled]="isProcessing()"
          [showModelSelector]="true"
          [availableModels]="availableModels()"
          [selectedModel]="selectedModel()"
          [placeholder]="getInputPlaceholder()"
          (messageSent)="onMessageSubmit($event)"
          (modelChanged)="onModelChanged($event)"
          (fileAttached)="onFileAttached($event)"
          (messageTyping)="onMessageTyping($event)"
        />
      </div>

      <!-- Mobile Overlay -->
      @if (sidebarOpen()) {
        <div 
          class="mobile-overlay"
          (click)="toggleSidebar()"
        ></div>
      }
    </div>
  `,
  styles: [`
    .chat-interface {
      display: flex;
      height: 100vh;
      background: var(--background);
      color: var(--foreground);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .chat-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      background: var(--background);
    }

    .chat-content {
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    .welcome-screen {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 2rem;
    }

    .welcome-content {
      text-align: center;
      max-width: 500px;
      animation: fadeInUp 0.6s ease-out;
    }

    .welcome-icon {
      color: var(--primary);
      margin-bottom: 2rem;
      opacity: 0.8;
    }

    .welcome-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.2;
    }

    .welcome-subtitle {
      font-size: 1.125rem;
      color: var(--muted-foreground);
      margin-bottom: 2.5rem;
      line-height: 1.6;
    }

    .welcome-button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.875rem 1.5rem;
      background: var(--primary);
      color: var(--primary-foreground);
      border: none;
      border-radius: 0.75rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .welcome-button:hover {
      background: var(--primary-dark);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }

    .welcome-button:active {
      transform: translateY(0);
    }

    .mobile-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 40;
      display: none;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 768px) {
      .chat-interface.sidebar-open .mobile-overlay {
        display: block;
      }

      .welcome-title {
        font-size: 2rem;
      }

      .welcome-subtitle {
        font-size: 1rem;
      }
    }

    /* CSS Variables for theming */
    :host {
      --background: #ffffff;
      --foreground: #0f172a;
      --muted-foreground: #64748b;
      --primary: #3b82f6;
      --primary-dark: #2563eb;
      --primary-foreground: #ffffff;
      --border: #e2e8f0;
      --input: #f1f5f9;
      --card: #ffffff;
      --card-foreground: #0f172a;
      --radius: 0.5rem;
    }

    @media (prefers-color-scheme: dark) {
      :host {
        --background: #0f172a;
        --foreground: #f8fafc;
        --muted-foreground: #94a3b8;
        --primary: #3b82f6;
        --primary-dark: #2563eb;
        --primary-foreground: #ffffff;
        --border: #334155;
        --input: #1e293b;
        --card: #1e293b;
        --card-foreground: #f8fafc;
      }
    }
  `]
})
export class ChatInterfaceComponent implements OnInit, OnDestroy {
  private readonly chatService = inject(ChatService);
  private readonly destroy$ = new Subject<void>();

  // UI State
  readonly sidebarOpen = signal(true);
  readonly selectedModel = signal(''); // Inicialmente vacío

  // Chat State from service
  readonly conversations = this.chatService.conversations;
  readonly currentConversation = this.chatService.currentConversation;
  readonly messages = this.chatService.messages;
  readonly isProcessing = this.chatService.isProcessing;
  readonly availableModels = this.chatService.availableModels;

  // Computed values
  readonly currentConversationId = computed(() => 
    this.currentConversation()?.id || null
  );

  constructor() {
    // Auto-hide sidebar on mobile
    this.handleResponsiveLayout();
    // Sincroniza selectedModel con el primer modelo local disponible
    effect(() => {
      const models = this.availableModels();
      // Si no hay modelo seleccionado o el seleccionado no es válido, selecciona uno válido
      if (models.length > 0 && (!this.selectedModel() || !models.some(m => m.id === this.selectedModel()))) {
        const local = models.find(m => m.provider === 'local' && m.isAvailable);
        this.selectedModel.set(local?.id || models[0].id);
      }
    });
  }

  ngOnInit(): void {
    // Listen to stream updates
    this.chatService.messageStream$
      .pipe(takeUntil(this.destroy$))
      .subscribe(chunk => {
        // Handle real-time updates if needed
        console.log('Stream chunk received:', chunk);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async onNewConversation(): Promise<void> {
    try {
      console.log('[ChatInterface] Botón + crear nueva conversación');
      await this.chatService.createConversation();
      if (window.innerWidth < 768) {
        this.sidebarOpen.set(false);
      }
    } catch (error) {
      console.error('[ChatInterface] Error al crear conversación:', error);
    }
  }

  async onConversationSelected(conversationId: string): Promise<void> {
    try {
      await this.chatService.loadConversation(conversationId);
      // Hide sidebar on mobile after selecting conversation
      if (window.innerWidth < 768) {
        this.sidebarOpen.set(false);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }

  async onDeleteConversation(conversationId: string): Promise<void> {
    try {
      await this.chatService.deleteConversation(conversationId);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }  async onMessageSubmit(content: string): Promise<void> {
    try {
      let conversationId = this.currentConversationId();
      if (!conversationId) {
        console.log('[ChatInterface] No hay conversación activa, creando una nueva...');
        await this.chatService.createConversation(undefined, content);
        conversationId = this.currentConversationId();
        if (window.innerWidth < 768) {
          this.sidebarOpen.set(false);
        }
      }      if (conversationId) {
        console.log('[ChatInterface] Enviando mensaje a conversación:', conversationId);
        console.log('[ChatInterface] Modelo seleccionado:', this.selectedModel());
        console.log('[ChatInterface] Modelos disponibles:', this.availableModels());
        await this.chatService.sendMessage({
          message: content,
          conversationId,
          model: this.selectedModel()
        });
      }
    } catch (error) {
      console.error('[ChatInterface] Error al enviar mensaje:', error);
    }
  }
  onFileAttached(file: File): void {
    // TODO: Implement file attachment handling
    console.log('File attached:', file);
    // This could upload the file and add its content to the next message
  }
  onMessageTyping(isTyping: boolean): void {
    // TODO: Implement typing indicator for real-time collaboration
    console.log('User typing:', isTyping);
    // This could show typing indicators to other users in shared conversations
  }

  onMessageAction(action: { type: string; messageId: string; data?: any }): void {
    switch (action.type) {
      case 'copy':
        this.copyMessage(action.messageId);
        break;
      case 'regenerate':
        this.regenerateMessage(action.messageId);
        break;
      case 'edit':
        this.editMessage(action.messageId, action.data);
        break;
      default:
        console.log('Unknown message action:', action);
    }
  }

  private copyMessage(messageId: string): void {
    const message = this.messages().find(m => m.id === messageId);
    if (message && navigator.clipboard) {
      navigator.clipboard.writeText(message.content);
      // TODO: Show toast notification
      console.log('Message copied to clipboard');
    }
  }

  private async regenerateMessage(messageId: string): Promise<void> {
    // TODO: Implement message regeneration logic
    console.log('Regenerating message:', messageId);
    // This would resend the user's previous message to get a new AI response
  }

  private editMessage(messageId: string, newContent: string): void {
    // TODO: Implement message editing logic
    console.log('Editing message:', messageId, newContent);
    // This would update the message content and potentially trigger regeneration
  }

  onModelChanged(modelId: string): void {
    this.selectedModel.set(modelId);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }
  private handleResponsiveLayout(): void {
    const checkScreenSize = () => {
      if (window.innerWidth < 768) {
        this.sidebarOpen.set(false);
      } else {
        this.sidebarOpen.set(true);
      }
    };

    // Check on component init
    if (typeof window !== 'undefined') {
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
    }
  }

  /**
   * Get appropriate placeholder text for input
   */
  getInputPlaceholder(): string {
    if (this.isProcessing()) {
      return 'Agent is thinking...';
    }
    
    if (!this.currentConversation()) {
      return 'Type your message to start a new conversation...';
    }
    
    return 'Type your message...';
  }
}
