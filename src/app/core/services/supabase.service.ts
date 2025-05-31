/**
 * Supabase Service - Database operations for Agent Hums
 * Following Clean Architecture principles with proper error handling
 */

import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { supabaseConfig } from '../config/supabase.config';
import { Database } from '../../shared/types/database.types';
import { ChatMessage, ChatMessageMetadata, Conversation, AIModel } from '../../shared/models/chat.models';
import { AuthService } from './auth.service';

type Tables = Database['public']['Tables'];
type ConversationRow = Tables['conversations']['Row'];
type MessageRow = Tables['messages']['Row'];
type AIModelRow = Tables['ai_models']['Row'];

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private readonly supabase: SupabaseClient<Database>;
  private readonly _isConnected = new BehaviorSubject<boolean>(false);
  private readonly authService = inject(AuthService);

  readonly isConnected$ = this._isConnected.asObservable();

  constructor() {
    this.supabase = createClient<Database>(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      supabaseConfig.options
    );

    this.testConnection();
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    try {
      const { error } = await this.supabase.from('ai_models').select('count').limit(1);
      this._isConnected.next(!error);
    } catch (error) {
      console.error('Supabase connection failed:', error);
      this._isConnected.next(false);
    }
  }

  // ====================
  // AI MODELS OPERATIONS
  // ====================

  /**
   * Get all available AI models
   */
  async getAIModels(): Promise<AIModel[]> {
    try {
      const { data, error } = await this.supabase
        .from('ai_models')
        .select('*')
        .eq('is_available', true)
        .order('name');

      if (error) throw error;

      return data.map(this.mapAIModelFromDb);
    } catch (error) {
      console.error('Error fetching AI models:', error);
      return [];
    }
  }

  /**
   * Get a specific AI model by ID
   */
  async getAIModel(id: string): Promise<AIModel | null> {
    try {
      const { data, error } = await this.supabase
        .from('ai_models')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return this.mapAIModelFromDb(data);
    } catch (error) {
      console.error('Error fetching AI model:', error);
      return null;
    }
  }

  // =========================
  // CONVERSATIONS OPERATIONS
  // =========================
  /**
   * Get all conversations for the current authenticated user (ordered by most recent)
   */
  async getConversations(): Promise<Conversation[]> {
    try {
      const currentUser = this.authService.user();
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      const { data, error } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapConversationFromDb);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  /**
   * Get a specific conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return this.mapConversationFromDb(data);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  }  /**
   * Create a new conversation for the current authenticated user
   */
  async createConversation(title: string, modelId?: string): Promise<Conversation> {
    console.log('[SupabaseService] Guardando conversación en BD:', { title, modelId });
    try {
      const currentUser = this.authService.user();
      if (!currentUser) {
        throw new Error('No authenticated user');
      }
      // Buscar el modelo por model_id o name y obtener su UUID real
      let aiModelUuid = modelId;
      if (modelId) {
        const { data: modelRow, error: modelError } = await this.supabase
          .from('ai_models')
          .select('id, model_id, name')
          .or(`model_id.eq.${modelId},name.eq.${modelId}`)
          .maybeSingle();
        if (modelError) {
          console.error('[SupabaseService] Error buscando modelo:', modelError);
          throw modelError;
        }
        if (!modelRow) {
          throw new Error(`AI model not found for: ${modelId}`);
        }
        aiModelUuid = modelRow.id;
      }
      const { data, error } = await this.supabase
        .from('conversations')
        .insert([
          {
            title,
            ai_model_id: aiModelUuid,
            user_id: currentUser.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();
      if (error) {
        console.error('[SupabaseService] Error al guardar conversación:', error);
        throw error;
      }
      console.log('[SupabaseService] Conversación guardada:', data);
      return this.mapConversationFromDb(data);
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Update conversation (typically title or last activity)
   */
  async updateConversation(id: string, updates: Partial<ConversationRow>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('conversations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
  }
  /**
   * Delete a conversation (soft delete)
   */
  async deleteConversation(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('conversations')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  // ====================
  // MESSAGES OPERATIONS
  // ====================

  /**
   * Get all messages for a conversation
   */
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map(this.mapMessageFromDb);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  /**
   * Create a new message
   */
  async createMessage(
    conversationId: string,
    content: string,
    role: 'user' | 'assistant' | 'system',
    metadata?: any
  ): Promise<ChatMessage> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content,
          role,
          metadata,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation's updated_at timestamp
      await this.updateConversation(conversationId, {});

      return this.mapMessageFromDb(data);
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  /**
   * Update a message (typically for streaming updates)
   */
  async updateMessage(id: string, content: string, metadata?: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .update({
          content,
          metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  // ====================
  // MAPPING FUNCTIONS
  // ====================

  private mapAIModelFromDb(row: AIModelRow): AIModel {
    return {
      id: row.id,
      name: row.name,
      provider: row.provider as AIModel['provider'],
      description: row.description || '',
      contextWindow: row.context_window || 4096,
      isAvailable: row.is_available || false
    };
  }
  private mapConversationFromDb(row: ConversationRow): Conversation {
    // Parse settings from JSON or provide defaults
    const settings = row.settings as any;
    const parsedSettings = typeof settings === 'object' && settings !== null ? settings : {};
    
    return {
      id: row.id,
      title: row.title,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      messageCount: row.message_count || 0,
      isActive: !(row.is_archived || false), // Convert is_archived to isActive
      settings: {
        model: {
          id: row.ai_model_id || 'deepseek-r1:7b',
          name: 'DeepSeek R1 7B',
          provider: 'local',
          description: 'Local model via Ollama',
          contextWindow: 32768,
          isAvailable: true
        },
        temperature: parsedSettings.temperature || 0.7,
        maxTokens: parsedSettings.maxTokens || 2048,
        systemPrompt: row.system_prompt || undefined
      }
    };
  }
  private mapMessageFromDb(row: MessageRow): ChatMessage {
    // Safely parse metadata JSON or provide undefined
    let metadata: ChatMessageMetadata | undefined;
    if (row.metadata && typeof row.metadata === 'object' && row.metadata !== null) {
      metadata = row.metadata as ChatMessageMetadata;
    }
    
    return {
      id: row.id,
      content: row.content,
      role: row.role as ChatMessage['role'],
      timestamp: new Date(row.created_at),
      conversationId: row.conversation_id,
      isStreaming: false,
      isError: false,
      metadata
    };
  }

  // ====================
  // REALTIME SUBSCRIPTIONS
  // ====================

  /**
   * Subscribe to conversation changes
   */
  subscribeToConversations(callback: (payload: any) => void) {
    return this.supabase
      .channel('conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, callback)
      .subscribe();
  }

  /**
   * Subscribe to message changes for a specific conversation
   */
  subscribeToMessages(conversationId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, callback)
      .subscribe();
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(subscription: any) {
    return this.supabase.removeChannel(subscription);
  }
}
