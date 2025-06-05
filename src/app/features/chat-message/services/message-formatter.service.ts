/**
 * Message Formatter Service
 * Handles content formatting and transformations
 */
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MessageFormatterService {
  
  /**
   * Format message content with basic markdown-like syntax
   */
  formatContent(content: string): string {
    if (!content) return '';
    
    // Basic markdown-like formatting
    return content
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/```([^```]+)```/g, '<pre><code>$1</code></pre>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  /**
   * Format timestamp to relative time
   */
  formatTime(timestamp: Date): string {
    if (!timestamp) return '';
    
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return timestamp.toLocaleDateString();
  }

  /**
   * Format file size in human-readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get friendly label for tool used
   */
  getToolBadgeLabel(tool: string): string {
    switch (tool) {
      case 'searchWeb':
        return '🔎 Web Search';
      case 'analyzeWeb':
        return '📊 Analyze Web';
      case 'googleCalendar':
        return '📅 Google Calendar';
      case 'googleDrive':
        return '📁 Google Drive';
      case 'analyzeDocument':
        return '📄 Document Analyzer';
      default:
        return `🛠️ ${tool}`;
    }
  }
}
