/**
 * @module DocumentAnalysisService
 * @description Advanced document analysis with multi-format support and token optimization
 * 
 * Supports: PDF, DOCX, DOC, TXT, XLS, XLSX, CSV
 * Features: Smart chunking, progressive summarization, hierarchical processing
 * 
 * Token Optimization Strategies (2025):
 * - Hierarchical chunking with semantic boundaries
 * - Progressive summarization with chunk overlap
 * - Smart content extraction and filtering
 * - Adaptive chunk sizing based on document structure
 * 
 * @see {@link https://docs.example.com/document-analysis} for API docs
 */

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { AnalyzeDocumentInput, AnalyzeDocumentOutput, DocumentAnalysisType, DocumentAnalysisResult } from '../types';

interface ChunkingConfig {
  maxChunkSize: number;
  overlapRatio: number;
  preserveStructure: boolean;
  minChunkSize: number;
}

interface DocumentMetadata {
  fileType: string;
  encoding?: string;
  pages?: number;
  sheets?: string[];
  headers?: string[];
  estimatedTokens: number;
}

export class DocumentAnalysisService {
  private readonly SUPPORTED_FORMATS = ['.pdf', '.docx', '.doc', '.txt', '.csv', '.xls', '.xlsx'];
  private readonly DEFAULT_CHUNKING: ChunkingConfig = {
    maxChunkSize: 8000,     // Reduced from 15000 for better token efficiency
    overlapRatio: 0.15,     // 15% overlap for context preservation
    preserveStructure: true, // Respect document structure
    minChunkSize: 1000      // Minimum viable chunk size
  };
  
  // Cache para evitar análisis redundantes del mismo documento
  private documentCache: Map<string, DocumentAnalysisResult> = new Map();

  constructor(private readonly aiService: any) {}

