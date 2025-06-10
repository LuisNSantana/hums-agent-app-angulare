/**
 * Message Formatter Service
 * Handles content formatting and transformations
 */
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MessageFormatterService {
  // Constantes para formatos
  private readonly DATE_FORMAT = new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit', 
    minute: '2-digit'
  });
  
  /**
   * Format message content with basic markdown-like syntax
   */
  formatContent(content: string): string {
    if (!content) return '';
    
    // Limpiar símbolos de numerales markdown antes del procesamiento
    content = this.cleanMarkdownHeaders(content);
    
    // Identificar y formatear tablas - procesar primero para no interferir con otras reglas
    content = this.formatTables(content);
    
    // Basic markdown-like formatting
    return content
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }
  
  /**
   * Limpia los símbolos de numerales markdown y mejora la presentación visual
   */
  private cleanMarkdownHeaders(content: string): string {
    // Reemplazar encabezados markdown con formato HTML apropiado
    return content
      // Encabezados de nivel 1-4 con formato especial
      .replace(/^###\s*#\s*(.*?)$/gm, '<h2 class="document-section-title">$1</h2>')
      .replace(/^####\s*(\S+)\s*$/gm, '<h3 class="section-emoji-header">$1</h3>')
      .replace(/^####\s*(.*?)$/gm, '<h3 class="document-subsection-title">$1</h3>')
      .replace(/^###\s*(.*?)$/gm, '<h3 class="document-section-title">$1</h3>')
      .replace(/^##\s*(.*?)$/gm, '<h2 class="document-main-title">$1</h2>');
  }
  
  /**
   * Detecta y formatea tablas de datos en formato legible
   */
  private formatTables(content: string): string {
    // Detecta patrones de tablas con barras verticales
    const tableRegex = /\|[^\n]+\|[\s]*\n(\s*\|[^\n]+\|[\s]*\n)+/g;
    
    // También detecta tablas de datos financieros (como en la captura)
    const financialDataRegex = /(\|\s*[\w\s.]+\s*\|\s*[\d.]+\s*\|[^\n]*\n){2,}/g;
    
    // Detectar tablas simples con barras verticales sin formato markdown completo
    const simpleTableRegex = /(\|\s*[^\n]*\s*){2,}\|\n((\|\s*[^\n]*\s*){2,}\|\n)+/g;
    
    // Procesar todos los tipos de tablas
    return content
      .replace(tableRegex, match => this.convertToHTMLTable(match))
      .replace(financialDataRegex, match => this.convertToHTMLTable(match))
      .replace(simpleTableRegex, match => this.convertToHTMLTable(match));
  }
  
  /**
   * Convierte una tabla en formato de barras verticales a HTML
   */
  private convertToHTMLTable(tableText: string): string {
    // Divide la tabla en filas
    const rows = tableText.trim().split('\n');
    
    // Crear tabla HTML con clase para estilos
    let htmlTable = '<div class="data-table-wrapper"><table class="formatted-table">';
    
    // Procesa las filas
    rows.forEach((row, rowIndex) => {
      // Eliminar barras verticales del inicio y final y dividir en celdas
      const rawCells = row.trim().split('|').filter(cell => cell !== '');
      
      // Saltar filas vacías
      if (rawCells.length === 0) return;
      
      // Determinar si es encabezado (primera fila o si contiene solo - y |)
      const isHeader = rowIndex === 0 || row.match(/^\|[-|\s]+\|$/);
      
      // Si es la fila de separación en tablas markdown (ej: |---|---|), omitirla
      if (row.match(/^\|[-|\s]+\|$/)) return;
      
      // Iniciar fila
      htmlTable += isHeader ? '<thead><tr>' : '<tr>';
      
      // Añadir celdas
      rawCells.forEach(cell => {
        const cellContent = cell.trim();
        if (isHeader) {
          htmlTable += `<th>${cellContent || '&nbsp;'}</th>`;
        } else {
          htmlTable += `<td>${cellContent || '&nbsp;'}</td>`;
        }
      });
      
      // Cerrar fila
      htmlTable += isHeader ? '</tr></thead>' : '</tr>';
    });
    
    // Cerrar tabla
    htmlTable += '</table></div>';
    
    return htmlTable;
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

  /**
   * Get file type label from MIME type
   */
  getFileTypeFromMime(mimeType: string): string {
    if (!mimeType) return 'DOC';
    
    const mimeToType: Record<string, string> = {
      'application/pdf': 'PDF',
      'application/msword': 'DOC',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/vnd.ms-excel': 'XLS',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
      'text/plain': 'TXT',
      'text/csv': 'CSV',
      'application/json': 'JSON',
      'application/javascript': 'JS',
      'text/javascript': 'JS',
      'text/html': 'HTML',
      'text/css': 'CSS',
      'application/xml': 'XML',
      'text/xml': 'XML',
      'application/zip': 'ZIP'
    };
    
    // Extract the main MIME type category
    const category = mimeType.split('/')[0];
    
    // Return specific type if found
    if (mimeToType[mimeType]) {
      return mimeToType[mimeType];
    }
    
    // Return type based on category
    switch (category) {
      case 'image':
        return mimeType.split('/')[1].toUpperCase();
      case 'audio':
        return 'AUDIO';
      case 'video':
        return 'VIDEO';
      case 'text':
        return 'TXT';
      default:
        return 'DOC';
    }
  }
}
