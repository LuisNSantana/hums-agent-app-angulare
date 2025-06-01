/**
 * Chat Service - Core business logic for AI interactions
 * Following Clean Architecture and SOLID principles
 */

import { Injectable, signal, inject } from '@angular/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { 
  ChatMessage, 
  Conversation, 
  ConversationSettings,
  ChatRequest, 
  ChatResponse, 
  StreamChunk, 
  ChatError,
  AIModel 
} from '../../shared/models/chat.models';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { AuthStateService } from './auth'; // Import AuthStateService
import { SystemPromptsService } from './prompts/system-prompts.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
    // Inject Supabase service
  private readonly supabaseService = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  private readonly authStateService = inject(AuthStateService); // Inject AuthStateService
  private readonly systemPromptsService = inject(SystemPromptsService);
  
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
  }
  /**
   * Sends a message and handles streaming response
   */  async sendMessage(request: ChatRequest): Promise<void> {
    try {
      this._isProcessing.set(true);
      console.log('[ChatService] Enviando mensaje:', request);
      console.log('[ChatService] Model recibido:', request.model);
      console.log('[ChatService] Tipo del model:', typeof request.model);
      
      // Add user message immediately
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: request.message,
        role: 'user',
        timestamp: new Date(),
        conversationId: request.conversationId
      };
      
      await this.addMessage(userMessage);
      
      // Create assistant message placeholder
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        conversationId: request.conversationId,
        isStreaming: true
      };
      
      // Add placeholder to UI first (don't save to DB yet since it's empty)
      const currentMessages = this._messages();
      this._messages.set([...currentMessages, assistantMessage]);
      
      // Start streaming
      await this.streamChatResponse(request, assistantMessage.id);
      
    } catch (error) {
      this.handleError(error as Error);
    } finally {
      this._isProcessing.set(false);
    }
  }  /**
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
  }

  /**
   * Handles streaming chat response via Ollama API
   */
  private async streamChatResponse(request: ChatRequest, messageId: string): Promise<void> {
    try {      // Get current conversation for settings
      const currentConversation = this._currentConversation();
      
      // Build conversation history for Ollama
      const messages: Array<{role: string, content: string}> = [];
      
      // Add system prompt as the first message
      messages.push({
        role: 'system',
        content: this.getSystemPrompt(currentConversation?.settings)
      });

      // Add conversation history
      const conversationMessages = this._messages()
        .filter(m => m.conversationId === request.conversationId && !m.isStreaming)
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }));
      
      messages.push(...conversationMessages);

      // Add the current user message
      messages.push({
        role: 'user',
        content: request.message
      });const ollamaRequest = {
        model: request.model || 'deepseek-r1:7b',
        messages: messages,
        stream: true,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 2048
        }
      };

      console.log('[ChatService] Enviando a Ollama:', ollamaRequest);
      console.log('[ChatService] Modelo final:', ollamaRequest.model);

      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ollamaRequest)
      });

      if (!response.ok) {
        throw new ChatError('Failed to get response from Ollama', 'STREAM_ERROR', response.status);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new ChatError('No response stream available', 'NO_STREAM');
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            
            if (parsed.message && parsed.message.content) {
              const deltaContent = parsed.message.content;
              accumulatedContent += deltaContent;
              
              // Update the message with accumulated content
              this.updateStreamingMessage(messageId, accumulatedContent);
              
              // Emit stream chunk
              const streamChunk: StreamChunk = {
                delta: deltaContent,
                finish_reason: parsed.done ? 'stop' : null
              };
              this.streamSubject.next(streamChunk);
            }

            if (parsed.done) {
              break;
            }
          } catch (parseError) {
            console.warn('Failed to parse Ollama chunk:', line);
          }
        }      }

      // Mark message as completed
      await this.finalizeStreamingMessage(messageId);

    } catch (error) {
      this.handleStreamError(error as Error, messageId);
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
   * Loads available AI models from Supabase and Ollama
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
      
      // Try to get live models from Ollama to update availability
      console.log('[ChatService] 🚀 Checking Ollama availability...');
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
          const data = await response.json();
          const ollamaModelNames = data.models.map((model: any) => model.name);
          console.log('[ChatService] 🚀 Ollama models available:', ollamaModelNames);
          
          // Update availability based on what's actually running in Ollama
          const updatedModels = dbModels.map(model => ({
            ...model,
            isAvailable: model.provider === 'local' ? 
              ollamaModelNames.includes(model.id) : 
              model.isAvailable
          }));
          
          console.log('[ChatService] ✅ Models updated with Ollama availability:');
          updatedModels.forEach(model => {
            console.log(`  - ${model.name} (${model.id}) - Available: ${model.isAvailable} - Default: ${model.configuration?.['is_default'] || false}`);
          });
          
          this._availableModels.set(updatedModels);
          this.setDefaultModel(updatedModels);
          console.log('[ChatService] ✅ Models loaded successfully with Ollama sync');
          return;
        }
      } catch (ollamaError) {
        console.warn('[ChatService] ⚠️ Could not connect to Ollama, using database models only:', ollamaError);
      }
      
      // Use database models as-is if Ollama is not available
      console.log('[ChatService] 📊 Using database models without Ollama sync');
      this._availableModels.set(dbModels);
      this.setDefaultModel(dbModels);
      
    } catch (error) {
      console.error('[ChatService] ❌ Failed to load models from database:', error);
      
      // Fallback to hardcoded models
      const fallbackModels: AIModel[] = [
        {
          id: 'deepseek-r1:7b',
          name: 'DeepSeek R1 7B',
          provider: 'local',
          description: 'DeepSeek R1 model running locally via Ollama',
          contextWindow: 32768,
          isAvailable: false
        }
      ];
      console.log('[ChatService] 🔄 Using fallback models:', fallbackModels);
      this._availableModels.set(fallbackModels);
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
}