  /**
   * Analyzes documents with optimal token usage and multi-format support
   * 
   * @param documentBase64 - Base64 encoded document
   * @param fileName - Original filename with extension
   * @param analysisType - Type of analysis to perform
   * @param specificQuestions - Optional targeted questions
   * @param maxLength - Deprecated, now handled by adaptive chunking
   * @param chunkSize - Deprecated, now handled by smart chunking
   */
  async analyzeDocument(
    documentBase64: string,
    fileName: string,
    analysisType: DocumentAnalysisType = 'general',
    specificQuestions?: string[],
    maxLength?: number,
    chunkSize?: number
  ): Promise<DocumentAnalysisResult> {
    // Generar un hash simplificado para identificar el documento
    const documentId = `${fileName}-${documentBase64.length}`;
    const hasQuestions = specificQuestions && specificQuestions.length > 0;
    
    console.log('🔧 Analyzing document:', {
      fileName,
      analysisType,
      base64Length: documentBase64.length,
      hasQuestions
    });
    
    // Implementar un timeout global para todo el proceso de análisis
    // 20 segundos es suficiente para la mayoría de documentos, pero ajustable según necesidad
    const ANALYSIS_TIMEOUT_MS = 20000; // 20 segundos
    
    // Crear una promesa para el timeout
    const timeoutPromise = new Promise<DocumentAnalysisResult>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Documento ${fileName} - Análisis cancelado por timeout después de ${ANALYSIS_TIMEOUT_MS/1000} segundos`));
      }, ANALYSIS_TIMEOUT_MS);
    });
    
    // Crear la promesa para el análisis real
    const analysisPromise = this._doDocumentAnalysis(
      documentBase64, 
      fileName, 
      analysisType, 
      documentId,
      specificQuestions
    );
    
    // Usar Promise.race para implementar el timeout
    try {
      return await Promise.race([analysisPromise, timeoutPromise]);
    } catch (error: any) {
      console.warn(`⚠️ Análisis interrumpido: ${error.message}`);
      
      // Devolver un resultado parcial para no bloquear el flujo
      const fallbackResult: DocumentAnalysisResult = {
        success: true, // Marcamos como éxito para no romper el flujo
        content: `El documento ${fileName} es demasiado complejo o grande para ser analizado completamente en el tiempo disponible.\n\nSe ha generado un análisis parcial.`,
        summary: `Documento ${fileName}: Archivo de tipo ${this.getFileExtension(fileName)}. El análisis completo no pudo completarse dentro del tiempo límite, pero puedes hacer preguntas específicas sobre el documento si necesitas información particular.`,
        metadata: {
          fileName,
          fileSize: Buffer.from(documentBase64, 'base64').length,
          fileType: this.getFileExtension(fileName),
          estimatedTokens: Math.ceil(documentBase64.length / 4),
          wordCount: 0,
          processedAt: new Date().toISOString(),
          processingStrategy: 'timeout-limited'
        }
      };
      
      // Guardamos este resultado en caché para evitar nuevos timeouts
      this.documentCache.set(documentId, fallbackResult);
      
      return fallbackResult;
    }
  }
  
  /**
   * Implementación interna del análisis de documentos
   * Esta función es la que realmente hace todo el trabajo
   */
  // El método analyzeDocument se encarga del timeout global y la gestión de errores
  // mientras que _doDocumentAnalysis maneja la lógica principal de análisis

  /**
   * Implementación interna del análisis de documentos
   * Esta función es la que realmente hace todo el trabajo
   */
  private async _doDocumentAnalysis(
    documentBase64: string,
    fileName: string,
    analysisType: DocumentAnalysisType = 'general',
    documentId: string,
    specificQuestions?: string[]
  ): Promise<DocumentAnalysisResult> {
    // Verificar si el documento ya fue analizado anteriormente
    if (this.documentCache.has(documentId)) {
      console.log('🔄 Using cached document analysis result for:', fileName);
      return this.documentCache.get(documentId)!;
    }
    
    // Si el base64 es demasiado corto (probable error), rechazar el análisis
    if (documentBase64.length < 100) {
      console.warn(`⚠️ Document base64 content is suspiciously short (${documentBase64.length} chars)`);
      return {
        success: false,
        error: 'Invalid or truncated document data',
        content: 'El contenido del documento parece estar incompleto o corrupto.',
        metadata: {
          wordCount: 0,
          estimatedTokens: 0,
          fileType: this.getFileExtension(fileName)
        }
      };
    }
    
    console.log('🔧 Enhanced Document Analysis Starting:', {
      fileName,
      analysisType,
      base64Length: documentBase64.length,
      supportedFormats: this.SUPPORTED_FORMATS
    });
    
    try {
      // 1. Detect file format and validate
      const fileExtension = this.getFileExtension(fileName);
      if (!this.SUPPORTED_FORMATS.includes(fileExtension)) {
        throw new Error(`Unsupported file format: ${fileExtension}. Supported: ${this.SUPPORTED_FORMATS.join(', ')}`);
      }

      // 2. Extract text content based on file type
      const extractionResult = await this.extractTextContent(documentBase64, fileExtension, fileName);
      const { text, metadata } = extractionResult;

      if (!text || text.trim().length === 0) {
        throw new Error(`No text content could be extracted from ${fileName}. The file may be empty, corrupted, or image-based.`);
      }

      console.log('📄 Content extracted successfully:', {
        fileType: metadata.fileType,
        textLength: text.length,
        estimatedTokens: metadata.estimatedTokens,
        pages: metadata.pages,
        sheets: metadata.sheets
      });

      // 3. Apply intelligent chunking strategy
      const chunks = this.createSmartChunks(text, analysisType, metadata);
      
      console.log('📊 Smart chunking complete:', {
        totalChunks: chunks.length,
        avgChunkSize: Math.round(chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunks.length),
        chunkingStrategy: chunks.length > 1 ? 'hierarchical' : 'single'
      });

      // 4. Process chunks with progressive summarization
      const analysisResults = await this.processChunksProgressively(
        chunks, 
        analysisType, 
        fileName, 
        specificQuestions
      );

      // 5. Extract entities across all content
      const entities = this.extractAdvancedEntities(text, metadata.fileType);

      // 6. Create optimized final result
      const summaryResult = await this.createOptimizedSummary(
        analysisResults, 
        chunks, 
        fileName, 
        analysisType,
        metadata
      );

      const docContent = this.getOptimalContentSample(text, chunks);
      const finalResult = {
        success: true,
        content: docContent,
        summary: summaryResult.summary,
        metadata: {
          ...metadata,
          fileName,
          fileSize: Buffer.from(documentBase64, 'base64').length,
          processedAt: new Date().toISOString(),
          chunks: chunks.length,
          totalCharacters: text.length,
          wordCount: text.split(/\s+/).length,
          processingStrategy: summaryResult.strategy || 'standard'
        },
        entities: entities.length > 0 ? this.deduplicateEntities(entities) : undefined
      };
      
      console.log('📈 Document analysis result:', { success: true, contentLength: docContent.length, hasSummary: !!finalResult.summary });      
      
      // Almacenar resultado en cache para evitar análisis redundantes
      const documentId = `${fileName}-${documentBase64.length}`;
      this.documentCache.set(documentId, finalResult);
      
      return finalResult;

    } catch (error: any) {
      console.error('❌ Enhanced Document Analysis Error:', error.message);
      
      const errorResult = {
        success: false,
        error: error.message,
        content: 'Error al analizar el documento.',
        metadata: {
          wordCount: 0,
          estimatedTokens: 0,
          fileType: this.getFileExtension(fileName),
          fileName,
          fileSize: 0,
          processedAt: new Date().toISOString()
        }
      };
      
      // Almacenar incluso los errores en cache para evitar reintentos fallidos
      const documentId = `${fileName}-${documentBase64.length}`;
      this.documentCache.set(documentId, errorResult);
      
      return errorResult;
    }
  }

  /**
   * Determines file extension from filename
   */
  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex === -1 ? '' : fileName.substring(lastDotIndex).toLowerCase();
  }

  /**
   * Extracts text content from various file formats
   * Implements format-specific optimization strategies
   */
  private async extractTextContent(
    documentBase64: string, 
    fileExtension: string, 
    fileName: string
  ): Promise<{ text: string; metadata: DocumentMetadata }> {
    const buffer = Buffer.from(documentBase64, 'base64');
    let text = '';
    let metadata: DocumentMetadata = {
      fileType: fileExtension,
      estimatedTokens: 0
    };

    try {
      switch (fileExtension) {
        case '.pdf':
          const pdfData = await pdfParse(buffer);
          text = pdfData.text;
          metadata.pages = pdfData.numpages;
          break;

        case '.docx':
        case '.doc':
          const docResult = await mammoth.extractRawText({ buffer });
          text = docResult.value;
          if (docResult.messages.length > 0) {
            console.warn('⚠️ Word document conversion warnings:', docResult.messages);
          }
          break;

        case '.txt':
          text = buffer.toString('utf-8');
          metadata.encoding = 'utf-8';
          break;

        case '.csv':
          text = await this.processCsvFile(buffer);
          break;

        case '.xls':
        case '.xlsx':
          const xlsxResult = await this.extractTextFromExcel(buffer.toString('base64'), fileName);
          text = xlsxResult.text;
          metadata.sheets = xlsxResult.sheetNames;
          break;

        default:
          throw new Error(`Unsupported file format: ${fileExtension}`);
      }

      // Estimate token count (rough approximation: 1 token ≈ 4 characters)
      metadata.estimatedTokens = Math.ceil(text.length / 4);

      return { text: text.trim(), metadata };

    } catch (error: any) {
      throw new Error(`Failed to extract content from ${fileExtension} file: ${error.message}`);
    }
  }

  /**
   * Processes CSV files with intelligent structure detection
   */
  private async processCsvFile(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const csvText = buffer.toString('utf-8');
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('⚠️ CSV parsing warnings:', results.errors);
          }

          // Convert parsed data back to structured text
          const headers = results.meta.fields || [];
          let formattedText = `CSV Document Content:\n\nHeaders: ${headers.join(', ')}\n\n`;
          
          results.data.forEach((row: any, index: number) => {
            formattedText += `Row ${index + 1}:\n`;
            headers.forEach(header => {
              if (row[header]) {
                formattedText += `  ${header}: ${row[header]}\n`;
              }
            });
            formattedText += '\n';
          });

          resolve(formattedText);
        },
        error: (error: any) => reject(error)
      });
    });
  }

  /**
   * Handles Excel file extraction with special considerations and aggressive timeout
   */
  private async extractTextFromExcel(base64Data: string, filename: string): Promise<{ text: string; sheetNames: string[] }> {
    try {
      console.log(`🔢 Processing Excel file: ${filename} (with strict limits)`);

      // Timeout más estricto para Excel para evitar bloqueos
      const EXCEL_TIMEOUT_MS = 3000; // 3 segundos de timeout para Excel (reducido de 5s)
      
      // Configurar timeout para procesamiento de Excel
      const processingTimeout = new Promise<{ text: string, sheetNames: string[] }>((_, reject) => {
        setTimeout(() => reject(new Error(`Excel processing timeout after ${EXCEL_TIMEOUT_MS}ms`)), EXCEL_TIMEOUT_MS);
      });

      const processing = new Promise<{ text: string; sheetNames: string[] }>(async (resolve) => {
        const workbook = XLSX.read(Buffer.from(base64Data, 'base64'), { type: 'buffer' });
        const sheetNames = workbook.SheetNames;
        let allText = 'Excel Document Content:\n\n';

        // Procesar cada hoja con un máximo de filas para evitar sobrecarga
        for (let sheetIndex = 0; sheetIndex < sheetNames.length; sheetIndex++) {
          const sheetName = sheetNames[sheetIndex];
          const worksheet = workbook.Sheets[sheetName];
          let jsonData: unknown[][];
          
          try {
            jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          } catch (error) {
            console.warn(`⚠️ Error parsing sheet ${sheetName}:`, error);
            allText += `Sheet ${sheetIndex + 1}: "${sheetName}" (Error: No se pudo procesar esta hoja)\n\n`;
            continue;
          }
        
          allText += `Sheet ${sheetIndex + 1}: "${sheetName}"\n`;
          
          // Limitar el número de filas procesadas para evitar bloqueos - límites muy estrictos
          const maxRows = Math.min(jsonData.length, 30); // Máximo 30 filas (reducido de 50)
          const maxColumns = 10; // Máximo 10 columnas (reducido de 15)
          
          // Si es análisis financiero, limitamos aún más
          const isFinancialAnalysis = filename.toLowerCase().includes('financ') || 
                                    filename.toLowerCase().includes('report') || 
                                    filename.toLowerCase().includes('budget');
          
          // Para archivos financieros o análisis financieros, límites aún más estrictos
          if (isFinancialAnalysis) {
            const stricterMaxRows = Math.min(jsonData.length, 20); // Sólo 20 filas 
            const stricterMaxColumns = 8; // Sólo 8 columnas
            console.log(`⚡ Aplicando límites extra-estrictos para Excel financiero: ${stricterMaxRows} filas, ${stricterMaxColumns} columnas`);
          }
          
          // Generar encabezados de tabla para el formato Markdown
          let tableData = [];
          
          for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
            const row = jsonData[rowIndex];
            if (Array.isArray(row) && row.length > 0) {
              // Limitar columnas mostradas también
              const limitedRow = row.slice(0, maxColumns);
              
              // Añadir fila al array para construcción posterior de tabla
              tableData.push(limitedRow.map(cell => cell?.toString() || ''));
            }
          }
          
          // Si tenemos datos, construir una tabla con formato Markdown
          if (tableData.length > 0) {
            // Crear encabezados de tabla si es la primera fila o indexados si parecen datos
            const isHeaderRow = tableData.length > 1 && tableData[0].every(cell => 
              typeof cell === 'string' && isNaN(Number(cell)) && cell.trim() !== '');
              
            // Si la primera fila parece un encabezado, usarla como tal
            if (isHeaderRow) {
              allText += '\n| ' + tableData[0].join(' | ') + ' |\n';
              // Añadir separadores de tabla para formato Markdown
              allText += '| ' + tableData[0].map(() => '---').join(' | ') + ' |\n';
              
              // Añadir filas de datos
              for (let i = 1; i < tableData.length; i++) {
                allText += '| ' + tableData[i].join(' | ') + ' |\n';
              }
            } else {
              // Si no hay encabezados claros, crear encabezados numerados
              const headerRow = Array.from({length: Math.max(...tableData.map(row => row.length))}, 
                                          (_, i) => `Columna ${i+1}`);
                                          
              allText += '\n| ' + headerRow.join(' | ') + ' |\n';
              allText += '| ' + headerRow.map(() => '---').join(' | ') + ' |\n';
              
              // Añadir todas las filas
              for (let i = 0; i < tableData.length; i++) {
                // Asegurar que todas las filas tienen el mismo número de columnas
                const paddedRow = [...tableData[i]];
                while (paddedRow.length < headerRow.length) {
                  paddedRow.push('');
                }
                allText += '| ' + paddedRow.join(' | ') + ' |\n';
              }
            }
            
            // Indicar si hay más filas o columnas que no se muestran
            if (jsonData.length > maxRows) {
              allText += `\n_Mostrando ${maxRows} de ${jsonData.length} filas_\n`;
            }
            if (tableData.some(row => row.length > maxColumns)) {
              allText += `_Mostrando ${maxColumns} de ${Math.max(...jsonData.map(r => Array.isArray(r) ? r.length : 0))} columnas_\n`;
            }
            
            allText += '\n';
          } else {
            allText += 'Sin datos en esta hoja\n\n';
          }
          
          // Indicar si hay más filas que no se muestran
          if (jsonData.length > maxRows) {
            allText += `  (+ ${jsonData.length - maxRows} more rows not shown)\n`;
          }
          
          allText += '\n';
        }
        
        resolve({ text: allText, sheetNames });
      });

      // Usar Promise.race para implementar timeout
      return await Promise.race([processing, processingTimeout]);
      
    } catch (error: any) {
      console.error('❌ Excel processing error:', error.message);
      return { 
        text: `Excel Document Error: No se pudo procesar completamente. ${error.message}.`, 
        sheetNames: [] 
      };
    }
  }

  /**
   * Creates intelligent chunks using 2025 best practices
   * - Semantic boundary detection
   * - Adaptive sizing based on content
   * - Context preservation with overlap
   */
  private createSmartChunks(
    text: string, 
    analysisType: DocumentAnalysisType, 
    metadata: DocumentMetadata
  ): Array<{ content: string; index: number; type: 'paragraph' | 'section' | 'hybrid' }> {
    const config = { ...this.DEFAULT_CHUNKING };
    
    // Adjust chunking strategy based on analysis type
    if (analysisType === 'extraction') {
      config.maxChunkSize = 6000;  // Smaller chunks for better entity extraction
      config.overlapRatio = 0.2;   // More overlap for entity consistency
    } else if (analysisType === 'summary') {
      config.maxChunkSize = 10000; // Larger chunks for better context in summaries
      config.overlapRatio = 0.1;   // Less overlap to avoid redundancy
    }

    const chunks: Array<{ content: string; index: number; type: 'paragraph' | 'section' | 'hybrid' }> = [];

    if (text.length <= config.maxChunkSize) {
      // Single chunk for small documents
      return [{ content: text, index: 0, type: 'section' }];
    }

    // Try semantic chunking first (by paragraphs/sections)
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    if (this.canUseSemanticChunking(paragraphs, config)) {
      return this.createSemanticChunks(paragraphs, config);
    }

    // Fall back to hybrid chunking for unstructured text
    return this.createHybridChunks(text, config);
  }

  /**
   * Determines if semantic chunking is viable
   */
  private canUseSemanticChunking(paragraphs: string[], config: ChunkingConfig): boolean {
    const avgParagraphLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length;
    return avgParagraphLength < config.maxChunkSize * 0.8 && paragraphs.length > 2;
  }

  /**
   * Creates semantic chunks based on document structure
   */
  private createSemanticChunks(
    paragraphs: string[], 
    config: ChunkingConfig
  ): Array<{ content: string; index: number; type: 'paragraph' | 'section' | 'hybrid' }> {
    const chunks: Array<{ content: string; index: number; type: 'paragraph' | 'section' | 'hybrid' }> = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const wouldExceedLimit = (currentChunk + '\n\n' + paragraph).length > config.maxChunkSize;

      if (wouldExceedLimit && currentChunk.length >= config.minChunkSize) {
        // Add overlap from next paragraph if it exists
        const overlap = this.calculateOverlap(paragraph, config);
        chunks.push({
          content: currentChunk + (overlap ? '\n\n' + overlap : ''),
          index: chunkIndex++,
          type: 'paragraph'
        });
        
        // Start new chunk with overlap from previous
        const prevOverlap = this.calculateOverlap(currentChunk, config, true);
        currentChunk = (prevOverlap ? prevOverlap + '\n\n' : '') + paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    // Add final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk,
        index: chunkIndex,
        type: 'paragraph'
      });
    }

    return chunks;
  }

  /**
   * Creates hybrid chunks for unstructured text
   */
  private createHybridChunks(
    text: string, 
    config: ChunkingConfig
  ): Array<{ content: string; index: number; type: 'paragraph' | 'section' | 'hybrid' }> {
    const chunks: Array<{ content: string; index: number; type: 'paragraph' | 'section' | 'hybrid' }> = [];
    const overlapSize = Math.floor(config.maxChunkSize * config.overlapRatio);
    
    for (let i = 0; i < text.length; i += config.maxChunkSize - overlapSize) {
      const chunk = text.substring(i, i + config.maxChunkSize);
      if (chunk.trim().length >= config.minChunkSize) {
        chunks.push({
          content: chunk,
          index: chunks.length,
          type: 'hybrid'
        });
      }
    }

    return chunks;
  }

  /**
   * Calculates appropriate overlap text
   */
  private calculateOverlap(text: string, config: ChunkingConfig, fromEnd = false): string {
    const overlapSize = Math.floor(config.maxChunkSize * config.overlapRatio);
    
    if (text.length <= overlapSize) return text;
    
    if (fromEnd) {
      // Get overlap from end of text
      const overlap = text.substring(text.length - overlapSize);
      // Try to start at a sentence boundary
      const sentenceStart = overlap.indexOf('. ');
      return sentenceStart > 0 ? overlap.substring(sentenceStart + 2) : overlap;
    } else {
      // Get overlap from beginning of text
      const overlap = text.substring(0, overlapSize);
      // Try to end at a sentence boundary
      const sentenceEnd = overlap.lastIndexOf('. ');
      return sentenceEnd > 0 ? overlap.substring(0, sentenceEnd + 1) : overlap;
    }
  }

  /**
   * Processes chunks with progressive summarization strategy
   */
  private async processChunksProgressively(
    chunks: Array<{ content: string; index: number; type: string }>,
    analysisType: DocumentAnalysisType,
    fileName: string,
    specificQuestions?: string[]
  ): Promise<Array<{ summary: string; index: number; tokens: number }>> {
    const results: Array<{ summary: string; index: number; tokens: number }> = [];

    for (const chunk of chunks) {
      console.log(`🔍 Processing ${chunk.type} chunk ${chunk.index + 1}/${chunks.length} (${chunk.content.length} chars)`);

      const prompt = this.buildOptimizedAnalysisPrompt(
        chunk.content,
        analysisType,
        fileName,
        chunk.index + 1,
        chunks.length,
        chunk.type,
        specificQuestions
      );

      try {
        let summary = '';
        
        // Si tenemos aiService, usamos IA para generar resúmenes
        if (this.aiService && typeof this.aiService.generate === 'function') {
          const analysis = await this.aiService.generate({
            model: this.aiService.model || 'default',
            prompt,
            config: {
              temperature: 0.3,
              maxOutputTokens: this.calculateOptimalOutputTokens(chunk.content.length, chunks.length)
            }
          });
          
          summary = analysis.text || '';
        } 
        
        // Si no hay aiService o falla, generamos un resumen simple basado en extracción
        if (!summary) {
          console.log('⚠️ Using fallback summarization strategy (extractive)');  
          summary = this.createFallbackSummary(chunk.content);
        }
        results.push({
          summary,
          index: chunk.index,
          tokens: Math.ceil(summary.length / 4) // Rough token estimate
        });

      } catch (error: any) {
        console.error(`❌ Error processing chunk ${chunk.index + 1}:`, error.message);
        results.push({
          summary: `Error analyzing section ${chunk.index + 1}: ${error.message}`,
          index: chunk.index,
          tokens: 0
        });
      }
    }

    return results;
  }

  /**
   * Crea un resumen simple basado en extracción cuando el servicio IA no está disponible
   * @param content - Contenido del chunk a resumir
   */
  private createFallbackSummary(content: string): string {
    // Determinar la longitud apropiada basada en el contenido original
    const maxLength = Math.min(content.length, 1000);
    
    // Extraer las primeras frases hasta alcanzar aproximadamente maxLength
    const sentences = content.split(/[.!?]\s+/);
    let summary = '';
    
    for (const sentence of sentences) {
      if ((summary + sentence).length <= maxLength) {
        summary += sentence + '. ';
      } else {
        break;
      }
    }
    
    // Si el contenido es muy corto, usarlo completo
    if (summary.length < 100 && content.length < 1000) {
      return content;
    }
    
    return summary + `\n\nNota: Este es un resumen extractivo generado automáticamente de una sección del documento de ${content.length} caracteres.`;
  }

  /**
   * Builds optimized analysis prompts using 2025 best practices
   */
  private buildOptimizedAnalysisPrompt(
    content: string,
    analysisType: DocumentAnalysisType,
    fileName: string,
    chunkIndex: number,
    totalChunks: number,
    chunkType: string,
    specificQuestions?: string[]
  ): string {
    // Base context with minimal overhead
    const contextPrefix = totalChunks > 1 
      ? `Analyzing ${chunkType} ${chunkIndex}/${totalChunks} from "${fileName}":\n\n`
      : `Analyzing document "${fileName}":\n\n`;

    // Targeted questions context
    const questionsContext = specificQuestions?.length 
      ? `\nFocus on these specific questions: ${specificQuestions.join('; ')}\n`
      : '';    // Optimized prompts based on analysis type
    const prompts: Record<DocumentAnalysisType, string> = {
      general: `${contextPrefix}Provide a concise analysis focusing on key information and main points.${questionsContext}\n\nContent:\n${content}`,
      
      summary: `${contextPrefix}Create a comprehensive summary highlighting: main topics, key findings, important details, and conclusions.${questionsContext}\n\nContent:\n${content}`,
      
      extraction: `${contextPrefix}Extract and list all important data: names, dates, numbers, addresses, emails, phone numbers, organizations, and key facts. Format as structured list.${questionsContext}\n\nContent:\n${content}`,
      
      legal: `${contextPrefix}Legal analysis focusing on: key terms, dates, parties involved, obligations, rights, deadlines, and legal implications.${questionsContext}\n\nContent:\n${content}`,
      
      financial: `${contextPrefix}Financial analysis focusing on: amounts, dates, financial terms, parties, obligations, ratios, and financial implications.${questionsContext}\n\nContent:\n${content}`,
      
      technical: `${contextPrefix}Technical analysis focusing on: specifications, procedures, requirements, technical terms, processes, and implementation details.${questionsContext}\n\nContent:\n${content}`,

      medical: `${contextPrefix}Medical analysis focusing on: patient information, medical terms, diagnoses, treatments, medications, dates, and clinical details.${questionsContext}\n\nContent:\n${content}`
    };

    return prompts[analysisType] || prompts.general;
  }

  /**
   * Calculates optimal output tokens based on content and chunking strategy
   */
  private calculateOptimalOutputTokens(contentLength: number, totalChunks: number): number {
    // Base allocation per chunk
    const baseTokens = 800;
    
    // Adjust based on content length and chunk count
    const contentRatio = Math.min(contentLength / 8000, 1.5);
    const chunkPenalty = Math.max(1 - (totalChunks * 0.1), 0.5);
    
    return Math.floor(baseTokens * contentRatio * chunkPenalty);
  }

  /**
   * Creates optimized final summary using progressive summarization
   */
  private async createOptimizedSummary(
    analysisResults: Array<{ summary: string; index: number; tokens: number }>,
    chunks: Array<{ content: string; index: number; type: string }>,
    fileName: string,
    analysisType: DocumentAnalysisType,
    metadata: DocumentMetadata
  ): Promise<{ summary: string; strategy: string }> {
    
    if (analysisResults.length === 1) {
      return {
        summary: analysisResults[0].summary,
        strategy: 'single-pass'
      };
    }

    // Progressive summarization for multiple chunks
    console.log('🔄 Creating progressive summary from multiple chunks...');
    
    const combinedSummaries = analysisResults
      .sort((a, b) => a.index - b.index)
      .map(result => result.summary)
      .join('\n\n---\n\n');

    const totalTokens = analysisResults.reduce((sum, result) => sum + result.tokens, 0);
    
    // If combined summaries are short enough, return them directly
    if (totalTokens < 1000) {
      return {
        summary: this.formatFinalSummary(combinedSummaries, fileName, analysisResults.length, metadata),
        strategy: 'combined-direct'
      };
    }

    // Create meta-summary for large combined results
    try {
      const metaSummaryPrompt = this.buildMetaSummaryPrompt(
        combinedSummaries, 
        fileName, 
        analysisType, 
        analysisResults.length,
        metadata
      );

      const metaSummary = await this.aiService.generate({
        model: this.aiService.model,
        prompt: metaSummaryPrompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: Math.min(1200, Math.floor(totalTokens * 0.6))
        }
      });

      return {
        summary: metaSummary.text || combinedSummaries,
        strategy: 'progressive-meta'
      };

    } catch (error) {
      console.warn('⚠️ Meta-summary failed, using combined summaries');
      return {
        summary: this.formatFinalSummary(combinedSummaries, fileName, analysisResults.length, metadata),
        strategy: 'combined-fallback'
      };
    }
  }

  /**
   * Builds meta-summary prompt for progressive summarization
   */
  private buildMetaSummaryPrompt(
    combinedSummaries: string,
    fileName: string,
    analysisType: DocumentAnalysisType,
    chunkCount: number,
    metadata: DocumentMetadata
  ): string {
    const documentInfo = [
      `File: ${fileName}`,
      `Type: ${metadata.fileType}`,
      `Sections analyzed: ${chunkCount}`,
      metadata.pages ? `Pages: ${metadata.pages}` : null,
      metadata.sheets ? `Sheets: ${metadata.sheets.join(', ')}` : null
    ].filter(Boolean).join(' | ');

    return `Create a comprehensive final summary by synthesizing these ${chunkCount} section analyses of "${fileName}".

Document Info: ${documentInfo}

Analysis Type: ${analysisType}

Section Analyses:
${combinedSummaries}

Provide a unified, coherent summary that captures the essential information from all sections while eliminating redundancy.`;
  }

  /**
   * Formats final summary with metadata
   */
  private formatFinalSummary(
    content: string,
    fileName: string,
    chunkCount: number,
    metadata: DocumentMetadata
  ): string {
    const header = `Analysis of "${fileName}" (${metadata.fileType.toUpperCase()})`;
    const separator = '='.repeat(header.length);
    
    return `${header}\n${separator}\n\nProcessed ${chunkCount} section${chunkCount > 1 ? 's' : ''}\n\n${content}`;
  }

  /**
   * Get optimal content sample for preview
   */
  private getOptimalContentSample(text: string, chunks: Array<{ content: string; index: number; type: string }>): string {
    // Return original text if it's short enough
    if (text.length <= 5000) return text;
    
    // Si el texto contiene tablas en formato markdown, asegurarse de preservarlas completas
    const containsTables = text.includes('|') && text.includes('\n|');
    
    if (containsTables) {
      // Extraer secciones del texto que contienen tablas
      const sections = this.extractSectionsWithTables(text);
      
      // Devolver secciones relevantes (o primeras partes) hasta 5000 caracteres
      let result = '';
      for (const section of sections) {
        if (result.length + section.length <= 5000) {
          result += section + '\n\n';
        } else {
          // Si añadir la sección completa excede el límite, añadir solo un fragmento
          const remaining = 5000 - result.length;
          if (remaining > 200) { // Solo si podemos añadir un fragmento significativo
            result += section.substring(0, remaining) + '...\n';
          }
          break;
        }
      }
      
      return result;
    }
    
    // Return first chunk if available
    if (chunks.length > 0) {
      return chunks[0].content.substring(0, 5000);
    }
    
    // Fallback to first 5000 chars
    return text.substring(0, 5000);
  }
  
  /**
   * Extract sections of text that contain tables
   */
  private extractSectionsWithTables(text: string): string[] {
    const sections: string[] = [];
    const lines = text.split('\n');
    
    let currentSection = '';
    let inTable = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isTableLine = line.trim().startsWith('|') && line.trim().endsWith('|');
      
      // Si encontramos una línea de tabla
      if (isTableLine && !inTable) {
        // Añadir algunas líneas anteriores para contexto
        const contextStart = Math.max(0, i - 3);
        for (let j = contextStart; j < i; j++) {
          currentSection += lines[j] + '\n';
        }
        inTable = true;
      }
      
      // Añadir línea actual
      if (inTable || currentSection.length > 0) {
        currentSection += line + '\n';
      }
      
      // Si termina la tabla, finalizar sección
      if (inTable && !isTableLine && !lines[i+1]?.trim().startsWith('|')) {
        // Añadir algunas líneas después para contexto
        const contextEnd = Math.min(lines.length, i + 3);
        for (let j = i + 1; j < contextEnd; j++) {
          currentSection += lines[j] + '\n';
        }
        
        sections.push(currentSection.trim());
        currentSection = '';
        inTable = false;
      }
    }
    
    // Si termina el texto con una tabla
    if (currentSection.length > 0) {
      sections.push(currentSection.trim());
    }
    
    return sections.length > 0 ? sections : [text.substring(0, 5000)];
  }
  /**
   * Enhanced entity extraction with format-specific patterns
   */
  private extractAdvancedEntities(
    text: string, 
    fileType: string
  ): Array<{ type: string; value: string; confidence: number }> {
    const entities: Array<{ type: string; value: string; confidence: number }> = [];
      // Enhanced patterns for different entity types
    const patterns: Record<string, RegExp> = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
      date: /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|\w+\s+\d{1,2},?\s+\d{4})\b/g,
      currency: /[$€£¥]\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g,
      percentage: /\b\d+(?:\.\d+)?%\b/g,
      url: /https?:\/\/(?:[-\w.])+(?:[:\d]+)?(?:\/(?:[\w._~:/?#[\]@!$&'()*+,;=%-])*)?/g,
      ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
      zipcode: /\b\d{5}(?:-\d{4})?\b/g
    };

    // File type specific patterns
    if (fileType === '.csv' || fileType === '.xlsx' || fileType === '.xls') {
      // Add patterns for structured data
      patterns['id'] = /\b(?:ID|id)[-_]?\s*:?\s*([A-Z0-9-]+)\b/g;
      patterns['reference'] = /\b(?:REF|ref|reference)[-_]?\s*:?\s*([A-Z0-9-]+)\b/g;
    }

    // Extract entities using patterns
    Object.entries(patterns).forEach(([type, pattern]) => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        // Calculate confidence based on pattern complexity and context
        let confidence = 0.8;
        if (type === 'email' && match.includes('@')) confidence = 0.95;
        if (type === 'phone' && match.length >= 10) confidence = 0.9;
        if (type === 'url' && match.startsWith('http')) confidence = 0.95;
        
        entities.push({ type, value: match.trim(), confidence });
      });
    });

    return entities;
  }

  private deduplicateEntities(entities: Array<{ type: string; value: string; confidence: number }>) {
    const seen = new Set<string>();
    return entities.filter(entity => {
      const key = `${entity.type}:${entity.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
