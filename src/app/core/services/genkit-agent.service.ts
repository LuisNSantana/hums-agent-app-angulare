/**
 * Firebase Genkit Agent Service
 * Main service for handling AI conversations with Groq + Llama 4 Scout
 */

import { Injectable, inject } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import {
  GenkitChatMessage,
  GenkitStreamChunk,
  GenkitConfig,
  GroqModel,
  ToolCall,
  ToolResult,
  EnhancedToolResult,
} from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class GenkitAgentService {
  private readonly http = inject(HttpClient);
  
  // Streaming subjects
  private streamingSubject = new Subject<GenkitStreamChunk>();
  private conversationSubject = new BehaviorSubject<GenkitChatMessage[]>([]);
    // Configuration
  private config: GenkitConfig = {
    apiKey: environment.api?.baseUrl || 'http://localhost:3001',
    model: GroqModel.LLAMA_4_SCOUT,
    temperature: 0.7,
    maxTokens: 4096,
    streaming: true,
  };

  // Observables
  readonly streaming$ = this.streamingSubject.asObservable();
  readonly conversation$ = this.conversationSubject.asObservable();

  /**
   * Process user message with Llama 4 Scout
   */
  async processMessage(
    message: string,
    conversationHistory: GenkitChatMessage[] = [],
    tools: string[] = []
  ): Promise<void> {
    try {
      const payload = {
        message,
        conversationHistory,
        tools,
        config: this.config,
      };      // Make HTTP request to Genkit backend
      const response = await this.http.post<any>(
        `${environment.api.baseUrl}/api/genkit/chat`,
        payload
      ).toPromise();

      if (response.streaming) {
        this.handleStreamingResponse(response.streamId);
      } else {
        this.handleDirectResponse(response);
      }
    } catch (error) {
      console.error('[GenkitAgent] Error processing message:', error);
      this.handleError(error);
    }
  }

  /**
   * Handle streaming response from Genkit
   */  private handleStreamingResponse(streamId: string): void {
    const eventSource = new EventSource(
      `${environment.api.baseUrl}/api/genkit/stream/${streamId}`
    );

    eventSource.onmessage = (event) => {
      try {
        const chunk: GenkitStreamChunk = JSON.parse(event.data);
        this.streamingSubject.next(chunk);

        if (chunk.done) {
          eventSource.close();
        }
      } catch (error) {
        console.error('[GenkitAgent] Error parsing stream chunk:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[GenkitAgent] EventSource error:', error);
      eventSource.close();
      this.handleError(error);
    };
  }

  /**
   * Handle direct (non-streaming) response
   */
  private handleDirectResponse(response: any): void {
    const chunk: GenkitStreamChunk = {
      content: response.content,
      done: true,
    };
    this.streamingSubject.next(chunk);
  }

  /**
   * Execute tool call
   */
  async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    try {      const response = await this.http.post<EnhancedToolResult>(
        `${environment.api.baseUrl}/api/genkit/tools/execute`,
        toolCall
      ).toPromise();

      return {
        id: toolCall.id,
        result: response?.data,
        error: response?.error,
      };
    } catch (error) {
      console.error('[GenkitAgent] Tool execution error:', error);
      return {
        id: toolCall.id,
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update conversation history
   */
  updateConversation(messages: GenkitChatMessage[]): void {
    this.conversationSubject.next(messages);
  }

  /**
   * Get available tools
   */
  async getAvailableTools(): Promise<string[]> {
    try {      const response = await this.http.get<{ tools: string[] }>(
        `${environment.api.baseUrl}/api/genkit/tools`
      ).toPromise();
      
      return response?.tools || [];
    } catch (error) {
      console.error('[GenkitAgent] Error fetching tools:', error);
      return [];
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<GenkitConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Handle errors
   */
  private handleError(error: any): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorChunk: GenkitStreamChunk = {
      content: `Error: ${errorMessage}`,
      done: true,
    };
    this.streamingSubject.next(errorChunk);
  }

  /**
   * Reset conversation
   */
  resetConversation(): void {
    this.conversationSubject.next([]);
  }

  /**
   * Get current configuration
   */
  getConfig(): GenkitConfig {
    return { ...this.config };
  }
}
