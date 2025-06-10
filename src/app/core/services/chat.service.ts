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
  ChatError,
  ChatMessageMetadata
} from '../../shared/models/chat.models';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { AuthStateService } from './auth';
import { SystemPromptsService } from './prompts/system-prompts.service';
import { IntegrationsService } from './integrations.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  // 🌐 API Configuration from environment
  private readonly CLAUDE_SERVER_URL = environment.claude.serverUrl; // Genkit server (3002)
  private readonly EXPRESS_SERVER_URL = environment.claude.expressUrl; // Express server (3001) 
  private readonly CHAT_ENDPOINT = environment.claude.endpoints.chat;
  private readonly HEALTH_ENDPOINT = environment.claude.endpoints.health;
  
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
    this.initializeService();
  }
  
  /**
   * Inicializa el servicio cargando datos necesarios
   */
  private async initializeService(): Promise<void> {
    try {
      await this.loadAvailableModels();
      await this.loadConversations();
    } catch (error) {
      console.error('[ChatService] ❌ Error al inicializar el servicio:', error);
    }
  }

  /**
   * Sends a message and handles streaming response
   */
  async sendMessage(request: ChatRequest): Promise<void> {
    try {
      this._isProcessing.set(true);
      
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
      await this.streamChatResponse(request);
      
    } catch (error) {
      this.handleError(error as Error);
    } finally {
      this._isProcessing.set(false);
    }
  }

  /**
   * Get the system prompt for the AI agent
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

    // Use the active system prompt from SystemPromptsService
    return this.systemPromptsService.generateSystemPrompt({ userName: userName });
  }

  /**
   * Handles chat response via Claude 3.5 Sonnet server
   */
  private async streamChatResponse(request: ChatRequest): Promise<void> {
    let assistantMessageId: string | null = null;
    
    try {
      // Get current conversation for settings
      const currentConversation = this._currentConversation();
      
      // Build conversation history for Claude
      const allMessages = this._messages();
      const messagesForConversation = allMessages.filter(m => m.conversationId === request.conversationId && !m.isStreaming);
      
      // Convert messages to Claude format
      const conversationHistory = messagesForConversation.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      // Prepare documents for analysis for all supported document types (PDF, TXT, etc)
      let documentsForAnalysis: any[] = [];
      if (request.attachments && request.attachments.length > 0) {
        documentsForAnalysis = request.attachments
          .filter(attachment => 
            attachment.type === 'document' && 
            attachment.base64 && 
            (
              // Incluir múltiples tipos MIME de documentos soportados
              attachment.mimeType === 'application/pdf' ||
              attachment.mimeType === 'text/plain' ||
              attachment.mimeType === 'application/msword' ||
              attachment.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
              attachment.mimeType === 'application/vnd.ms-excel' ||
              attachment.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
              attachment.mimeType === 'text/csv'
            )
          )
          .map(attachment => ({
            file: attachment.base64,
            fileName: attachment.name,
            mimeType: attachment.mimeType,
            analysisType: 'analyze',
            maxLength: 10000,
            includeMetadata: true
          }));
      }

      // Get integration tokens
      let calendarToken: string | null = null;
      let driveToken: string | null = null;
      
      try {
        const authUser = this.authStateService.getCurrentUser();
        
        if (authUser) {
          calendarToken = await firstValueFrom(this.integrationsService.getGoogleCalendarToken());
          driveToken = await firstValueFrom(this.integrationsService.getGoogleDriveToken());
        }
      } catch (error) {
        console.warn('[ChatService] ⚠️ Error al obtener tokens de integración:', error);
      }

      // Prepare request payload
      const requestPayload = {
        message: request.message,
        conversationId: request.conversationId || 'default',
        userId: this.authStateService.user()?.id,
        attachments: documentsForAnalysis.length > 0 ? documentsForAnalysis : undefined
      };

      // Set headers
      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
      };

      if (calendarToken) {
        headers['X-Calendar-Token'] = calendarToken;
      }
      
      if (driveToken) {
        headers['X-Drive-Token'] = driveToken;
      }

      const primaryToken = driveToken || calendarToken;
      if (primaryToken) {
        headers['Authorization'] = `Bearer ${primaryToken}`;
      }

      const response = await fetch(`${this.CLAUDE_SERVER_URL}${this.CHAT_ENDPOINT}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ChatError(`Failed to get response from Claude Server: ${errorText}`, 'STREAM_ERROR', response.status);
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError: any) {
        throw new ChatError(`Server returned non-JSON response: ${jsonError.message}`, 'INVALID_RESPONSE');
      }

      if (!result.success || result.error) {
        throw new ChatError(result.error || 'Server returned unsuccessful response', 'CLAUDE_ERROR');
      }

      const fullResponse = result.message || '';
      
      // Extract tools used from server response
      const toolsUsed: string[] = [];
      if (result.toolCalls && Array.isArray(result.toolCalls)) {
        for (const toolCall of result.toolCalls) {
          if (toolCall && typeof toolCall.name === 'string' && !toolsUsed.includes(toolCall.name)) {
            toolsUsed.push(toolCall.name);
          } else if (toolCall && typeof toolCall.toolName === 'string' && !toolsUsed.includes(toolCall.toolName)) {
            toolsUsed.push(toolCall.toolName);
          } else if (typeof toolCall === 'string' && !toolsUsed.includes(toolCall)) {
            toolsUsed.push(toolCall);
          }
        }
      }

      // Show tool execution messages if any tools were used
      if (toolsUsed.length > 0) {
        for (const toolName of toolsUsed) {
          const toolMsgId = this.addToolSystemMessage(request.conversationId, toolName, 'pending');
          
          // Simulate tool execution
          await new Promise(resolve => setTimeout(resolve, 500)); 
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          this.updateToolSystemMessage(toolMsgId, 'success');
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Create assistant message AFTER tools have been shown
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

      // Stream the assistant response with typing effect
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
      
      this.addToolsUsedToMessage(assistantMessageId, toolsUsed);
      await this.finalizeStreamingMessage(assistantMessageId);

    } catch (error) {
      if (assistantMessageId) {
        this.handleStreamError(error as Error, assistantMessageId);
      } else {
        console.error('[ChatService] Error before assistant message creation:', error);
        this.addErrorMessageToUI(request.conversationId, 'An unexpected error occurred while processing your request.');
      }
    }
  }

  private handleStreamError(error: Error, messageId: string | null): void {
    console.error('[ChatService] Stream error:', error);
    if (messageId) {
      this.updateStreamingMessage(messageId, 'Error processing response.');
      this.finalizeStreamingMessage(messageId, true);
    }
    this.streamSubject.error(error);
  }

  private addErrorMessageToUI(conversationId: string, content: string): void {
    const errorId = crypto.randomUUID();
    const errorMessage: ChatMessage = {
      id: errorId,
      conversationId,
      content,
      role: 'system',
      timestamp: new Date(),
      isError: true,
      metadata: {
        isError: true 
      }
    };
    this._messages.update(msgs => [...msgs, errorMessage]);
  }

  private updateStreamingMessage(messageId: string | null, contentChunk: string): void {
    if (!messageId) return;

    this._messages.update(currentMessages => {
      const messageIndex = currentMessages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        console.warn(`[ChatService] updateStreamingMessage: Message ID ${messageId} not found.`);
        return currentMessages;
      }

      const updatedMessages = [...currentMessages];
      const targetMessage = updatedMessages[messageIndex];

      updatedMessages[messageIndex] = {
        ...targetMessage,
        content: contentChunk, 
        isStreaming: true,
        isError: false,
        timestamp: new Date()
      };
      return updatedMessages;
    });
  }

  private async finalizeStreamingMessage(messageId: string | null, isErrorEncountered: boolean = false): Promise<void> {
    if (!messageId) return;

    this._messages.update(currentMessages => {
      const messageIndex = currentMessages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        console.warn(`[ChatService] finalizeStreamingMessage: Message ID ${messageId} not found.`);
        return currentMessages;
      }

      const updatedMessages = [...currentMessages];
      const targetMessage = updatedMessages[messageIndex];
      
      updatedMessages[messageIndex] = {
        ...targetMessage,
        isStreaming: false,
        isError: isErrorEncountered,
        timestamp: new Date()
      };

      if (isErrorEncountered && updatedMessages[messageIndex].metadata) {
        updatedMessages[messageIndex].metadata!.isError = true;
      } else if (isErrorEncountered) {
        updatedMessages[messageIndex].metadata = { isError: true };
      }
      
      return updatedMessages;
    });
    await new Promise(resolve => setTimeout(resolve, 0)); 
  }

  /**
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

      // Update in database
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

  private async loadAvailableModels(): Promise<void> {
    try {
      const models = await this.supabaseService.getAIModels();
      
      if (models.length === 0) {
        const defaultModels: AIModel[] = [
          {
            id: 'gemma3:4b',
            name: 'Gemma 3:4b',
            provider: 'local',
            description: 'Fast local model optimized for chat',
            contextWindow: 8192,
            isAvailable: true,
            configuration: {}
          },
          {
            id: 'claude-3-5-haiku',
            name: 'Claude 3.5 Haiku',
            provider: 'anthropic',
            description: 'Fast and efficient Claude model',
            contextWindow: 200000,
            isAvailable: true,
            configuration: {}
          }
        ];
        this._availableModels.set(defaultModels);
        this._defaultModel.set(defaultModels[0]);
      } else {
        this._availableModels.set(models);
        
        const defaultModel = models.find(m => m.id === 'gemma3:4b' && m.isAvailable) || 
                           models.find(m => m.isAvailable) || 
                           models[0];
        this._defaultModel.set(defaultModel);
      }
    } catch (error) {
      console.error('[ChatService] ❌ Error loading models:', error);
      const fallbackModels: AIModel[] = [
        {
          id: 'gemma3:4b',
          name: 'Gemma 3:4b',
          provider: 'local',
          description: 'Default fallback model',
          contextWindow: 8192,
          isAvailable: true,
          configuration: {}
        }
      ];
      this._availableModels.set(fallbackModels);
      this._defaultModel.set(fallbackModels[0]);
    }
  }

  private async loadConversations(): Promise<void> {
    try {
      const currentUser = this.authStateService.getCurrentUser();
      if (!currentUser) {
        this._conversations.set([]);
        return;
      }
      
      const conversations = await this.supabaseService.getConversations();
      this._conversations.set(conversations);
      
      if (conversations.length > 0 && !this._currentConversation()) {
        this._currentConversation.set(conversations[0]);
      }
    } catch (error) {
      console.error('[ChatService] ❌ Error loading conversations:', error);
      this._conversations.set([]);
    }
  }

  private async addMessage(message: ChatMessage): Promise<void> {
    try {
      // Add to local state immediately for responsive UI
      this._messages.update(msgs => [...msgs, message]);
      
      // Persist to database
      await this.supabaseService.createMessage(
        message.conversationId,
        message.content,
        message.role,
        message.metadata
      );
    } catch (error) {
      console.error('[ChatService] ❌ Error adding message:', error);
    }
  }

  private handleError(error: Error, context?: string): void {
    console.error(`[ChatService] Error${context ? ' in ' + context : ''}:`, error);
    if (error instanceof ChatError) {
      this.addErrorMessageToUI(this.currentConversation()?.id || 'unknown', `Error: ${error.message} (${error.code})`);
    } else {
      this.addErrorMessageToUI(this.currentConversation()?.id || 'unknown', 'An unexpected error occurred.');
    }
  }

  /**
   * Formats a tool name for display.
   */
  private formatToolName(toolName: string | undefined): string {
    if (!toolName) return 'Unknown Tool';
    return toolName
      .split(/_|\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Adds a system message to indicate tool usage.
   */
  private addToolSystemMessage(conversationId: string, tool: string, status: 'pending' | 'success' | 'error'): string {
    const toolMessage: ChatMessage = {
      id: crypto.randomUUID(),
      content: status === 'pending'
        ? `Executing tool: ${this.formatToolName(tool)}...`
        : `Tool ${this.formatToolName(tool)} ${status}.`,
      role: 'system',
      timestamp: new Date(),
      conversationId: conversationId,
      metadata: {
        tool: tool,
        toolStatus: status
      }
    };

    this._messages.update(currentMessages => [...currentMessages, toolMessage]);
    return toolMessage.id;
  }

  /**
   * Updates an existing tool system message.
   */
  private updateToolSystemMessage(messageId: string, status: 'success' | 'error'): void {
    this._messages.update(currentMessages => {
      const messageIndex = currentMessages.findIndex(m =>
        m.id === messageId &&
        m.role === 'system' &&
        m.metadata?.toolStatus === 'pending'
      );

      if (messageIndex === -1) {
        console.warn(`[ChatService] updateToolSystemMessage: Pending tool system message ID ${messageId} not found.`);
        return currentMessages;
      }

      const updatedMessages = [...currentMessages];
      const originalMessage = updatedMessages[messageIndex];
      const toolName = originalMessage.metadata?.tool || 'Unknown Tool'; 
      
      updatedMessages[messageIndex] = {
        ...originalMessage,
        content: `Tool ${this.formatToolName(toolName)} ${status}.`,
        timestamp: new Date(),
        metadata: {
          ...originalMessage.metadata,
          toolStatus: status
        }
      };
      return updatedMessages;
    });
  }

  /**
   * Adds the list of used tools to the assistant's message metadata.
   */
  private addToolsUsedToMessage(messageId: string | null, toolsUsed: string[]): void {
    if (!messageId || toolsUsed.length === 0) {
      return;
    }

    this._messages.update(currentMessages => {
      const messageIndex = currentMessages.findIndex(m => m.id === messageId && m.role === 'assistant');
      if (messageIndex === -1) {
        console.warn(`[ChatService] addToolsUsedToMessage: Assistant message ID ${messageId} not found.`);
        return currentMessages;
      }

      const updatedMessages = [...currentMessages];
      const targetMessage = updatedMessages[messageIndex];

      const existingMetadata = targetMessage.metadata || {};
      const existingToolsUsed = existingMetadata.toolsUsed || [];
      
      const newToolsUsed = Array.from(new Set([...existingToolsUsed, ...toolsUsed]));

      updatedMessages[messageIndex] = {
        ...targetMessage,
        metadata: {
          ...existingMetadata,
          toolsUsed: newToolsUsed
        }
      };
      return updatedMessages;
    });
  }

  /**
   * Creates a new conversation
   */
  async createConversation(title?: string, initialMessage?: string): Promise<void> {
    try {
      const currentUser = this.authStateService.getCurrentUser();
      if (!currentUser) {
        throw new ChatError('User must be authenticated to create conversations', 'AUTH_REQUIRED');
      }
      
      const conversationTitle = title || 
        (initialMessage ? this.generateTitleFromMessage(initialMessage) : 'New Conversation');
      
      const newConversation = await this.supabaseService.createConversation(
        conversationTitle,
        this.getDefaultModelId()
      );
      
      this._conversations.update(conversations => [newConversation, ...conversations]);
      this._currentConversation.set(newConversation);
      this._messages.set([]);
    } catch (error) {
      console.error('[ChatService] ❌ Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Loads a specific conversation and its messages
   */
  async loadConversation(conversationId: string): Promise<void> {
    try {
      const conversation = this._conversations().find(c => c.id === conversationId);
      if (!conversation) {
        throw new ChatError('Conversation not found', 'NOT_FOUND');
      }
      
      this._currentConversation.set(conversation);
      
      const messages = await this.supabaseService.getMessages(conversationId);
      this._messages.set(messages);
    } catch (error) {
      console.error('[ChatService] ❌ Error loading conversation:', error);
      throw error;
    }
  }

  /**
   * Deletes a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await this.supabaseService.deleteConversation(conversationId);
      
      this._conversations.update(conversations => 
        conversations.filter(c => c.id !== conversationId)
      );
      
      if (this._currentConversation()?.id === conversationId) {
        this._currentConversation.set(null);
        this._messages.set([]);
      }
    } catch (error) {
      console.error('[ChatService] ❌ Error deleting conversation:', error);
      throw error;
    }
  }

  /**
   * Gets the default model
   */
  getDefaultModel(): AIModel | null {
    return this._defaultModel();
  }

  /**
   * Gets the default model ID
   */
  getDefaultModelId(): string {
    const defaultModel = this._defaultModel();
    return defaultModel?.id || 'gemma3:4b';
  }

  /**
   * Generates a conversation title from the first message
   */
  private generateTitleFromMessage(message: string): string {
    const cleanMessage = message.trim().replace(/\n/g, ' ');
    if (cleanMessage.length <= 50) {
      return cleanMessage;
    }
    return cleanMessage.substring(0, 47) + '...';
  }
}
