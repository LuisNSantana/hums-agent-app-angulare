/**
 * Types and Interfaces
 * Complete type definitions for the modular server architecture
 */

import { z } from '@genkit-ai/core/schema';

// Base types
export interface BaseResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

// Search Web types
export interface SearchWebInput {
  query: string;
  limit?: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchWebOutput extends BaseResponse {
  results: SearchResult[];
  query: string;
}

// Document Analysis types
export interface AnalyzeDocumentInput {
  fileUrl: string;
  query?: string;
}

export interface DocumentMetadata {
  pages: number;
  wordCount: number;
  language?: string;
}

export interface AnalyzeDocumentOutput extends BaseResponse {
  content: string;
  summary?: string;
  metadata?: DocumentMetadata;
  answer?: string;
}

export type DocumentAnalysisType = 'general' | 'technical' | 'legal' | 'financial' | 'medical' | 'summary' | 'extraction';

// Document Analysis Result types
export interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
}

export interface DocumentAnalysisResult {
  success: boolean;
  content: string;
  summary?: string;
  metadata: {
    pages?: number;
    wordCount: number;
    language?: string;
    fileName?: string;
    fileSize?: number;
    processedAt?: string;
    chunks?: number;
    totalCharacters?: number;
    fileType?: string;
    encoding?: string;
    sheets?: string[];
    headers?: string[];
    estimatedTokens?: number;
    processingStrategy?: string;
  };
  entities?: ExtractedEntity[];
  error?: string;
}

// Google Calendar types
export interface CreateEventInput {
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  attendees?: string[];
}

export interface UpdateEventInput {
  eventId: string;
  title?: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  location?: string;
  attendees?: string[];
}

export interface DeleteEventInput {
  eventId: string;
}

export interface ListEventsInput {
  startDate: string;
  endDate: string;
  maxResults?: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  attendees?: string[];
  htmlLink?: string;
}

export interface CalendarEventOutput extends BaseResponse {
  event?: CalendarEvent;
}

export interface CalendarEventsOutput extends BaseResponse {
  events: CalendarEvent[];
  count: number;
}

// Google Drive types
export interface UploadFileInput {
  fileName: string;
  fileUrl?: string;
  fileContent?: string;
  mimeType: string;
  folderId?: string;
}

export interface ListFilesInput {
  query?: string;
  folderId?: string;
  maxResults?: number;
  limit?: number; // Alias for maxResults
}

export interface ShareFileInput {
  fileId: string;
  emailAddress?: string;
  role: 'reader' | 'writer' | 'owner';
  type: 'user' | 'group' | 'domain' | 'anyone';
}

export interface CreateFolderInput {
  name: string;
  parentFolderId?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
}

export interface DriveFileOutput extends BaseResponse {
  file?: DriveFile;
}

export interface DriveFilesOutput extends BaseResponse {
  files: DriveFile[];
  count: number;
}

export interface DrivePermission {
  id: string;
  type: string;
  role: string;
  emailAddress?: string;
}

export interface DriveShareOutput extends BaseResponse {
  permission?: DrivePermission;
}

export interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

export interface DriveFolderOutput extends BaseResponse {
  folder?: DriveFolder;
}

// Google Drive additional types
export type DriveOrderBy = 'createdTime' | 'folder' | 'modifiedByMeTime' | 'modifiedTime' | 'name' | 'quotaBytesUsed' | 'recency' | 'sharedWithMeTime' | 'starred' | 'viewedByMeTime' | 'size';

export type GoogleDriveFile = DriveFile;

// Chat types
export interface ChatMessage {
  message: string;
  conversationId?: string;
  userId?: string;
  attachments?: any[];
}

export interface ToolResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export interface ToolCall {
  name: string;
  input: any;
  output?: any;
}

export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ChatResponse extends BaseResponse {
  toolCalls?: ToolCall[];
  conversationId: string;
  model?: string;
  usage?: UsageStats;
  error?: string;
}

// Zod schemas for validation
export const ChatMessageSchema = z.object({
  message: z.string(),
  conversationId: z.string().optional(),
  userId: z.string().optional(),
  attachments: z.array(z.any()).optional()
});

export const ChatResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  toolCalls: z.array(z.object({
    name: z.string(),
    input: z.any(),
    output: z.any().optional()
  })).optional(),
  conversationId: z.string(),
  model: z.string().optional(),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    totalTokens: z.number()
  }).optional(),
  error: z.string().optional(),
  timestamp: z.string()
});
