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
  ChatRequest, 
  ChatResponse, 
  StreamChunk, 
  ChatError,
  AIModel 
} from '../../shared/models/chat.models';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  
  // Inject Supabase service
  private readonly supabaseService = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  
  // Reactive state with signals (Angular 20+)
  private readonly _conversations = signal<Conversation[]>([]);
  private readonly _currentConversation = signal<Conversation | null>(null);
  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _isProcessing = signal<boolean>(false);
  private readonly _availableModels = signal<AIModel[]>([]);
  
  // Subjects for streaming
  private readonly streamSubject = new Subject<StreamChunk>();
  
  // Public readonly signals
  readonly conversations = this._conversations.asReadonly();
  readonly currentConversation = this._currentConversation.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly availableModels = this._availableModels.asReadonly();
  
  // Stream observable
  readonly messageStream$ = this.streamSubject.asObservable();

  constructor() {
    this.loadAvailableModels();
    this.loadConversations();
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
  }
  /**
   * Handles streaming chat response via Ollama API
   */
  private async streamChatResponse(request: ChatRequest, messageId: string): Promise<void> {
    try {
      // Build conversation history for Ollama
      const messages = this._messages()
        .filter(m => m.conversationId === request.conversationId && !m.isStreaming)
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }));

      // Add the current user message
      messages.push({
        role: 'user',
        content: request.message
      });      const ollamaRequest = {
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
      const updatedMessages = [...currentMessages];
      updatedMessages[messageIndex] = {
        ...message,
        isStreaming: false
      };
      
      this._messages.set(updatedMessages);

      // Save the completed message to database
      try {
        await this.supabaseService.createMessage(
          message.conversationId,
          message.content,
          message.role,
          message.metadata
        );
      } catch (error) {
        console.error('Failed to save completed message to database:', error);
      }
    }
  }  /**
   * Creates a new conversation
   */
  async createConversation(title?: string, firstMessage?: string): Promise<Conversation> {
    try {
      // Asegura que el perfil existe antes de crear la conversación
      await this.authService.ensureUserProfile();
      const conversationTitle = title || this.generateConversationTitle(firstMessage) || 'New Conversation';
      console.log('[ChatService] Creando conversación:', conversationTitle);
      const conversation = await this.supabaseService.createConversation(
        conversationTitle,
        'deepseek-r1:7b'
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
    try {
      // Get models from Supabase database
      const dbModels = await this.supabaseService.getAIModels();
      
      // Try to get live models from Ollama to update availability
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
          const data = await response.json();
          const ollamaModelNames = data.models.map((model: any) => model.name);
          
          // Update availability based on what's actually running in Ollama
          const updatedModels = dbModels.map(model => ({
            ...model,
            isAvailable: model.provider === 'local' ? 
              ollamaModelNames.includes(model.id) : 
              model.isAvailable
          }));
          
          this._availableModels.set(updatedModels);
          return;
        }
      } catch (ollamaError) {
        console.warn('Could not connect to Ollama, using database models only:', ollamaError);
      }

      // Use database models as-is if Ollama is not available
      this._availableModels.set(dbModels);
      
    } catch (error) {
      console.error('Failed to load models from database:', error);
      
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
}
