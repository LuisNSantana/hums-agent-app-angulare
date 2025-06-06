/**
 * Chat Service - Core business logic for AI interactions
 * Following Clean Architecture and SOLID principles
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Observable, BehaviorSubject, Subject } from 'rxjs';

import { 
  ChatMessage, 
  ChatRequest, 
  ConversationSettings,
  Conversation,
  StreamChunk, 
  AIModel,
  ChatError 
} from '../../shared/models/chat.models';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { AuthStateService } from './auth'; // Import AuthStateService
import { SystemPromptsService } from './prompts/system-prompts.service';
import { IntegrationsService } from './integrations.service'; // Import IntegrationsService

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  // 🌐 API Configuration for Claude Server
  private readonly API_BASE_URL = 'http://localhost:3001';
  
  // Inject services
  private readonly http = inject(HttpClient);
  private readonly supabaseService = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  private readonly authStateService = inject(AuthStateService);
  private readonly systemPromptsService = inject(SystemPromptsService);
  private readonly integrationsService = inject(IntegrationsService);
  
  // Reactive state with signals (Angular 20+)
  private readonly _conversations = signal<Conversation[]>([]);
  private readonly _currentConversation = signal<Conversation | null>(null);
  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _isProcessing = signal<boolean>(false);
  private readonly _availableModels = signal<AIModel[]>([]);
  private readonly _defaultModel = signal<AIModel | null>(null);
  
  // Subjects for streaming
  private readonly streamSubject = new Subject<StreamChunk>();
  
  // Public readonly signals
  readonly conversations = this._conversations.asReadonly();
  readonly currentConversation = this._currentConversation.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly availableModels = this._availableModels.asReadonly();
  readonly defaultModel = this._defaultModel.asReadonly();
  
  // Stream observable
  readonly messageStream$ = this.streamSubject.asObservable();
  constructor() {
    // Inicializar estados
    console.log('[ChatService] 🚀 Inicializando servicio de chat');
    
    // Cargar modelos y conversaciones
    this.initializeService();
  }
  
  /**
   * Inicializa el servicio cargando datos necesarios
   */
  private async initializeService(): Promise<void> {
    try {
      console.log('[ChatService] 🔄 Inicializando datos del servicio');
      
      // Primero cargar modelos para tenerlos disponibles antes de cargar conversaciones
      await this.loadAvailableModels();
      
      // Luego cargar conversaciones (que pueden depender de modelos)
      await this.loadConversations();
      
      console.log('[ChatService] ✅ Servicio inicializado correctamente');
    } catch (error) {
      console.error('[ChatService] ❌ Error al inicializar el servicio:', error);
    }
  }  /**
   * Sends a message and handles streaming response
   */  
  async sendMessage(request: ChatRequest): Promise<void> {
    try {
      this._isProcessing.set(true);
      console.log('[ChatService] Enviando mensaje:', request);
      console.log('[ChatService] Model recibido:', request.model);
      console.log('[ChatService] Tipo del model:', typeof request.model);
      
      // Add user message immediately (including attachments in metadata)
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: request.message,
        role: 'user',
        timestamp: new Date(),
        conversationId: request.conversationId,
        metadata: request.attachments && request.attachments.length > 0 ? {
          attachments: request.attachments
        } : undefined
      };
      
      await this.addMessage(userMessage);
      
      // NO crear mensaje del asistente aquí - será creado después de las herramientas
      // Start streaming directly - the assistant message will be created internally
      await this.streamChatResponse(request);
      
    } catch (error) {
      this.handleError(error as Error);
    } finally {
      this._isProcessing.set(false);
    }
  }/**
   * Get the system prompt for the AI agent
   * Uses custom prompt from conversation settings or falls back to active system prompt
   */
  private getSystemPrompt(conversationSettings?: ConversationSettings): string {
    // Return custom system prompt if provided
    if (conversationSettings?.systemPrompt) {
      return conversationSettings.systemPrompt;
    }

    // Get user profile to extract name
    const authUser = this.authStateService.getCurrentUser(); 
    let userName: string | undefined = undefined;
    if (authUser) {
      userName = authUser.displayName || authUser.email?.split('@')[0];
    }

    // Use the active system prompt from SystemPromptsService, passing the user's name
    return this.systemPromptsService.generateSystemPrompt({ userName: userName });
  }  /**
   * Handles chat response via Claude 3.5 Sonnet server
   */
  private async streamChatResponse(request: ChatRequest): Promise<void> {
    let assistantMessageId: string | null = null;
    
    try {
      console.log('[ChatService] 📡 Iniciando streaming de respuesta para conversación:', request.conversationId);
      
      // Get current conversation for settings
      const currentConversation = this._currentConversation();
      console.log('[ChatService] 📓 Usando conversación actual:', currentConversation?.id);
      
      // Build conversation history for Claude - importante para el contexto
      const allMessages = this._messages();
      const messagesForConversation = allMessages.filter(m => m.conversationId === request.conversationId && !m.isStreaming);
      
      console.log('[ChatService] 💬 Total mensajes:', allMessages.length, 
        'Mensajes relevantes para la conversación:', messagesForConversation.length);
      
      // Convertir los mensajes al formato esperado por Claude (roles user/assistant y contenido)
      const conversationHistory = messagesForConversation.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));
      
      console.log('[ChatService] 📋 Historia de conversación preparada con', 
        conversationHistory.length, 'mensajes');

      // Prepare documents for analysis if any PDF attachments are present
      let documentsForAnalysis: any[] = [];
      if (request.attachments && request.attachments.length > 0) {
        documentsForAnalysis = request.attachments
          .filter(attachment => attachment.type === 'document' && 
                              attachment.mimeType === 'application/pdf' && 
                              attachment.base64)
          .map(attachment => ({
            file: attachment.base64,
            fileName: attachment.name,
            mimeType: attachment.mimeType,
            analysisType: 'analyze', // Default to comprehensive analysis
            maxLength: 10000,
            includeMetadata: true
          }));
      }

      // Obtener los tokens de integración necesarios (Google Calendar y Google Drive)
      console.log('[ChatService] 🔍 Obteniendo tokens de integración...');
      let calendarToken: string | null = null;
      let driveToken: string | null = null;
      
      try {
        // Verificar usuario autenticado antes de obtener tokens
        const authUser = this.authStateService.getCurrentUser();
        console.log('[ChatService] 👤 Usuario autenticado para tokens:', authUser?.id ?? 'ninguno');
        
        if (!authUser) {
          console.warn('[ChatService] ⚠️ No hay usuario autenticado para obtener tokens');
        } else {
          // Obtener token de Google Calendar
          calendarToken = await firstValueFrom(this.integrationsService.getGoogleCalendarToken());
          console.log('[ChatService] 🔑 Token de Google Calendar obtenido:', 
            calendarToken ? '✅ Token disponible' : '❌ Token no disponible');
          
          // Obtener token de Google Drive
          driveToken = await firstValueFrom(this.integrationsService.getGoogleDriveToken());
          console.log('[ChatService] 🔑 Token de Google Drive obtenido:', 
            driveToken ? '✅ Token disponible' : '❌ Token no disponible');
          
          // Si el mensaje contiene palabras clave relacionadas con Google Drive,
          // priorizar el token de Drive sobre el de Calendar
          const isDriveRelatedMessage = request.message.toLowerCase().includes('drive') || 
                                        request.message.toLowerCase().includes('archivo') || 
                                        request.message.toLowerCase().includes('file') || 
                                        request.message.toLowerCase().includes('folder');
          
          if (isDriveRelatedMessage && driveToken) {
            console.log('[ChatService] 🔄 Mensaje relacionado con Drive detectado, priorizando token de Drive');
            // Usaremos el token de Drive como token principal
          }
        }
      } catch (error) {
        console.warn('[ChatService] ⚠️ Error al obtener tokens de integración:', error);
        // Continuar sin tokens, el servidor manejará la ausencia
      }
      
      // Determinar qué token usar como principal (priorizar Drive si el mensaje es sobre archivos)
      const accessToken = driveToken || calendarToken;

      // Preparar el payload para enviar al servidor
      const claudeRequest = {
        message: request.message,
        conversationHistory: conversationHistory.length > 0 ? conversationHistory : [],
        documents: documentsForAnalysis.length > 0 ? documentsForAnalysis : undefined,
        accessToken: accessToken || null // Forzar un valor explícito (null en lugar de undefined)
      };
      
      // Verificación CRÍTICA - asegurarse de que el token esté presente si está disponible
      if (accessToken && claudeRequest.accessToken !== accessToken) {
        console.error('[ChatService] 🚨 ERROR CRÍTICO: El token no se asignó correctamente al payload');
        claudeRequest.accessToken = accessToken; // Forzar asignación
      }

      // Log DETALLADO del payload final ANTES de enviar
      console.log('[ChatService] FINAL PAYLOAD PREPARATION - claudeRequest:', 
        JSON.stringify(claudeRequest, (key, value) => 
          key === 'file' && typeof value === 'string' && value.length > 100 ? value.substring(0,100) + '...[TRUNCATED]' : value, 
        2)
      );
      console.log(`[ChatService] FINAL PAYLOAD accessToken value type: ${typeof accessToken}, value: ${accessToken ? 'present' : 'null/undefined'}`);
 
      // Call Claude server FIRST to get tools information
      console.log('[ChatService] 🚀 Enviando solicitud a Claude Server...');
      
      // Prevenir posibles problemas con la serialización
      const requestPayload = {
        message: claudeRequest.message,
        conversationHistory: claudeRequest.conversationHistory,
        documents: claudeRequest.documents,
        accessToken: accessToken // Asignar directamente el token aquí
      };
      
      console.log('[ChatService] 📣 SENDING FINAL PAYLOAD:', JSON.stringify({
        message: requestPayload.message.substring(0, 20) + '...',
        historyLength: requestPayload.conversationHistory.length,
        accessTokenPresent: !!requestPayload.accessToken,
        accessTokenType: typeof requestPayload.accessToken
      }));
      
      const response = await fetch('http://localhost:3001/chatFlow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new ChatError('Failed to get response from Claude Server', 'STREAM_ERROR', response.status);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new ChatError(result.error, 'CLAUDE_ERROR');
      }

      const fullResponse = result.response || '';
      const toolsUsed = Array.isArray(result.toolsUsed) ? result.toolsUsed : [];      // FIRST: Show tool execution messages if any tools were used
      if (toolsUsed.length > 0) {
        console.log('[ChatService] Herramientas detectadas:', toolsUsed);
        
        for (const tool of toolsUsed) {
          // Crear mensaje de herramienta pendiente
          const toolMsgId = this.addToolSystemMessage(request.conversationId, tool, 'pending');
          
          // Simular tiempo de ejecución de la herramienta
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Marcar como exitosa y remover el mensaje (no duplicar)
          this.removeToolSystemMessage(toolMsgId);
          
          // Pequeño delay antes de la siguiente herramienta
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Delay adicional antes de mostrar la respuesta del asistente
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // SECOND: Create assistant message AFTER tools have been shown
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        conversationId: request.conversationId,
        isStreaming: true
      };
      
      // Add assistant message to UI
      const currentMessages = this._messages();
      this._messages.set([...currentMessages, assistantMessage]);
      assistantMessageId = assistantMessage.id;

      // THIRD: Stream the assistant response with typing effect
      const words = fullResponse.split(' ');
      let accumulatedContent = '';

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        accumulatedContent += (i > 0 ? ' ' : '') + word;
        
        const streamChunk: StreamChunk = {
          delta: (i > 0 ? ' ' : '') + word,
          finish_reason: i === words.length - 1 ? 'stop' : null
        };
        
        this.updateStreamingMessage(assistantMessageId, accumulatedContent);
        this.streamSubject.next(streamChunk);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Al finalizar, guardar toolsUsed en el metadata
      this.addToolsUsedToMessage(assistantMessageId, toolsUsed);
      await this.finalizeStreamingMessage(assistantMessageId);

    } catch (error) {
      // Si hay error en el mensaje del asistente, manejarlo
      if (assistantMessageId) {
        this.handleStreamError(error as Error, assistantMessageId);
      } else {
        // Si no se creó mensaje del asistente, crear uno con error
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          content: 'Sorry, I encountered an error while processing your request.',
          role: 'assistant',
          timestamp: new Date(),
          conversationId: request.conversationId,
          isError: true
        };
        
        const currentMessages = this._messages();
        this._messages.set([...currentMessages, errorMessage]);
        this.handleError(error as Error);
      }
    }
  }
  /**
   * Updates streaming message content
   */
  private updateStreamingMessage(messageId: string, content: string): void {
    const currentMessages = this._messages();
    const messageIndex = currentMessages.findIndex(m => m.id === messageId);
    
    if (messageIndex >= 0) {
      const updatedMessages = [...currentMessages];
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        content: content
      };
      
      this._messages.set(updatedMessages);
    }
  }

  /**
   * Processes individual stream chunks
   */
  private processStreamChunk(chunk: StreamChunk, messageId: string): void {
    const currentMessages = this._messages();
    const messageIndex = currentMessages.findIndex(m => m.id === messageId);
    
    if (messageIndex >= 0) {
      const updatedMessages = [...currentMessages];
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        content: updatedMessages[messageIndex].content + chunk.delta
      };
      
      this._messages.set(updatedMessages);
      this.streamSubject.next(chunk);
    }
  }
  /**
   * Finalizes streaming message and saves to database
   */
  private async finalizeStreamingMessage(messageId: string): Promise<void> {
    const currentMessages = this._messages();
    const messageIndex = currentMessages.findIndex(m => m.id === messageId);
    
    if (messageIndex >= 0) {
      const message = currentMessages[messageIndex];
      let finalContent = message.content;
      let thoughts: string | undefined = undefined;

      // Regular expression to find <think>...</think> tags and capture thoughts and the rest of the content
      // This regex handles multi-line content within <think> tags
      const thinkTagRegex = /<think>([\s\S]*?)<\/think>([\s\S]*)/;
      const match = finalContent.match(thinkTagRegex);

      if (match && match[1]) {
        thoughts = match[1].trim();
        finalContent = match[2] ? match[2].trim() : ''; // Content after </think> or empty if nothing follows
      } else {
        // If no <think> tags, the whole content is the message, and thoughts remain undefined
        // This case is already handled by finalContent being initialized with message.content
      }

      const updatedMessages = [...currentMessages];
      updatedMessages[messageIndex] = {
        ...message,
        content: finalContent, // Use the parsed content (without thoughts block)
        isStreaming: false,
        metadata: {
          ...message.metadata, // Preserve existing metadata
          thoughts: thoughts,   // Add or overwrite thoughts
        },
      };
      
      this._messages.set(updatedMessages);

      // Save the completed message to database
      try {
        await this.supabaseService.createMessage(
          message.conversationId,
          finalContent, // Save parsed content (without thoughts block)
          message.role,
          updatedMessages[messageIndex].metadata // Save updated metadata with thoughts
        );
      } catch (error) {
        console.error('Failed to save completed message to database:', error);
      }
    }
  }  /**
   * Updates the system prompt for a conversation
   */
  async updateSystemPrompt(conversationId: string, systemPrompt: string): Promise<void> {
    try {
      const conversation = this._currentConversation();
      if (!conversation || conversation.id !== conversationId) {
        throw new ChatError('Conversation not found', 'NOT_FOUND');
      }

      const updatedSettings: ConversationSettings = {
        ...conversation.settings,
        systemPrompt: systemPrompt
      };

      const updatedConversation = {
        ...conversation,
        settings: updatedSettings
      };

      // Update in database - convert to JSON-compatible format
      await this.supabaseService.updateConversation(conversationId, {
        settings: JSON.parse(JSON.stringify(updatedSettings))
      });

      // Update local state
      this._currentConversation.set(updatedConversation);

      // Update conversations list
      const conversations = this._conversations();
      const conversationIndex = conversations.findIndex(c => c.id === conversationId);
      if (conversationIndex >= 0) {
        const updatedConversations = [...conversations];
        updatedConversations[conversationIndex] = updatedConversation;
        this._conversations.set(updatedConversations);
      }

    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Gets the current system prompt for a conversation
   */
  getConversationSystemPrompt(conversationId?: string): string {
    const conversation = conversationId 
      ? this._conversations().find(c => c.id === conversationId)
      : this._currentConversation();
    
    return this.getSystemPrompt(conversation?.settings);
  }
  /**
   * Gets the default system prompt
   */
  getDefaultSystemPrompt(): string {
    return this.systemPromptsService.getDefaultPrompt().template;
  }

  // System Prompts Management Methods
  
  /**
   * Get all available prompt templates
   */
  getAvailablePrompts() {
    return this.systemPromptsService.getPromptTemplates();
  }

  /**
   * Get the currently active prompt
   */
  getActivePrompt() {
    return this.systemPromptsService.getActivePrompt();
  }

  /**
   * Set the active prompt template
   */
  setActivePrompt(promptId: string): void {
    this.systemPromptsService.setActivePrompt(promptId);
  }

  /**
   * Get prompts by category
   */
  getPromptsByCategory(category: string) {
    return this.systemPromptsService.getPromptsByCategory(category as any);
  }

  /**
   * Get available prompt categories
   */
  getPromptCategories() {
    return this.systemPromptsService.getAvailableCategories();
  }
  /**
   * Creates a new conversation
   */
  async createConversation(title?: string, firstMessage?: string): Promise<Conversation> {
    try {
      // Asegura que el perfil existe antes de crear la conversación
      await this.authService.ensureUserProfile();
      const conversationTitle = title || this.generateConversationTitle(firstMessage) || 'New Conversation';
      console.log('[ChatService] Creando conversación:', conversationTitle);
      
      // Usar el modelo por defecto en lugar de hardcodear
      const defaultModelId = this.getDefaultModelId();
      console.log('[ChatService] Usando modelo por defecto para conversación:', defaultModelId);
      
      const conversation = await this.supabaseService.createConversation(
        conversationTitle,
        defaultModelId
      );
      console.log('[ChatService] Conversación creada en BD:', conversation);
      const conversations = [...this._conversations(), conversation];
      this._conversations.set(conversations);
      this._currentConversation.set(conversation);
      this._messages.set([]);

      return conversation;
    } catch (error) {
      console.error('[ChatService] Error al crear conversación:', error);
      throw error;
    }
  }
  /**
   * Loads a specific conversation
   */
  async loadConversation(conversationId: string): Promise<void> {
    try {
      const conversation = await this.supabaseService.getConversation(conversationId);
      if (!conversation) {
        throw new ChatError('Conversation not found', 'NOT_FOUND');
      }

      this._currentConversation.set(conversation);
      
      // Load messages for this conversation
      const messages = await this.supabaseService.getMessages(conversationId);
      this._messages.set(messages);

    } catch (error) {
      this.handleError(error as Error);
    }
  }
  /**
   * Deletes a conversation (soft delete)
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await this.supabaseService.deleteConversation(conversationId);
      
      const conversations = this._conversations().filter(c => c.id !== conversationId);
      this._conversations.set(conversations);

      if (this._currentConversation()?.id === conversationId) {
        this._currentConversation.set(null);
        this._messages.set([]);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  }
  /**
   * Adds a message to current conversation and saves to database
   */
  private async addMessage(message: ChatMessage): Promise<void> {
    // Add to local state immediately for UI responsiveness
    const currentMessages = this._messages();
    this._messages.set([...currentMessages, message]);

    // Save to database
    try {
      await this.supabaseService.createMessage(
        message.conversationId,
        message.content,
        message.role,
        message.metadata
      );
    } catch (error) {
      console.error('Failed to save message to database:', error);
      // Could implement retry logic or show error to user
    }
  }  /**
   * Loads available AI models - Now using Claude 3.5 Sonnet
   */
  private async loadAvailableModels(): Promise<void> {
    console.log('[ChatService] 🔄 Loading available models...');
    
    try {
      // Get models from Supabase database
      console.log('[ChatService] 📊 Fetching models from database...');
      const dbModels = await this.supabaseService.getAIModels();
      console.log('[ChatService] 📊 Database models loaded:', dbModels.length);
      dbModels.forEach(model => {
        console.log(`  - ${model.name} (${model.id}) [${model.provider}] - Available: ${model.isAvailable} - Default: ${model.configuration?.['is_default'] || false}`);
      });

      // Check Claude server availability
      console.log('[ChatService] 🤖 Checking Claude Server availability...');
      try {
        const response = await fetch('http://localhost:3001/health');
        if (response.ok) {
          const data = await response.json();
          console.log('[ChatService] 🤖 Claude Server is available:', data);
          
          // Create Claude model if not in database
          let claudeModels = dbModels.filter(model => model.provider === 'anthropic');
          
          if (claudeModels.length === 0) {
            console.log('[ChatService] 🔄 Adding Claude model to available models');
            claudeModels = [{
              id: 'claude-3-5-sonnet-20241022',
              name: 'Claude 3.5 Sonnet',
              provider: 'anthropic',
              description: 'Advanced reasoning with web search capabilities',
              contextWindow: 200000,
              isAvailable: true,
              configuration: { is_default: true }
            }];
          }
          
          // Update availability for Claude models
          const updatedModels = [
            ...dbModels.filter(model => model.provider !== 'anthropic'),
            ...claudeModels.map(model => ({ ...model, isAvailable: true }))
          ];
          
          console.log('[ChatService] ✅ Models updated with Claude availability:');
          updatedModels.forEach(model => {
            console.log(`  - ${model.name} (${model.id}) - Available: ${model.isAvailable} - Default: ${model.configuration?.['is_default'] || false}`);
          });
          
          this._availableModels.set(updatedModels);
          this.setDefaultModel(updatedModels);
          console.log('[ChatService] ✅ Models loaded successfully with Claude server');
          return;
        }
      } catch (claudeError) {
        console.warn('[ChatService] ⚠️ Could not connect to Claude server, using database models only:', claudeError);
      }
      
      // Use database models as-is if Claude server is not available
      console.log('[ChatService] 📊 Using database models without Claude server sync');
      this._availableModels.set(dbModels);
      this.setDefaultModel(dbModels);
      
    } catch (error) {
      console.error('[ChatService] ❌ Failed to load models from database:', error);
      
      // Fallback to Claude model
      const fallbackModels: AIModel[] = [
        {
          id: 'claude-3-5-sonnet-20241022',
          name: 'Claude 3.5 Sonnet',
          provider: 'anthropic',
          description: 'Advanced reasoning with web search capabilities',
          contextWindow: 200000,
          isAvailable: false,
          configuration: { is_default: true }
        }
      ];
      console.log('[ChatService] 🔄 Using fallback Claude model:', fallbackModels);
      this._availableModels.set(fallbackModels);
      this.setDefaultModel(fallbackModels);
    }
  }
  /**
   * Loads conversations from Supabase
   */
  private async loadConversations(): Promise<void> {
    try {
      const conversations = await this.supabaseService.getConversations();
      this._conversations.set(conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }
  /**
   * Gets messages for a specific conversation from Supabase
   */
  private async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    try {
      return await this.supabaseService.getMessages(conversationId);
    } catch (error) {
      console.error('Failed to load messages:', error);
      return [];
    }
  }

  /**
   * Handles streaming errors
   */
  private handleStreamError(error: Error, messageId: string): void {
    const currentMessages = this._messages();
    const messageIndex = currentMessages.findIndex(m => m.id === messageId);
    
    if (messageIndex >= 0) {
      const updatedMessages = [...currentMessages];
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        content: 'Sorry, I encountered an error while processing your request.',
        isStreaming: false,
        isError: true
      };
      
      this._messages.set(updatedMessages);
    }

    this.handleError(error);
  }  /**
   * Central error handling
   */
  private handleError(error: Error): void {    
    console.error('Chat service error:', error);
    
    if (error instanceof ChatError) {
      // Handle specific chat errors
      console.error(`Chat Error [${(error as ChatError).code}]:`, error.message);
    } else {
      // Handle general errors
      console.error('Unexpected error:', error);
    }
  }

  /**
   * Generate a smart conversation title from the first message
   */
  private generateConversationTitle(firstMessage?: string): string | null {
    if (!firstMessage) return null;
    
    // Clean the message and truncate if too long
    const cleaned = firstMessage.trim().replace(/\n+/g, ' ');
    
    // If message is short enough, use it as title
    if (cleaned.length <= 50) {
      return cleaned;
    }
    
    // Try to find a natural break point
    const words = cleaned.split(' ');
    let title = '';
    
    for (const word of words) {
      if ((title + word).length > 50) break;
      title += (title ? ' ' : '') + word;
    }
    
    // Add ellipsis if truncated
    return title + (title.length < cleaned.length ? '...' : '');
  }

  /**
   * Gets the default AI model from database configuration
   */
  getDefaultModel(): AIModel | null {
    return this._defaultModel();
  }
  /**
   * Gets the default model ID for use in chat requests
   */
  getDefaultModelId(): string {
    const defaultModel = this._defaultModel();
    
    if (defaultModel) {
      console.log('[ChatService] 📌 Usando modelo predeterminado:', defaultModel.name, `(${defaultModel.id})`);
      return defaultModel.id;
    }
    
    // Si no hay modelo predeterminado configurado, usar Gemma 3:4b como fallback
    console.log('[ChatService] ⚠️ No hay modelo predeterminado configurado, usando Gemma 3:4b como fallback');
    
    // Verificar si Gemma 3:4b existe en la lista de modelos
    const models = this._availableModels();
    const gemmaModel = models.find(m => m.id === 'gemma3:4b');
    
    if (gemmaModel) {
      console.log('[ChatService] ✅ Modelo Gemma 3:4b encontrado y disponible');
    } else {
      console.log('[ChatService] ⚠️ Modelo Gemma 3:4b no encontrado en la lista de modelos disponibles');
    }
    
    return 'gemma3:4b'; // Fallback to Gemma 3:4b
  }  /**
   * Sets the default model based on database configuration
   */  private setDefaultModel(models: AIModel[]): void {
    console.log('[ChatService] 🔍 Seleccionando modelo predeterminado...');
    
    // SIEMPRE crear un modelo Gemma 3:4b virtual si no existe en la lista
    let gemmaModel = models.find(m => m.id === 'gemma3:4b');
    
    if (!gemmaModel && models.length > 0) {
      // Si no existe el modelo Gemma pero hay otros modelos, crea una versión virtual
      console.log('[ChatService] ⚠️ Modelo Gemma 3:4b no encontrado, creando versión virtual');
      gemmaModel = {
        id: 'gemma3:4b',
        name: 'Gemma 3:4b',
        provider: 'local',
        description: 'Gemma 3:4b model running locally via Ollama',
        contextWindow: 32768,
        isAvailable: true,
        configuration: { 'is_default': true }
      };
      
      // Añadir el modelo Gemma al principio de la lista para que aparezca primero en el selector
      const updatedModels = [gemmaModel, ...models];
      this._availableModels.set(updatedModels);
      console.log('[ChatService] ✅ Modelo Gemma 3:4b añadido a la lista de modelos disponibles');
    }
    
    // Siempre establecer Gemma como modelo predeterminado si existe
    if (gemmaModel) {
      this._defaultModel.set(gemmaModel);
      console.log('[ChatService] ✅ Modelo Gemma 3:4b establecido como predeterminado:', gemmaModel.name, `(${gemmaModel.id})`);
      return;
    }
    
    // Fallback: si por alguna razón no se pudo encontrar o crear Gemma, usar configuración de DB
    const configuredDefault = models.find(model => 
      model.configuration && 
      typeof model.configuration === 'object' && 
      'is_default' in model.configuration && 
      model.configuration['is_default'] === true
    );
    
    if (configuredDefault) {
      this._defaultModel.set(configuredDefault);
      console.log('[ChatService] ⚠️ Usando modelo configurado en DB como predeterminado:', configuredDefault.name, `(${configuredDefault.id})`);
      return;
    }
    
    // Último recurso: usar cualquier modelo disponible
    const availableModel = models.find(m => m.isAvailable) || (models.length > 0 ? models[0] : null);
    
    if (availableModel) {
      this._defaultModel.set(availableModel);
      console.log('[ChatService] ⚠️ Usando modelo alternativo como predeterminado:', availableModel.name, `(${availableModel.id})`);
    } else {
      console.log('[ChatService] ❌ No hay modelos disponibles para establecer como predeterminado');
    }
  }

  /**
   * Agrega las herramientas usadas al metadata del mensaje
   */
  private addToolsUsedToMessage(messageId: string, toolsUsed: string[]): void {
    const currentMessages = this._messages();
    const messageIndex = currentMessages.findIndex(m => m.id === messageId);
    if (messageIndex >= 0) {
      const updatedMessages = [...currentMessages];
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        metadata: {
          ...updatedMessages[messageIndex].metadata,
          toolsUsed: toolsUsed
        }
      };
      this._messages.set(updatedMessages);
    }
  }

  /**
   * Inserta un mensaje de sistema para indicar la ejecución de una herramienta
   */
  private addToolSystemMessage(conversationId: string, tool: string, status: 'pending' | 'success' | 'error'): string {
    const id = crypto.randomUUID();
    const content = status === 'pending'
      ? `🔎 Ejecutando herramienta: ${this.toolBadgeLabel(tool ?? 'unknown')}...`
      : status === 'success'
        ? `✅ Herramienta ejecutada: ${this.toolBadgeLabel(tool ?? 'unknown')}`
        : `❌ Error al ejecutar herramienta: ${this.toolBadgeLabel(tool ?? 'unknown')}`;
    const msg: ChatMessage = {
      id,
      content,
      role: 'system',
      timestamp: new Date(),
      conversationId,
      metadata: { tool, toolStatus: status }
    };
    this._messages.set([...this._messages(), msg]);
    return id;
  }

  /**
   * Actualiza el mensaje de sistema de herramienta
   */
  private updateToolSystemMessage(messageId: string, status: 'success' | 'error') {
    const currentMessages = this._messages();
    const idx = currentMessages.findIndex(m => m.id === messageId);
    if (idx >= 0) {
      const tool = currentMessages[idx].metadata?.tool;
      const updatedMessages = [...currentMessages];
      updatedMessages[idx] = {
        ...updatedMessages[idx],
        content: status === 'success'
          ? `✅ Herramienta ejecutada: ${this.toolBadgeLabel(tool ?? 'unknown')}`
          : `❌ Error al ejecutar herramienta: ${this.toolBadgeLabel(tool ?? 'unknown')}`,
        metadata: { ...updatedMessages[idx].metadata, toolStatus: status }
      };
      this._messages.set(updatedMessages);
    }
  }  /**
   * Devuelve un label amigable para la herramienta usada
   */
  private toolBadgeLabel(tool: string): string {
    switch (tool) {
      case 'AI Agent':
        return 'Agente IA';
      case 'searchWeb':
      case 'braveSearch':
      case 'web_search':
        return 'Búsqueda Web';
      case 'analyzeWeb':
      case 'web_analyze':
        return 'Análisis Web';
      case 'googleCalendar':
      case 'google_calendar':
        return 'Google Calendar';
      case 'googleDrive':
      case 'google_drive':
        return 'Google Drive';
      case 'analyzeDocument':
      case 'document_analyzer':
        return 'Analizador de Documentos';
      case 'perplexity':
      case 'perplexitySearch':
        return 'Perplexity Search';
      case 'tavily':
      case 'tavilySearch':
        return 'Tavily Search';
      case 'fetch':
      case 'fetchUrl':
        return 'Obtener URL';
      case 'duckduckgo':
      case 'duckduckgoSearch':
        return 'DuckDuckGo Search';
      default:
        // Si no encontramos un mapeo específico, formatear el nombre
        return tool.charAt(0).toUpperCase() + tool.slice(1).replace(/([A-Z])/g, ' $1');
    }
  }

  /**
   * Remueve un mensaje de sistema de herramienta
   */
  private removeToolSystemMessage(messageId: string): void {
    const currentMessages = this._messages();
    const filteredMessages = currentMessages.filter(m => m.id !== messageId);
    this._messages.set(filteredMessages);
  }
}
