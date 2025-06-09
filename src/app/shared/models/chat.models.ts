/**
 * Chat Models - Domain entities for AI Chat Application
 * Following Domain Driven Design principles with strict type safety
 */

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  conversationId: string;
  isStreaming?: boolean;
  isError?: boolean;
  metadata?: ChatMessageMetadata;
}

export interface ChatMessageMetadata {
  model?: string;
  tokens?: number;
  processingTime?: number;
  sources?: string[];
  thoughts?: string; // Internal agent reasoning (optional)
  attachments?: ChatAttachment[]; // File/image attachments
  toolsUsed?: string[]; // Herramientas usadas por el agente
  tool?: string; // Herramienta en ejecución
  toolStatus?: 'pending' | 'success' | 'error'; // Estado de la herramienta
  isError?: boolean; // Flag to indicate an error message
}

export interface ChatAttachment {
  id: string;
  name: string;
  type: 'image' | 'document';
  size: number;
  url?: string; // For displaying the attachment
  base64?: string; // For sending to AI models
  mimeType: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  isActive: boolean;
  settings?: ConversationSettings;
}

export interface ConversationSettings {
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'local';
  description: string;
  contextWindow: number;
  isAvailable: boolean;
  configuration?: Record<string, any>;
}

export interface ChatRequest {
  message: string;
  conversationId: string;
  model: string;
  settings?: Partial<ConversationSettings>;
  attachments?: ChatAttachment[]; // Support for multimodal inputs
}

export interface ChatResponse {
  message: ChatMessage;
  conversation: Conversation;
  success: boolean;
  error?: string;
}

export interface StreamChunk {
  id?: string;
  content?: string;
  delta: string;
  done?: boolean;
  conversationId?: string;
  finish_reason?: string | null;
}

// UI State Types
export interface ChatUIState {
  isLoading: boolean;
  isStreaming: boolean;
  currentConversationId: string | null;
  sidebarOpen: boolean;
  selectedModel: string;
  error: string | null;
}

// Message Action Types
export enum ChatMessageActionType {
  Copy = 'copy',
  Regenerate = 'regenerate',
  Edit = 'edit'
}

export interface ChatMessageAction {
  type: ChatMessageActionType | string;
  messageId: string;
  data?: unknown;
}

// Error Types
export class ChatError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ChatError';
  }
}
