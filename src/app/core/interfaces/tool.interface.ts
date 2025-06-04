/**
 * Enhanced Tool Interface - Compatible with Firebase Genkit
 * Extends existing tool system to work with Genkit flows and Groq models
 */

import { z } from 'zod';
import { GenkitToolResult, ToolCall, ToolResult } from './genkit.types';

// Tool Category Enum
export enum ToolCategory {
  FILE_MANAGEMENT = 'file_management',
  CALENDAR = 'calendar',
  WEB_SEARCH = 'web_search',
  DOCUMENT_ANALYSIS = 'document_analysis',
  COMMUNICATION = 'communication',
  PRODUCTIVITY = 'productivity',
}

// Tool Example for Documentation
export interface ToolExample {
  input: Record<string, any>;
  output: any;
  description: string;
}

// Enhanced Tool Interface (Genkit Compatible)
export interface Tool {
  // Basic Tool Information
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  
  // Genkit Compatibility
  schema: z.ZodSchema;
  examples: ToolExample[];
  
  // Tool Methods
  initialize(): Promise<boolean>;
  execute(params: any): Promise<GenkitToolResult>;
  defineGenkitTool(): any; // Returns Genkit tool definition
  
  // Metadata
  version: string;
  author?: string;
  tags?: string[];
  requirements?: string[];
}

// Tool Registry Interface
export interface ToolRegistry {
  tools: Map<string, Tool>;
  register(tool: Tool): Promise<boolean>;
  unregister(toolId: string): boolean;
  getTool(toolId: string): Tool | undefined;
  getToolsByCategory(category: ToolCategory): Tool[];
  getAllTools(): Tool[];
  getEnabledTools(): Tool[];
}

// Tool Execution Context
export interface ToolExecutionContext {
  toolId: string;
  params: Record<string, any>;
  userId?: string;
  conversationId?: string;
  timestamp: Date;
}

// Tool Result with Enhanced Metadata
export interface EnhancedToolResult extends GenkitToolResult {
  toolId: string;
  executionTime: number;
  context: ToolExecutionContext;
  streaming?: boolean;
}
