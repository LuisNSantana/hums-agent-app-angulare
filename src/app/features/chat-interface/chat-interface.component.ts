import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChatService } from '../../core/services/chat.service';
import { ChatMessage, Conversation, ChatAttachment } from '../../shared/models/chat.models';
import { ChatSidebarComponent } from '../chat-sidebar/chat-sidebar.component';
import { ChatMessagesComponent } from '../chat-messages/chat-messages.component';
import { ChatInputComponent } from '../chat-input/chat-input.component';
import { ChatHeaderComponent } from '../chat-header/chat-header.component';
import { ModelSelectionService } from './services/model-selection.service';
import { LayoutService } from './services/layout.service';

@Component({
  selector: 'app-chat-interface',
  standalone: true,
  imports: [
    CommonModule,
    ChatSidebarComponent,
    ChatMessagesComponent,
    ChatInputComponent,
    ChatHeaderComponent
  ],
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
          [sidebarOpen]="sidebarOpen()"
          (toggleSidebar)="toggleSidebar()"
        />

        <!-- Messages Container -->
        <div class="chat-content">
          @if (currentConversation()) {
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
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                  </svg>
                </div>
                <h1 class="welcome-title">Welcome to Cleo</h1>
                <p class="welcome-subtitle">
                  Your AI-powered assistant ready to help with any task.
                  Start a conversation to explore what we can accomplish together.
                </p>
                <button 
                  class="welcome-button"
                  (click)="onNewConversation()"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                  </svg>
                  Start New Conversation
                </button>
              </div>
            </div>
          }
        </div>
        
        <!-- Input Area -->
        <app-chat-input
          [disabled]="isProcessing()"
          [showModelSelector]="true"
          [availableModels]="availableModels()"
          [selectedModel]="selectedModel()"
          [placeholder]="getInputPlaceholder()"
          [showSuggestions]="displaySuggestions()" 
          (messageSent)="onMessageSubmit($event)"
          (modelChanged)="onModelChanged($event)"
          (fileAttached)="onFileAttached($event)"
          (attachmentAdded)="onAttachmentAdded($event)"
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
    /* Estilos críticos para el layout */
    .chat-interface {
      display: grid;
      grid-template-rows: auto 1fr auto;
      grid-template-columns: 100%;
      height: 100vh;
      position: relative;
      background: var(--mat-app-background);
      color: var(--mat-app-on-surface);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .chat-interface.sidebar-open {
      grid-template-columns: 320px 1fr;
    }

    .chat-main {
      /* Default to first column; will shift when sidebar is open */
      grid-column: 1;
      grid-row: 1 / span 3;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      height: 100%;
      position: relative;
    }

    /* Shift chat-main to second column only when sidebar is open on desktop */
    .chat-interface.sidebar-open .chat-main {
      grid-column: 2;
    }

    @media (max-width: 768px) {
      .chat-interface.sidebar-open .mobile-overlay {
        display: block;
      }

      .chat-main {
        grid-column: 1;
      }

      .chat-interface.sidebar-open {
        grid-template-columns: 100%;
      }
    }

    .chat-content {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .mobile-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 40;
      display: none;
      animation: fadeIn 0.3s ease;
    }
  `],
  styleUrls: ['./chat-interface.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatInterfaceComponent implements OnInit, OnDestroy {
  private readonly chatService = inject(ChatService);
  private readonly modelSelectionService = inject(ModelSelectionService);
  private readonly layoutService = inject(LayoutService);

  private readonly destroy$ = new Subject<void>();
  readonly sidebarOpen = this.layoutService.sidebarOpen;
  readonly selectedModel = this.modelSelectionService.selectedModel;
  readonly displaySuggestions = this.layoutService.displaySuggestions;
  readonly pendingAttachments = signal<ChatAttachment[]>([]);
  readonly conversations = this.chatService.conversations;
  readonly currentConversation = this.chatService.currentConversation;
  readonly messages = this.chatService.messages;
  readonly isProcessing = this.chatService.isProcessing;
  readonly availableModels = this.chatService.availableModels;
  readonly currentConversationId = computed(() => this.currentConversation()?.id || null);

  constructor() {
    // Auto-hide sidebar on mobile
    this.handleResponsiveLayout();
    
    // Sync selected model using priority rules
    effect(() => {
      const models = this.availableModels();
      const defaultModel = this.chatService.getDefaultModel();
      const currentSel = this.modelSelectionService.selectedModel();
      
      const id = this.modelSelectionService.determineModelToUse(models, defaultModel, currentSel);
      this.modelSelectionService.selectedModel.set(id);
    });
    
    // Auto-hide suggestions after first message arrives
    effect(() => {
      if (this.messages().length > 0 && this.displaySuggestions()) {
        this.layoutService.hideSuggestions();
      }
    });
  }

  ngOnInit(): void {
    this.chatService.messageStream$
      .pipe(takeUntil(this.destroy$))
      .subscribe(chunk => {
        // Handle stream chunks silently
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async onNewConversation(): Promise<void> {
    try {
      await this.chatService.createConversation();
      if (window.innerWidth < 768) this.layoutService.toggleSidebar();
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  }

  async onConversationSelected(conversationId: string): Promise<void> {
    try {
      await this.chatService.loadConversation(conversationId);
      if (window.innerWidth < 768) this.layoutService.toggleSidebar();
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
  }

  async onMessageSubmit(event: { text: string; attachments?: ChatAttachment[] }): Promise<void> {
    try {
      let convId = this.currentConversationId();
      
      if (!convId) {
        await this.chatService.createConversation(undefined, event.text);
        convId = this.currentConversationId();
        
        if (window.innerWidth < 768) this.layoutService.toggleSidebar();
      }
      
      if (convId) {
        let modelId = this.selectedModel();
        const selected = this.availableModels().find(m => m.name === modelId);
        if (!selected?.isAvailable) {
          modelId = this.chatService.getDefaultModelId();
          this.modelSelectionService.selectedModel.set(modelId);
        }
        
        // Combine pending attachments with new attachments from the event
        const existingAttachments = this.pendingAttachments();
        const newAttachments = event.attachments || [];
        const allAttachments = [...existingAttachments, ...newAttachments];
        
        await this.chatService.sendMessage({
          message: event.text,
          conversationId: convId,
          model: modelId,
          attachments: allAttachments.length ? allAttachments : undefined
        });
        
        this.pendingAttachments.set([]);
      } else {
        console.error('Failed to get conversation ID');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  onFileAttached(file: File): void {
    // Handle file attachment
  }

  onAttachmentAdded(attachment: ChatAttachment): void {
    this.pendingAttachments.update(arr => [...arr, attachment]);
  }

  onMessageTyping(isTyping: boolean): void {
    // Handle typing indicator
  }

  onMessageAction(action: { type: string; messageId: string; data?: any }): void {
    switch (action.type) {
      case 'copy': this.copyMessage(action.messageId); break;
      case 'regenerate': this.regenerateMessage(action.messageId); break;
      case 'edit': this.editMessage(action.messageId, action.data); break;
    }
  }

  private copyMessage(id: string): void {
    const msg = this.messages().find(m => m.id === id);
    if (msg) navigator.clipboard?.writeText(msg.content);
  }

  private async regenerateMessage(id: string): Promise<void> {
    try {
      const convId = this.currentConversationId();
      if (convId) {
        // Buscar el mensaje original para regenerarlo
        const message = this.messages().find(m => m.id === id);
        if (message) {
          // Implementar regeneración según la API del ChatService
          await this.chatService.sendMessage({
            message: message.content,
            conversationId: convId,
            model: this.selectedModel()
            // Nota: regenerateMessageId no existe en la interfaz ChatRequest
            // Se necesitaría extender la interfaz o usar otro método
          });
        }
      }
    } catch (error) {
      console.error('Error regenerating message:', error);
    }
  }

  private editMessage(id: string, newContent: string): void {
    try {
      const convId = this.currentConversationId();
      if (convId) {
        // Implementar edición de mensaje según la API del ChatService
        // Esto dependerá de cómo el ChatService maneja la edición
        // Ejemplo: this.chatService.sendMessage({ editMessageId: id, message: newContent, conversationId: convId });
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
  }

  onModelChanged(modelId: string): void {
    const id = this.modelSelectionService.determineModelToUse(
      this.availableModels(),
      this.chatService.getDefaultModel(),
      modelId
    );
    this.modelSelectionService.selectedModel.set(id);
  }

  toggleSidebar(): void {
    this.layoutService.toggleSidebar();
  }

  private handleResponsiveLayout(): void {
    const checkScreenSize = () => {
      if (window.innerWidth < 768) {
        this.layoutService.setSidebarOpen(false);
      } else {
        this.layoutService.setSidebarOpen(true);
      }
    };

    // Check on component init
    if (typeof window !== 'undefined') {
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
    }
  }

  getInputPlaceholder(): string {
    return this.layoutService.getInputPlaceholder(
      this.isProcessing(),
      !!this.currentConversation()
    );
  }
}