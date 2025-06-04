/**
 * Tool Result Interfaces
 * Standardized responses for all tool operations
 */

import { ToolCategory } from './tool.interface';

// Base Tool Result
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  timestamp: Date;
}

// Enhanced Tool Result with Metadata
export interface EnhancedToolResult extends ToolResult {
  toolId: string;
  category: ToolCategory;
  executionTime: number;
  metadata?: {
    apiCalls?: number;
    tokensUsed?: number;
    cacheHit?: boolean;
    rateLimited?: boolean;
    [key: string]: any;
  };
}

// Streaming Tool Result
export interface StreamingToolResult {
  chunk: string;
  done: boolean;
  metadata?: Record<string, any>;
}

// File Operation Results
export interface FileOperationResult extends ToolResult {
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  downloadUrl?: string;
}

// Search Results
export interface SearchResult extends ToolResult {
  results: SearchItem[];
  totalResults: number;
  query: string;
  source: string;
}

export interface SearchItem {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevanceScore?: number;
}

// Calendar Operation Results
export interface CalendarOperationResult extends ToolResult {
  eventId?: string;
  eventTitle?: string;
  startTime?: Date;
  endTime?: Date;
  attendees?: string[];
}

// Document Analysis Results
export interface DocumentAnalysisResult extends ToolResult {
  content: string;
  summary?: string;
  metadata: {
    pages?: number;
    wordCount?: number;
    language?: string;
    extractedImages?: number;
    tables?: number;
  };
  entities?: ExtractedEntity[];
}

export interface ExtractedEntity {
  type: 'person' | 'organization' | 'location' | 'date' | 'other';
  value: string;
  confidence: number;
  position: {
    start: number;
    end: number;
  };
}
