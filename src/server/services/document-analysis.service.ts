/**
 * Document Analysis Service
 * Servicio para análisis de documentos PDF con soporte para chunking
 */

import pdfParse from 'pdf-parse';
import type { AnalyzeDocumentInput, AnalyzeDocumentOutput, DocumentAnalysisType, DocumentAnalysisResult } from '../types';

export class DocumentAnalysisService {
  constructor(private readonly aiService: any) {}

  async analyzeDocument(
    documentBase64: string,
    fileName: string,
    analysisType: DocumentAnalysisType = 'general',
    specificQuestions?: string[],
    maxLength?: number,
    chunkSize?: number
  ): Promise<DocumentAnalysisResult> {
    console.log('🔧 Service Execution: analyzeDocument', {
      fileName,
      analysisType,
      base64Length: documentBase64.length,
      base64Preview: documentBase64.substring(0, 100) + '...'
    });
    
    try {
      // Decode base64 and parse PDF
      const buffer = Buffer.from(documentBase64, 'base64');
      const pdfData = await pdfParse(buffer);
      
      if (!pdfData.text || pdfData.text.trim().length === 0) {
        throw new Error('No se pudo extraer texto del PDF. El documento podría estar protegido o ser una imagen.');
      }

      console.log('📄 PDF parsed successfully:', {
        pages: pdfData.numpages,
        textLength: pdfData.text.length,
        fileName
      });

      const wordCount = pdfData.text.split(/\s+/).length;
      const totalCharacters = pdfData.text.length;

      // Implement chunking for large documents
      const chunks: string[] = [];
      if (totalCharacters > 15000) {
        console.log('📊 Document requires chunking:', {
          totalCharacters,
          chunkSize: 15000,
          estimatedChunks: Math.ceil(totalCharacters / 15000)
        });

        const overlapSize = Math.floor(15000 * 0.1);
        for (let i = 0; i < totalCharacters; i += 15000 - overlapSize) {
          const chunk = pdfData.text.substring(i, i + 15000);
          if (chunk.trim().length > 0) {
            chunks.push(chunk);
          }
        }
      } else {
        chunks.push(pdfData.text);
      }

      console.log('📊 Document chunking complete:', {
        totalChunks: chunks.length,
        avgChunkSize: Math.round(chunks.reduce((sum, chunk) => sum + chunk.length, 0) / chunks.length)
      });

      // Process each chunk and combine results
      let combinedAnalysis = '';
      let allEntities: Array<{ type: string; value: string; confidence: number }> = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🔍 Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

        const chunkAnalysisPrompt = this.buildAnalysisPrompt(
          chunk, 
          analysisType, 
          fileName, 
          i + 1, 
          chunks.length, 
          specificQuestions
        );

        const chunkAnalysis = await this.aiService.generate({
          model: this.aiService.model,
          prompt: chunkAnalysisPrompt,
          config: {
            temperature: 0.3,
            maxOutputTokens: Math.min(1000, Math.floor(15000 / chunks.length))
          }
        });

        // Extract entities from this chunk
        if (['general', 'summary', 'extraction'].includes(analysisType)) {
          const chunkEntities = this.extractEntities(chunk);
          allEntities.push(...chunkEntities);
        }

        combinedAnalysis += (chunks.length > 1 ? `\n\n**PARTE ${i + 1}:**\n` : '') + 
                          (chunkAnalysis.text || 'Error en el análisis de esta sección.');
      }

      // Create final summary for multiple chunks
      let finalSummary = combinedAnalysis;
      if (chunks.length > 1) {
        console.log('🔄 Creating final summary from multiple chunks...');
        finalSummary = await this.createFinalSummary(combinedAnalysis, fileName, chunks.length);
      }

      const contentToReturn = chunks.length > 1 
        ? pdfData.text.substring(0, Math.min(15000, 5000))
        : pdfData.text.substring(0, 15000);

      return {
        success: true,
        content: contentToReturn,
        summary: finalSummary,
        metadata: {
          pages: pdfData.numpages,
          wordCount: wordCount,
          fileName: fileName,
          fileSize: buffer.length,
          processedAt: new Date().toISOString(),
          chunks: chunks.length,
          totalCharacters: totalCharacters
        },
        entities: allEntities.length > 0 ? this.deduplicateEntities(allEntities) : undefined
      };

    } catch (error: any) {
      console.error('❌ Document Analysis Error:', error.message);
      
      return {
        success: false,
        content: '',
        summary: `Error al analizar el documento: ${error.message}`,
        metadata: {
          wordCount: 0,
          fileName: fileName,
          fileSize: 0,
          processedAt: new Date().toISOString()
        },
        error: error.message
      };
    }
  }

  private buildAnalysisPrompt(
    chunk: string, 
    analysisType: DocumentAnalysisType, 
    fileName: string, 
    chunkIndex: number, 
    totalChunks: number,
    specificQuestions?: string[]
  ): string {
    const chunkPrefix = totalChunks > 1 ? `Parte ${chunkIndex}/${totalChunks} del documento "${fileName}":\n\n` : '';
    const questionsContext = specificQuestions?.length ? 
      `\n\nPreguntas específicas a responder: ${specificQuestions.join(', ')}` : '';
    
    switch (analysisType) {
      case 'general':
        return `${chunkPrefix}Analiza esta ${totalChunks > 1 ? 'parte del' : ''} documento PDF y proporciona un resumen general.${questionsContext}\n\nContenido:\n\n${chunk}`;
      
      case 'summary':
        return `${chunkPrefix}Analiza esta ${totalChunks > 1 ? 'parte del' : ''} documento PDF y proporciona un resumen comprensivo. ${totalChunks > 1 ? 'Enfócate en los puntos principales de esta sección.' : 'Incluye los puntos principales, temas importantes y conclusiones clave.'}${questionsContext}\n\nContenido:\n\n${chunk}`;
      
      case 'extraction':
        return `${chunkPrefix}Extrae y lista toda la información importante de esta ${totalChunks > 1 ? 'parte del' : ''} documento PDF: nombres, fechas, números, datos clave, direcciones, teléfonos, emails, etc.${questionsContext}\n\nContenido:\n\n${chunk}`;
      
      case 'legal':
        return `${chunkPrefix}Analiza esta ${totalChunks > 1 ? 'parte del' : ''} documento PDF desde una perspectiva legal. Identifica términos clave, fechas importantes, nombres de personas o entidades involucradas, y cualquier otra información relevante.${questionsContext}\n\nContenido:\n\n${chunk}`;
      
      case 'financial':
        return `${chunkPrefix}Analiza esta ${totalChunks > 1 ? 'parte del' : ''} documento PDF desde una perspectiva financiera. Identifica números clave, fechas importantes, nombres de personas o entidades involucradas, y cualquier otra información relevante.${questionsContext}\n\nContenido:\n\n${chunk}`;
      
      case 'technical':
        return `${chunkPrefix}Analiza esta ${totalChunks > 1 ? 'parte del' : ''} documento PDF desde una perspectiva técnica. Identifica términos clave, fechas importantes, nombres de personas o entidades involucradas, y cualquier otra información relevante.${questionsContext}\n\nContenido:\n\n${chunk}`;
      
      default:
        return `${chunkPrefix}Analiza este documento y proporciona información relevante.${questionsContext}\n\nContenido:\n\n${chunk}`;
    }
  }

  private extractEntities(text: string): Array<{ type: string; value: string; confidence: number }> {
    const entities: Array<{ type: string; value: string; confidence: number }> = [];
    
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    const datePattern = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g;

    const emails = text.match(emailPattern) || [];
    const phones = text.match(phonePattern) || [];
    const dates = text.match(datePattern) || [];

    emails.forEach(email => entities.push({ type: 'email', value: email, confidence: 0.9 }));
    phones.forEach(phone => entities.push({ type: 'phone', value: phone, confidence: 0.8 }));
    dates.forEach(date => entities.push({ type: 'date', value: date, confidence: 0.7 }));

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

  private async createFinalSummary(combinedAnalysis: string, fileName: string, totalChunks: number): Promise<string> {
    const summaryPrompt = `Basándote en el siguiente análisis dividido en ${totalChunks} partes del documento "${fileName}", crea un resumen coherente y comprensivo que integre toda la información:

${combinedAnalysis}

Proporciona un resumen final unificado que capture los puntos principales de todo el documento.`;

    try {
      const finalSummaryResult = await this.aiService.generate({
        model: this.aiService.model,
        prompt: summaryPrompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: Math.min(1500, Math.floor(15000 / 2))
        }
      });

      return finalSummaryResult.text || combinedAnalysis;
    } catch (error) {
      console.warn('⚠️ Failed to create final summary, using combined analysis');
      return combinedAnalysis;
    }
  }
}
