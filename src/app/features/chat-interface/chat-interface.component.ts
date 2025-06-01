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
import { ChatMessage, Conversation, ChatAttachment } from '../../shared/models/chat.models';
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
        </div>        <!-- Input Area -->        <app-chat-input
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
  `,  styles: [`    .chat-interface {
      display: flex;
      height: 100vh;
      background: var(--mat-app-background);
      color: var(--mat-app-on-surface);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }    .chat-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      background: transparent;
      position: relative;
    }.chat-content {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      position: relative;
      scrollbar-width: thin;
      scrollbar-color: var(--mat-app-accent-hover) transparent;
      padding: 0;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--mat-app-accent-hover);
        border-radius: 3px;
        
        &:hover {
          background: var(--mat-app-accent);
        }
      }
    }.welcome-screen {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 2rem 1rem;
      position: relative;
      min-height: 60vh;
    }    .welcome-content {
      text-align: center;
      max-width: 600px;
      width: 100%;
      animation: fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      padding: 32px 24px;
      background: var(--mat-app-surface-container);
      border-radius: 24px;
      border: 1px solid var(--mat-app-border);
      box-shadow: var(--mat-app-shadow-lg);

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--mat-app-gradient-hero);
        opacity: 0.02;
        border-radius: 24px;
        pointer-events: none;
      }
    }.welcome-icon {
      color: var(--mat-app-accent);
      margin-bottom: 24px;
      opacity: 0.9;
      filter: drop-shadow(0 4px 8px rgba(139, 92, 246, 0.3));
      
      svg {
        animation: iconFloat 3s ease-in-out infinite;
        width: 56px;
        height: 56px;
      }
    }

    @keyframes iconFloat {
      0%, 100% { 
        transform: translateY(0px) scale(1); 
      }
      50% { 
        transform: translateY(-8px) scale(1.05); 
      }
    }    .welcome-title {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 16px;
      background: var(--mat-app-gradient-hero);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.1;
      letter-spacing: -0.02em;
      text-shadow: var(--mat-app-shadow-text);
    }

    .welcome-subtitle {
      font-size: 1.1rem;
      color: var(--mat-app-on-surface-variant);
      margin-bottom: 32px;
      line-height: 1.5;
      font-weight: 500;
      opacity: 0.9;
    }

    .welcome-button {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 16px 32px;
      background: var(--mat-app-gradient-hero);
      color: white;
      border: none;
      border-radius: 16px;
      font-size: 1.1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: var(--mat-app-shadow-lg);
      position: relative;
      overflow: hidden;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, 
          transparent 0%, 
          rgba(255, 255, 255, 0.2) 50%, 
          transparent 100%);
        transition: left 0.5s ease;
      }

      svg {
        transition: all 0.3s ease;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
      }

      &:hover {
        transform: translateY(-4px) scale(1.02);
        box-shadow: var(--mat-app-shadow-xl);

        &::before {
          left: 100%;
        }

        svg {
          transform: scale(1.1) rotate(90deg);
        }
      }

      &:active {
        transform: translateY(-2px) scale(1.01);
      }
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

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(40px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }    @media (max-width: 1024px) {
      .welcome-content {
        max-width: 500px;
        padding: 28px 20px;
        border-radius: 20px;
      }

      .welcome-title {
        font-size: 2.25rem;
      }

      .welcome-subtitle {
        font-size: 1.05rem;
        margin-bottom: 28px;
      }
    }

    @media (max-width: 768px) {
      .chat-interface.sidebar-open .mobile-overlay {
        display: block;
      }

      .welcome-screen {
        padding: 1.5rem 1rem;
        min-height: 50vh;
      }

      .welcome-content {
        padding: 24px 20px;
        margin: 0 8px;
        border-radius: 18px;
        max-width: 100%;

        &::before {
          border-radius: 18px;
        }
      }

      .welcome-icon {
        margin-bottom: 20px;
        
        svg {
          width: 48px;
          height: 48px;
        }
      }

      .welcome-title {
        font-size: 2rem;
        margin-bottom: 14px;
      }

      .welcome-subtitle {
        font-size: 1rem;
        margin-bottom: 24px;
        line-height: 1.4;
      }

      .welcome-button {
        padding: 12px 24px;
        font-size: 0.95rem;
        border-radius: 14px;
        gap: 10px;
      }
    }

    @media (max-width: 600px) {
      .welcome-screen {
        padding: 1rem 0.75rem;
      }

      .welcome-content {
        padding: 20px 16px;
        margin: 0 4px;
        border-radius: 16px;
      }

      .welcome-title {
        font-size: 1.75rem;
      }

      .welcome-subtitle {
        font-size: 0.95rem;
        margin-bottom: 20px;
      }
    }

    @media (max-width: 480px) {
      .welcome-screen {
        padding: 1rem 0.5rem;
        min-height: 45vh;
      }

      .welcome-content {
        padding: 18px 14px;
        border-radius: 14px;
      }

      .welcome-icon {
        margin-bottom: 16px;
        
        svg {
          width: 40px;
          height: 40px;
        }
      }

      .welcome-title {
        font-size: 1.5rem;
        margin-bottom: 12px;
      }

      .welcome-subtitle {
        font-size: 0.9rem;
        margin-bottom: 18px;
        line-height: 1.3;
      }

      .welcome-button {
        padding: 10px 20px;
        font-size: 0.9rem;
        border-radius: 12px;
        gap: 8px;

        svg {
          width: 16px;
          height: 16px;
        }
      }
    }

    @media (max-width: 360px) {
      .welcome-content {
        padding: 16px 12px;
        margin: 0 2px;
        border-radius: 12px;
      }

      .welcome-icon {
        margin-bottom: 14px;
        
        svg {
          width: 36px;
          height: 36px;
        }
      }

      .welcome-title {
        font-size: 1.3rem;
        margin-bottom: 10px;
      }

      .welcome-subtitle {
        font-size: 0.85rem;
        margin-bottom: 16px;
      }

      .welcome-button {
        padding: 8px 16px;
        font-size: 0.85rem;
        gap: 6px;

        svg {
          width: 14px;
          height: 14px;        }
      }
    }

    /* Landscape mode optimizations for mobile */
    @media (max-height: 500px) and (orientation: landscape) {
      .welcome-screen {
        padding: 0.75rem 0.5rem;
        min-height: auto;
      }

      .welcome-content {
        padding: 16px 20px;
        max-width: 400px;
      }

      .welcome-icon {
        margin-bottom: 12px;
        
        svg {
          width: 32px;
          height: 32px;
        }
      }

      .welcome-title {
        font-size: 1.4rem;
        margin-bottom: 8px;
      }

      .welcome-subtitle {
        font-size: 0.85rem;
        margin-bottom: 16px;
        line-height: 1.3;
      }

      .welcome-button {
        padding: 8px 16px;
        font-size: 0.85rem;
      }
    }

    /* High density screens */
    @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
      .welcome-content {
        backdrop-filter: blur(20px);
      }
    }

    /* Enhanced animations */
    .welcome-content > * {
      animation: slideInStagger 0.8s cubic-bezier(0.4, 0, 0.2, 1) both;
    }

    .welcome-icon {
      animation-delay: 0.1s;
    }

    .welcome-title {
      animation-delay: 0.2s;
    }

    .welcome-subtitle {
      animation-delay: 0.3s;
    }

    .welcome-button {
      animation-delay: 0.4s;
    }

    @keyframes slideInStagger {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
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
  readonly displaySuggestions = signal(true); // Nuevo signal para controlar sugerencias
  readonly pendingAttachments = signal<ChatAttachment[]>([]); // Store attachments temporarily

  // Chat State from service
  readonly conversations = this.chatService.conversations;
  readonly currentConversation = this.chatService.currentConversation;
  readonly messages = this.chatService.messages;
  readonly isProcessing = this.chatService.isProcessing;
  readonly availableModels = this.chatService.availableModels;

  // Computed values
  readonly currentConversationId = computed(() => 
    this.currentConversation()?.id || null
  );  constructor() {
    // Auto-hide sidebar on mobile
    this.handleResponsiveLayout();
    
    // Sincroniza selectedModel con el modelo por defecto cuando se cargan los modelos
    effect(() => {
      const models = this.availableModels();
      const defaultModel = this.chatService.getDefaultModel();
      const currentSelection = this.selectedModel();
      
      console.log('[ChatInterface] 🔄 Effect de modelo - Models:', models.length, 'Default:', defaultModel?.name, 'Current:', currentSelection);
      
      if (models.length > 0) {
        // Prioridad 1: Mantener la selección actual si es válida
        if (currentSelection) {
          const isValidSelection = models.some(m => m.id === currentSelection);
          if (isValidSelection) {
            console.log('[ChatInterface] ✓ Manteniendo selección actual válida:', currentSelection);
            return; // Mantener la selección actual
          } else {
            console.log('[ChatInterface] ✗ Selección actual inválida:', currentSelection);
          }
        }
        
        // Prioridad 2: Usar el modelo por defecto de la configuración
        if (defaultModel) {
          const isDefaultAvailable = defaultModel.isAvailable || models.some(m => m.id === 'gemma3:4b');
          if (isDefaultAvailable) {
            this.selectedModel.set(defaultModel.id);
            console.log('[ChatInterface] ✅ Modelo por defecto seleccionado:', defaultModel.name, '(', defaultModel.id, ')');
            return;
          } else {
            console.log('[ChatInterface] ⚠️ Modelo por defecto no disponible:', defaultModel.name);
          }
        }
        
        // Prioridad 3: Gemma 3:4b específicamente (si existe)
        const gemmaModel = models.find(m => m.id === 'gemma3:4b');
        if (gemmaModel) {
          this.selectedModel.set('gemma3:4b');
          console.log('[ChatInterface] ✅ Modelo Gemma 3:4b seleccionado explícitamente');
          return;
        }
        
        // Prioridad 4: Cualquier modelo disponible
        const availableModel = models.find(m => m.isAvailable);
        if (availableModel) {
          this.selectedModel.set(availableModel.id);
          console.log('[ChatInterface] ℹ️ Usando primer modelo disponible:', availableModel.name, '(', availableModel.id, ')');
          return;
        }
        
        // Última opción: Simplemente usar el primer modelo de la lista
        this.selectedModel.set(models[0].id);
        console.log('[ChatInterface] ⚠️ Usando primer modelo de la lista (puede no estar disponible):', models[0].name);
      }
    });

    // Ocultar sugerencias después del primer mensaje
    effect(() => {
      if (this.messages().length > 0 && this.displaySuggestions()) {
        this.displaySuggestions.set(false);
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
        // Obtener el ID del modelo seleccionado en la UI
        const selectedModelId = this.selectedModel();
        
        // Verificar que el modelo existe y está disponible
        let modelToUse = '';
        const selectedModelObj = this.availableModels().find(m => m.id === selectedModelId);
        
        if (selectedModelObj && selectedModelObj.isAvailable) {
          // Usar el modelo seleccionado en la UI si está disponible
          modelToUse = selectedModelObj.id;
          console.log('[ChatInterface] 🔹 Usando modelo seleccionado:', selectedModelObj.name, '(', modelToUse, ')');
        } else {
          // Si no hay modelo seleccionado o no está disponible, usar el predeterminado
          modelToUse = this.chatService.getDefaultModelId();
          console.log('[ChatInterface] ⚠️ Modelo seleccionado no válido, usando predeterminado:', modelToUse);
          
          // Actualizar también el selector de UI para reflejar el modelo real que se está usando
          this.selectedModel.set(modelToUse);
        }
        
        console.log('[ChatInterface] 📨 Enviando mensaje a conversación:', conversationId);
        console.log('[ChatInterface] 🤖 Modelo final para la solicitud:', modelToUse);
          // Get pending attachments
        const attachments = this.pendingAttachments();
        
        // Enviar el mensaje con el modelo verificado y attachments
        await this.chatService.sendMessage({
          message: content,
          conversationId,
          model: modelToUse,
          attachments: attachments.length > 0 ? attachments : undefined
        });

        // Clear pending attachments after sending
        this.pendingAttachments.set([]);
      }
    } catch (error) {
      console.error('[ChatInterface] Error al enviar mensaje:', error);
    }
  }  onFileAttached(file: File): void {
    // TODO: Implement file attachment handling
    console.log('File attached:', file);
    // This could upload the file and add its content to the next message
  }

  onAttachmentAdded(attachment: ChatAttachment): void {
    console.log('Image attachment added:', attachment);
    // Store the attachment temporarily until message is sent
    this.pendingAttachments.update(attachments => [...attachments, attachment]);
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
  }  onModelChanged(modelId: string): void {
    console.log('[ChatInterface] 📝 Usuario cambió modelo a:', modelId);
    
    // Validar que el modelo existe y está disponible
    const model = this.availableModels().find(m => m.id === modelId);
    
    if (model) {
      if (model.isAvailable) {
        this.selectedModel.set(modelId);
        console.log('[ChatInterface] ✅ Modelo seleccionado válido y disponible:', model.name, '(', model.id, ')');
      } else {
        console.warn('[ChatInterface] ⚠️ Modelo seleccionado no disponible:', model.name);
        // Intentar seleccionar otro modelo disponible
        const defaultModel = this.chatService.getDefaultModel();
        
        if (defaultModel && defaultModel.isAvailable) {
          this.selectedModel.set(defaultModel.id);
          console.log('[ChatInterface] 🔁 Cambiando a modelo por defecto disponible:', defaultModel.name);
        } else {
          // Buscar cualquier modelo disponible
          const anyAvailableModel = this.availableModels().find(m => m.isAvailable);
          if (anyAvailableModel) {
            this.selectedModel.set(anyAvailableModel.id);
            console.log('[ChatInterface] 🔁 Cambiando a modelo disponible:', anyAvailableModel.name);
          }
        }
      }
    } else {
      console.error('[ChatInterface] ❌ Modelo no encontrado:', modelId);
      
      // Intentar seleccionar el modelo predeterminado como fallback
      const defaultModelId = this.chatService.getDefaultModelId();
      console.log('[ChatInterface] 🔍 Buscando modelo predeterminado:', defaultModelId);
      
      if (defaultModelId) {
        this.selectedModel.set(defaultModelId);
        console.log('[ChatInterface] 🔄 Usando modelo predeterminado como fallback:', defaultModelId);
      }
    }
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
