/**
 * Core Genkit Types and Interfaces
 * Compatible with Firebase Genkit + Groq + Llama 4 Scout
 */

import { z } from 'zod';

// Genkit Tool Definition Schema
export const GenkitToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.any(),
  outputSchema: z.any().optional(),
});

// Genkit Flow Definition
export interface GenkitFlow {
  name: string;
  inputSchema: z.ZodSchema;
  outputSchema: z.ZodSchema;
  streamSchema?: z.ZodSchema;
}

// Groq Model Types (Llama 4 variants)
export enum GroqModel {
  LLAMA_4_SCOUT = 'llama-4-scout',
  LLAMA_4_MAVERICK = 'llama-4-maverick',
  GEMMA_2_9B = 'gemma2-9b-it',
}

// Tool Execution Result
export interface GenkitToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

// Chat Message for Genkit
export interface GenkitChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: ChatAttachment[];
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

// Tool Call Interface
export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

// Tool Result Interface
export interface ToolResult {
  id: string;
  result: any;
  error?: string;
}

// Chat Attachment (multimodal)
export interface ChatAttachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'file';
  size: number;
  mimeType: string;
  base64?: string;
  url?: string;
}

// Streaming Response Type
export interface GenkitStreamChunk {
  content?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  done?: boolean;
}

// Genkit Configuration
export interface GenkitConfig {
  apiKey: string;
  model: GroqModel;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  streaming?: boolean;
}

// Tool Registration Interface
export interface GenkitToolRegistration {
  id: string;
  tool: any;
  category: string;
  enabled: boolean;
}
