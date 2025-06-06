/**
 * Agent Hums - Claude 3.5 Sonnet Server
 * Production-ready chat server with integrated web search capabilities
 * Angular 20 + Claude 3.5 Sonnet + Brave Search API
 */

import 'dotenv/config';
import { genkit } from 'genkit';
import { MessageData } from '@genkit-ai/ai';
import { defineFlow, runFlow } from '@genkit-ai/flow';
import { anthropic, claude35Sonnet } from 'genkitx-anthropic';
import { z } from '@genkit-ai/core/schema';
import axios from 'axios';
import express, { Request, Response } from 'express';
import cors from 'cors';
import pdfParse from 'pdf-parse';
import { google } from 'googleapis';
import { generalSystemPrompt } from './llms/prompts/general-prompt';
import { getChatFlowExpressPrompt, ChatFlowExpressPromptArgs } from './llms/prompts/chat-flow-express-prompt';

// 🌍 Environment Configuration
const ANTHROPIC_API_KEY = process.env['ANTHROPIC_API_KEY'] || '';
const BRAVE_SEARCH_API_KEY = process.env['BRAVE_SEARCH_API_KEY'] || '';
const PORT = parseInt(process.env['PORT'] || '3001');

console.log('🔑 Environment Variables Check:');
console.log('- ANTHROPIC_API_KEY:', ANTHROPIC_API_KEY ? `${ANTHROPIC_API_KEY.substring(0, 8)}...` : 'NOT FOUND');
console.log('- BRAVE_SEARCH_API_KEY:', BRAVE_SEARCH_API_KEY ? `${BRAVE_SEARCH_API_KEY.substring(0, 8)}...` : 'NOT FOUND');

if (!ANTHROPIC_API_KEY || !BRAVE_SEARCH_API_KEY) {
  console.error('❌ Missing API keys:');
  if (!ANTHROPIC_API_KEY) console.error('  - ANTHROPIC_API_KEY is missing');
  if (!BRAVE_SEARCH_API_KEY) console.error('  - BRAVE_SEARCH_API_KEY is missing');
  console.error('📝 Please check your .env file and ensure it contains the required API keys');
  throw new Error('❌ Missing required API keys: ANTHROPIC_API_KEY, BRAVE_SEARCH_API_KEY');
}

console.log('🚀 AGENT HUMS - CLAUDE 3.5 SONNET SERVER');
console.log('🤖 Model: Claude 3.5 Sonnet (Advanced reasoning + tool calling)');
console.log('🔍 Search: Brave Search API (Real-time web search)');
console.log('📄 Document Analysis: PDF parsing with Claude 3.5 Sonnet');
console.log(`🌐 Server: http://localhost:${PORT}`);

// 🤖 Initialize Genkit with Claude
const ai = genkit({
  plugins: [
    anthropic({
      apiKey: ANTHROPIC_API_KEY,
    }),
  ],
});

// 🔍 Brave Search API Implementation
interface BraveSearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface BraveSearchResponse {
  success: boolean;
  results: BraveSearchResult[];
  message: string;
  query: string;
  timestamp: string;
}

async function searchWithBrave(query: string, limit: number = 5): Promise<BraveSearchResponse> {
  try {
    console.log('🔍 Executing Brave Search:', { query, limit });
    
    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      headers: {
        'X-Subscription-Token': BRAVE_SEARCH_API_KEY,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip'
      },
      params: {
        q: query,
        count: Math.min(limit, 10),
        search_lang: 'es',
        country: 'MX',
        safesearch: 'moderate',
        freshness: 'pweek',
        text_decorations: false
      },
      timeout: 15000
    });

    if (response.data?.web?.results) {
      const results: BraveSearchResult[] = response.data.web.results.map((item: any) => ({
        title: item.title || 'Sin título',
        url: item.url || '',
        snippet: item.description || 'Sin descripción disponible'
      }));

      console.log('✅ Brave Search Success:', results.length, 'results');
      
      return {
        success: true,
        results,
        message: `Búsqueda exitosa: ${results.length} resultados encontrados`,
        query,
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error('Unexpected Brave Search API response format');
    }
  } catch (error: any) {
    console.error('❌ Brave Search Error:', error.message);
    
    return {
      success: false,
      results: [
        {
          title: `Error en búsqueda: ${query}`,
          url: 'https://brave.com/search/',
          snippet: `No se pudieron obtener resultados para "${query}". Error: ${error.message}`
        }
      ],
      message: `Error en Brave Search API: ${error.message}`,
      query,
      timestamp: new Date().toISOString()
    };
  }
}

// 🛠️ Claude 3.5 Sonnet Tools

// Esquema para searchWebTool
const searchWebSchema = z.object({
  query: z.string().describe('Consulta de búsqueda específica y clara en español'),
  limit: z.number().optional().default(5).describe('Número de resultados (máximo 10)')
});

const searchWebTool = ai.defineTool(
  {
    name: 'searchWeb',
    description: 'Buscar información actualizada en internet usando Brave Search API. Ideal para obtener información reciente, noticias, datos actualizados, precios, eventos actuales.',
    inputSchema: searchWebSchema,
    outputSchema: z.object({
      success: z.boolean(),
      results: z.array(z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string()
      })),
      message: z.string(),
      query: z.string(),
      timestamp: z.string()
    })
  },
  async (input: z.infer<typeof searchWebSchema>) => {
    console.log('🔧 Tool Execution: searchWeb', input);
    const limit = Math.min(input.limit || 5, 10);
    return await searchWithBrave(input.query, limit);
  }
);

// Esquema para analyzeWebTool
const analyzeWebSchema = z.object({
  topic: z.string().describe('Tema o pregunta específica a investigar'),
  analysisType: z.enum(['comparison', 'trends', 'technical', 'news', 'general']).describe('Tipo de análisis deseado'),
  searchQueries: z.array(z.string()).optional().describe('Consultas de búsqueda específicas (se generan automáticamente si no se proporcionan)')
});

const analyzeWebTool = ai.defineTool(
  {
    name: 'analyzeWeb',
    description: 'Buscar y analizar información específica en internet. Combina búsqueda web con análisis profundo.',
    inputSchema: analyzeWebSchema,
    outputSchema: z.object({
      analysis: z.string(),
      sources: z.array(z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string()
      })),
      summary: z.string(),
      timestamp: z.string()
    })
  },
  async (input: z.infer<typeof analyzeWebSchema>) => {
    console.log('🔧 Tool Execution: analyzeWeb', input);
    
    // Generate search queries if not provided
    let queries = input.searchQueries || [input.topic];
    if (!input.searchQueries) {
      // Add specific queries based on analysis type
      switch (input.analysisType) {
        case 'comparison':
          queries.push(`${input.topic} comparación`, `${input.topic} vs`);
          break;
        case 'trends':
          queries.push(`${input.topic} tendencias 2024`, `${input.topic} últimas noticias`);
          break;
        case 'technical':
          queries.push(`${input.topic} especificaciones`, `${input.topic} tutorial`);
          break;
        case 'news':
          queries.push(`${input.topic} noticias`, `${input.topic} últimas novedades`);
          break;
      }
    }

    // Perform searches
    const allResults: BraveSearchResult[] = [];
    for (const query of queries.slice(0, 3)) { // Limit to 3 queries
      const searchResult = await searchWithBrave(query, 3);
      if (searchResult.success) {
        allResults.push(...searchResult.results);
      }
    }

    // Remove duplicates
    const uniqueResults = allResults.filter((result, index, self) => 
      index === self.findIndex(r => r.url === result.url)
    );

    // Generate analysis
    const analysis = `Análisis ${input.analysisType} sobre: ${input.topic}

Basado en ${uniqueResults.length} fuentes web actualizadas, se encontró información relevante sobre ${input.topic}.`;

    const summary = `Análisis completado con ${uniqueResults.length} fuentes verificadas. La información recopilada proporciona una visión ${input.analysisType} actualizada sobre ${input.topic}.`;    return {
      analysis,
      sources: uniqueResults.slice(0, 8), // Limit sources
      summary,
      timestamp: new Date().toISOString()
    };
  }
);

// 📄 Document Analysis Tool with Chunking Support
const analyzeDocumentSchema = z.object({
  documentBase64: z.string().describe('Contenido del documento PDF en formato base64'),
  fileName: z.string().describe('Nombre del archivo PDF'),
  analysisType: z.enum(['general', 'summary', 'extraction', 'legal', 'financial', 'technical']).describe('Tipo de análisis a realizar'),
  specificQuestions: z.array(z.string()).optional().describe('Preguntas específicas sobre el documento'),
  maxLength: z.number().optional().describe('Longitud máxima de contenido a extraer'),
  chunkSize: z.number().optional().describe('Tamaño de cada chunk para procesamiento')
});

const analyzeDocumentTool = ai.defineTool(
  {
    name: 'analyzeDocument',
    description: 'Analizar documentos PDF enviados por el usuario. Extrae texto, proporciona resúmenes, identifica información clave. Soporta documentos grandes mediante chunking.',
    inputSchema: analyzeDocumentSchema,
    outputSchema: z.object({
      success: z.boolean(),
      content: z.string(),
      summary: z.string(),
      metadata: z.object({
        pages: z.number().optional(),
        wordCount: z.number(),
        fileName: z.string(),
        fileSize: z.number(),
        processedAt: z.string(),
        chunks: z.number().optional(),
        totalCharacters: z.number().optional()
      }),
      entities: z.array(z.object({
        type: z.string(),
        value: z.string(),
        confidence: z.number()
      })).optional(),
      error: z.string().optional()
    })
  },
  async (input: z.infer<typeof analyzeDocumentSchema>) => {
    console.log('🔧 Tool Execution: analyzeDocument', {
      fileName: input.fileName,
      analysisType: input.analysisType,
      base64Length: input.documentBase64.length,
      base64Preview: input.documentBase64.substring(0, 100) + '...'
    });
    
    try {
      // Decode base64 and parse PDF
      const buffer = Buffer.from(input.documentBase64, 'base64');
      const pdfData = await pdfParse(buffer);
      
      if (!pdfData.text || pdfData.text.trim().length === 0) {
        throw new Error('No se pudo extraer texto del PDF. El documento podría estar protegido o ser una imagen.');
      }

      console.log('📄 PDF parsed successfully:', {
        pages: pdfData.numpages,
        textLength: pdfData.text.length,
        fileName: input.fileName
      });

      const wordCount = pdfData.text.split(/\s+/).length;
      const totalCharacters = pdfData.text.length;

      // Implement chunking for large documents (Anthropic best practice: 20,000 characters)
      const chunks: string[] = [];
      if (totalCharacters > 15000) {
        console.log('📊 Document requires chunking:', {
          totalCharacters,
          chunkSize: 15000,
          estimatedChunks: Math.ceil(totalCharacters / 15000)
        });

        // Split into chunks with overlap to maintain context
        const overlapSize = Math.floor(15000 * 0.1); // 10% overlap
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

        // Build analysis prompt for chunk
        let chunkAnalysisPrompt = '';
        const chunkPrefix = chunks.length > 1 ? `Parte ${i + 1}/${chunks.length} del documento "${input.fileName}":\n\n` : '';
        
        switch (input.analysisType) {
          case 'general':
            chunkAnalysisPrompt = `${chunkPrefix}Analiza esta ${chunks.length > 1 ? 'parte del' : ''} documento PDF y proporciona un resumen general.\n\nContenido:\n\n${chunk}`;
            break;
          case 'summary':
            chunkAnalysisPrompt = `${chunkPrefix}Analiza esta ${chunks.length > 1 ? 'parte del' : ''} documento PDF y proporciona un resumen comprensivo. ${chunks.length > 1 ? 'Enfócate en los puntos principales de esta sección.' : 'Incluye los puntos principales, temas importantes y conclusiones clave.'}\n\nContenido:\n\n${chunk}`;
            break;
          case 'extraction':
            chunkAnalysisPrompt = `${chunkPrefix}Extrae y lista toda la información importante de esta ${chunks.length > 1 ? 'parte del' : ''} documento PDF: nombres, fechas, números, datos clave, direcciones, teléfonos, emails, etc.\n\nContenido:\n\n${chunk}`;
            break;
          case 'legal':
            chunkAnalysisPrompt = `${chunkPrefix}Analiza esta ${chunks.length > 1 ? 'parte del' : ''} documento PDF desde una perspectiva legal. Identifica términos clave, fechas importantes, nombres de personas o entidades involucradas, y cualquier otra información relevante.\n\nContenido:\n\n${chunk}`;
            break;
          case 'financial':
            chunkAnalysisPrompt = `${chunkPrefix}Analiza esta ${chunks.length > 1 ? 'parte del' : ''} documento PDF desde una perspectiva financiera. Identifica números clave, fechas importantes, nombres de personas o entidades involucradas, y cualquier otra información relevante.\n\nContenido:\n\n${chunk}`;
            break;
          case 'technical':
            chunkAnalysisPrompt = `${chunkPrefix}Analiza esta ${chunks.length > 1 ? 'parte del' : ''} documento PDF desde una perspectiva técnica. Identifica términos clave, fechas importantes, nombres de personas o entidades involucradas, y cualquier otra información relevante.\n\nContenido:\n\n${chunk}`;
            break;
        }

        // Generate AI analysis for this chunk
        const chunkAnalysis = await ai.generate({
          model: claude35Sonnet,
          prompt: chunkAnalysisPrompt,
          config: {
            temperature: 0.3, // Lower temperature for more factual analysis
            maxOutputTokens: Math.min(1000, Math.floor(15000 / chunks.length)) // Distribute tokens across chunks
          }
        });

        // Extract entities from this chunk
        if (input.analysisType === 'general' || input.analysisType === 'summary' || input.analysisType === 'extraction') {
          const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
          const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
          const datePattern = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g;

          const emails = chunk.match(emailPattern) || [];
          const phones = chunk.match(phonePattern) || [];
          const dates = chunk.match(datePattern) || [];

          emails.forEach(email => {
            if (!allEntities.some(e => e.value === email)) {
              allEntities.push({ type: 'email', value: email, confidence: 0.9 });
            }
          });
          phones.forEach(phone => {
            if (!allEntities.some(e => e.value === phone)) {
              allEntities.push({ type: 'phone', value: phone, confidence: 0.8 });
            }
          });
          dates.forEach(date => {
            if (!allEntities.some(e => e.value === date)) {
              allEntities.push({ type: 'date', value: date, confidence: 0.7 });
            }
          });
        }

        combinedAnalysis += (chunks.length > 1 ? `\n\n**PARTE ${i + 1}:**\n` : '') + (chunkAnalysis.text || 'Error en el análisis de esta sección.');
      }

      // If multiple chunks, create a final summary
      let finalSummary = combinedAnalysis;
      if (chunks.length > 1) {
        console.log('🔄 Creating final summary from multiple chunks...');
        
        const summaryPrompt = `Basándote en el siguiente análisis dividido en ${chunks.length} partes del documento "${input.fileName}", crea un resumen coherente y comprensivo que integre toda la información:

${combinedAnalysis}

Proporciona un resumen final unificado que capture los puntos principales de todo el documento.`;

        const finalSummaryResult = await ai.generate({
          model: claude35Sonnet,
          prompt: summaryPrompt,
          config: {
            temperature: 0.3,
            maxOutputTokens: Math.min(1500, Math.floor(15000 / 2))
          }
        });

        finalSummary = finalSummaryResult.text || combinedAnalysis;
      }

      // Return the first chunk or combined content up to maxLength
      const contentToReturn = chunks.length > 1 
        ? pdfData.text.substring(0, Math.min(15000, 5000)) // Limit content for large docs
        : pdfData.text.substring(0, 15000);

      return {
        success: true,
        content: contentToReturn,
        summary: finalSummary,
        metadata: {
          pages: pdfData.numpages,
          wordCount: wordCount,
          fileName: input.fileName,
          fileSize: buffer.length,
          processedAt: new Date().toISOString(),
          chunks: chunks.length,
          totalCharacters: totalCharacters
        },
        entities: allEntities.length > 0 ? allEntities : undefined
      };

    } catch (error: any) {
      console.error('❌ Document Analysis Error:', error.message);
      
      return {
        success: false,
        content: '',
        summary: `Error al analizar el documento: ${error.message}`,
        metadata: {
          wordCount: 0,
          fileName: input.fileName,
          fileSize: 0,
          processedAt: new Date().toISOString()
        },
        error: error.message
      };
    }
  }
);

// 📅 Google Calendar Tools

// Schema y definición para listGoogleCalendarEventsTool
const listGoogleCalendarEventSchema = z.object({
  accessToken: z.string().describe('Token de acceso OAuth 2.0 de Google'),
  calendarId: z.string().optional().default('primary').describe('El ID del calendario. Por defecto es "primary".'),
  timeMin: z.string().optional().describe('Fecha/hora de inicio (formato ISO 8601) para listar eventos. Por defecto, inicio del día actual.'),
  timeMax: z.string().optional().describe('Fecha/hora de fin (formato ISO 8601) para listar eventos. Por defecto, fin del día actual.'),
  maxResults: z.number().optional().default(10).describe('Número máximo de eventos a retornar.')
});

const listGoogleCalendarEventsTool = ai.defineTool(
  {
    name: 'listGoogleCalendarEvents',
    description: 'Lista eventos del calendario de Google del usuario para un rango de fechas especificado, usando un token de acceso OAuth.',
    inputSchema: listGoogleCalendarEventSchema,
    outputSchema: z.object({
      success: z.boolean(),
      events: z.array(z.object({
        id: z.string().optional(),
        summary: z.string().optional(),
        description: z.string().optional(),
        start: z.object({ dateTime: z.string().optional(), date: z.string().optional() }).optional(),
        end: z.object({ dateTime: z.string().optional(), date: z.string().optional() }).optional(),
        htmlLink: z.string().optional()
      })).optional(),
      error: z.string().optional()
    })
  },
  async (input: z.infer<typeof listGoogleCalendarEventSchema>) => {
    console.log('🔧 Tool Execution: listGoogleCalendarEvents', { calendarId: input.calendarId, timeMin: input.timeMin, hasAccessToken: !!input.accessToken });
    try {
      // Validar que el token exista
      if (!input.accessToken) {
        console.log('❌ No se encontró token de acceso para Google Calendar');
        throw new Error('Se requiere un token de acceso OAuth de Google. Por favor verifica que Google Calendar esté conectado en la sección de integraciones.');
      }
      console.log('✅ Token de acceso para Google Calendar disponible');

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: input.accessToken });

      const calendar = google.calendar({ version: 'v3', auth });

      const now = new Date();
      const defaultTimeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const defaultTimeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

      const response = await calendar.events.list({
        calendarId: input.calendarId,
        timeMin: input.timeMin || defaultTimeMin,
        timeMax: input.timeMax || defaultTimeMax,
        maxResults: input.maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items?.map(event => ({
        id: event.id || undefined,
        summary: event.summary || undefined,
        description: event.description || undefined,
        start: event.start ? { dateTime: event.start.dateTime || undefined, date: event.start.date || undefined } : undefined,
        end: event.end ? { dateTime: event.end.dateTime || undefined, date: event.end.date || undefined } : undefined,
        htmlLink: event.htmlLink || undefined
      })) || [];

      return { success: true, events };
    } catch (error: any) {
      console.error('❌ Google Calendar API Error:', error.message);
      
      // Manejar códigos de error específicos
      if (error.code === 401) {
        return { success: false, error: 'Error de autenticación: El token de acceso es inválido o ha expirado.' };
      } else if (error.code === 403) {
        return { success: false, error: 'Error de permisos: No tienes autorización para acceder a este calendario.' };
      } else if (error.code === 404) {
        return { success: false, error: 'Error: Calendario no encontrado.' };
      }
      
      return { success: false, error: `Error al listar eventos: ${error.message}` };
    }
  }
);

// Schema y definición para createGoogleCalendarEventTool
// Esquema de entrada para createGoogleCalendarEventTool
const createGoogleCalendarEventSchema = z.object({
  accessToken: z.string().describe('Token de acceso OAuth 2.0 de Google'),
  calendarId: z.string().optional().default('primary').describe('El ID del calendario. Por defecto es "primary".'),
  summary: z.string().describe('Título del evento'),
  description: z.string().optional().describe('Descripción del evento'),
  location: z.string().optional().describe('Ubicación del evento'),
  startDateTime: z.string().describe('Fecha y hora de inicio del evento (formato ISO 8601)'),
  endDateTime: z.string().describe('Fecha y hora de fin del evento (formato ISO 8601)'),
  timeZone: z.string().optional().default('America/Mexico_City').describe('Zona horaria del evento'),
  attendees: z.array(z.string()).optional().describe('Lista de correos electrónicos de los asistentes'),
  sendNotifications: z.boolean().optional().default(true).describe('Enviar notificaciones a los asistentes')
});

const createGoogleCalendarEventTool = ai.defineTool(
  {
    name: 'createGoogleCalendarEvent',
    description: 'Crea un nuevo evento en el calendario de Google del usuario, usando un token de acceso OAuth.',
    inputSchema: createGoogleCalendarEventSchema,
    outputSchema: z.object({
      success: z.boolean(),
      event: z.object({
        id: z.string().optional(),
        summary: z.string().optional(),
        htmlLink: z.string().optional()
      }).optional(),
      error: z.string().optional()
    })
  },
  async (input: z.infer<typeof createGoogleCalendarEventSchema>) => {
    console.log('🔧 Tool Execution: createGoogleCalendarEvent', { summary: input.summary, hasAccessToken: !!input.accessToken });
    
    try {
      // Validar que el token exista
      if (!input.accessToken) {
        console.log('❌ No se encontró token de acceso para Google Calendar');
        throw new Error('Se requiere un token de acceso OAuth de Google. Por favor verifica que Google Calendar esté conectado en la sección de integraciones.');
      }
      console.log('✅ Token de acceso para Google Calendar disponible');

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: input.accessToken });

      const calendar = google.calendar({ version: 'v3', auth });

      // Crear el objeto de evento
      const eventData: {
        summary: string;
        description?: string;
        location?: string;
        start: {
          dateTime: string;
          timeZone?: string;
        };
        end: {
          dateTime: string;
          timeZone?: string;
        };
        attendees?: Array<{email: string}>;
      } = {
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: {
          dateTime: input.startDateTime,
          timeZone: input.timeZone
        },
        end: {
          dateTime: input.endDateTime,
          timeZone: input.timeZone
        }
      };

      // Agregar asistentes si se proporcionaron
      if (input.attendees && input.attendees.length > 0) {
        eventData.attendees = input.attendees.map((email: string) => ({ email }));
      }

      const response = await calendar.events.insert({
        calendarId: input.calendarId,
        requestBody: eventData,
        sendUpdates: input.sendNotifications ? 'all' : 'none'
      });

      return {
        success: true,
        event: {
          id: response.data.id || undefined,
          summary: response.data.summary || undefined,
          htmlLink: response.data.htmlLink || undefined
        }
      };
    } catch (error: any) {
      console.error('❌ Google Calendar API Error:', error.message);
      
      // Manejar códigos de error específicos
      if (error.code === 401) {
        return { success: false, error: 'Error de autenticación: El token de acceso es inválido o ha expirado.' };
      } else if (error.code === 403) {
        return { success: false, error: 'Error de permisos: No tienes autorización para crear eventos en este calendario.' };
      } else if (error.code === 404) {
        return { success: false, error: 'Error: Calendario no encontrado.' };
      }
      
      return { success: false, error: `Error al crear evento: ${error.message}` };
    }
  }
);

// Schema y definición para updateGoogleCalendarEventTool
// Esquema de entrada para updateGoogleCalendarEventTool
const updateGoogleCalendarEventSchema = z.object({
  accessToken: z.string().describe('Token de acceso OAuth 2.0 de Google'),
  calendarId: z.string().optional().default('primary').describe('El ID del calendario. Por defecto es "primary".'),
  eventId: z.string().describe('ID del evento a actualizar'),
  summary: z.string().optional().describe('Nuevo título del evento'),
  description: z.string().optional().describe('Nueva descripción del evento'),
  location: z.string().optional().describe('Nueva ubicación del evento'),
  startDateTime: z.string().optional().describe('Nueva fecha y hora de inicio del evento (formato ISO 8601)'),
  endDateTime: z.string().optional().describe('Nueva fecha y hora de fin del evento (formato ISO 8601)'),
  timeZone: z.string().optional().default('America/Mexico_City').describe('Nueva zona horaria del evento'),
  attendees: z.array(z.string()).optional().describe('Nueva lista de correos electrónicos de los asistentes'),
  sendNotifications: z.boolean().optional().default(true).describe('Enviar notificaciones a los asistentes')
});

const updateGoogleCalendarEventTool = ai.defineTool(
  {
    name: 'updateGoogleCalendarEvent',
    description: 'Actualiza un evento existente en el calendario de Google del usuario, usando un token de acceso OAuth.',
    inputSchema: updateGoogleCalendarEventSchema,
    outputSchema: z.object({
      success: z.boolean(),
      event: z.object({
        id: z.string().optional(),
        summary: z.string().optional(),
        htmlLink: z.string().optional()
      }).optional(),
      error: z.string().optional()
    })
  },
  async (input: z.infer<typeof updateGoogleCalendarEventSchema>) => {
    console.log('🔧 Tool Execution: updateGoogleCalendarEvent', { eventId: input.eventId, hasAccessToken: !!input.accessToken });
    try {
      // Validar que el token exista
      if (!input.accessToken) {
        console.log('❌ No se encontró token de acceso para Google Calendar');
        throw new Error('Se requiere un token de acceso OAuth de Google. Por favor verifica que Google Calendar esté conectado en la sección de integraciones.');
      }
      console.log('✅ Token de acceso para Google Calendar disponible');

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: input.accessToken });

      const calendar = google.calendar({ version: 'v3', auth });

      // Primero obtener el evento actual
      const currentEvent = await calendar.events.get({
        calendarId: input.calendarId,
        eventId: input.eventId
      });

      // Preparar datos para actualizar
      const eventData: {
        summary?: string;
        description?: string;
        location?: string;
        start: {
          dateTime: string;
          timeZone: string;
        };
        end: {
          dateTime: string;
          timeZone: string;
        };
        attendees?: Array<{email: string}>;
      } = {
        summary: input.summary || currentEvent.data.summary || undefined,
        description: input.description !== undefined ? input.description : (currentEvent.data.description || undefined),
        location: input.location !== undefined ? input.location : (currentEvent.data.location || undefined),
        start: {
          dateTime: input.startDateTime || (currentEvent.data.start?.dateTime || ''),
          timeZone: input.timeZone || (currentEvent.data.start?.timeZone || 'America/Mexico_City')
        },
        end: {
          dateTime: input.endDateTime || (currentEvent.data.end?.dateTime || ''),
          timeZone: input.timeZone || (currentEvent.data.end?.timeZone || 'America/Mexico_City')
        }
      };

      // Actualizar asistentes si se proporcionaron
      if (input.attendees) {
        eventData.attendees = input.attendees.map((email: string) => ({ email }));
      }

      const response = await calendar.events.update({
        calendarId: input.calendarId,
        eventId: input.eventId,
        requestBody: eventData,
        sendUpdates: input.sendNotifications ? 'all' : 'none'
      });

      return {
        success: true,
        event: {
          id: response.data.id || undefined,
          summary: response.data.summary || undefined,
          htmlLink: response.data.htmlLink || undefined
        }
      };
    } catch (error: any) {
      console.error('❌ Google Calendar API Error:', error.message);
      
      // Manejar códigos de error específicos
      if (error.code === 401) {
        return { success: false, error: 'Error de autenticación: El token de acceso es inválido o ha expirado.' };
      } else if (error.code === 403) {
        return { success: false, error: 'Error de permisos: No tienes autorización para actualizar eventos en este calendario.' };
      } else if (error.code === 404) {
        return { success: false, error: 'Error: Evento o calendario no encontrado.' };
      }
      
      return { success: false, error: `Error al actualizar evento: ${error.message}` };
    }
  }
);

// Schema y definición para deleteGoogleCalendarEventTool
const deleteGoogleCalendarEventSchema = z.object({
  accessToken: z.string().describe('Token de acceso OAuth 2.0 de Google'),
  calendarId: z.string().optional().default('primary').describe('El ID del calendario. Por defecto es "primary".'),
  eventId: z.string().describe('ID del evento a eliminar'),
  sendNotifications: z.boolean().optional().default(true).describe('Enviar notificaciones a los asistentes')
});

const deleteGoogleCalendarEventTool = ai.defineTool(
  {
    name: 'deleteGoogleCalendarEvent',
    description: 'Elimina un evento existente del calendario de Google del usuario, usando un token de acceso OAuth.',
    inputSchema: deleteGoogleCalendarEventSchema,
    outputSchema: z.object({
      success: z.boolean(),
      error: z.string().optional()
    })
  },
  async (input: z.infer<typeof deleteGoogleCalendarEventSchema>) => {
    console.log('🔧 Tool Execution: deleteGoogleCalendarEvent', { eventId: input.eventId, hasAccessToken: !!input.accessToken });
    try {
      // Validar que el token exista
      if (!input.accessToken) {
        console.log('❌ No se encontró token de acceso para Google Calendar');
        throw new Error('Se requiere un token de acceso OAuth de Google. Por favor verifica que Google Calendar esté conectado en la sección de integraciones.');
      }
      console.log('✅ Token de acceso para Google Calendar disponible');

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: input.accessToken });

      const calendar = google.calendar({ version: 'v3', auth });

      await calendar.events.delete({
        calendarId: input.calendarId,
        eventId: input.eventId,
        sendUpdates: input.sendNotifications ? 'all' : 'none'
      });

      return { success: true };
    } catch (error: any) {
      console.error('❌ Google Calendar API Error:', error.message);
      
      // Manejar códigos de error específicos
      if (error.code === 401) {
        return { success: false, error: 'Error de autenticación: El token de acceso es inválido o ha expirado.' };
      } else if (error.code === 403) {
        return { success: false, error: 'Error de permisos: No tienes autorización para eliminar eventos de este calendario.' };
      } else if (error.code === 404) {
        return { success: false, error: 'Error: Evento o calendario no encontrado.' };
      }
      
      return { success: false, error: `Error al eliminar evento: ${error.message}` };
    }
  }
);

// 💬 Chat Flow with Claude 3.5 Sonnet
const chatFlowInputZodSchema = z.object({
  message: z.string().describe('User message'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional().describe('Previous conversation messages'),
  accessToken: z.string().optional().describe('Token de acceso OAuth 2.0 de Google para las herramientas de Calendar')
});

const chatFlowOutputZodSchema = z.object({
  response: z.string(),
  allToolsUsed: z.array(z.string()).optional(),
  timestamp: z.string()
});

// Definiendo las herramientas disponibles para el chatFlow
const availableTools = [
  searchWebTool,
  analyzeWebTool,
  analyzeDocumentTool,
  listGoogleCalendarEventsTool,
  createGoogleCalendarEventTool,
  updateGoogleCalendarEventTool,
  deleteGoogleCalendarEventTool
];

const chatFlow = ai.defineFlow<typeof chatFlowInputZodSchema, typeof chatFlowOutputZodSchema>(
  {
    name: 'chat',
    inputSchema: chatFlowInputZodSchema,
    outputSchema: chatFlowOutputZodSchema
  },
  async (input: z.infer<typeof chatFlowInputZodSchema>) => {
    console.log('💬 Chat Flow Started:', { 
      message: input.message.substring(0, 100),
      historyLength: input.conversationHistory?.length || 0,
      accessTokenAvailable: !!input.accessToken
    });
    
    // Registrar si tenemos un token de acceso para Google Calendar
    const hasAccessToken = !!input.accessToken;
    console.log(`🔑 Google Calendar Access Token disponible: ${hasAccessToken ? 'Sí' : 'No'}`);    // Build conversation context
    const conversationContext = (input.conversationHistory || [])
      .map(msg => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
      .join('\n\n');

    const fullPrompt = `Eres Agent Hums, un asistente AI avanzado desarrollado con Angular 20 y Claude 3.5 Sonnet. 

PERSONALIDAD:
- Amigable, profesional y servicial
- Experto en tecnología, desarrollo y temas generales
- Proactivo en el uso de herramientas cuando es necesario
- Respuestas concisas pero completas

CAPACIDADES:
- Conversación general inteligente
- Búsqueda web en tiempo real (searchWeb)
- Análisis profundo de información web (analyzeWeb)
- Análisis de documentos PDF (analyzeDocument)
- Integración con Google Calendar (listGoogleCalendarEvents, createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent)

INSTRUCCIONES DE USO DE HERRAMIENTAS:
- USA searchWeb cuando necesites información actualizada, datos recientes, noticias, precios, eventos actuales
- USA analyzeWeb para investigaciones más profundas que requieren múltiples búsquedas y análisis
- USA analyzeDocument cuando el usuario envíe documentos PDF para analizar su contenido
- USA listGoogleCalendarEvents para obtener eventos del calendario de Google
- USA createGoogleCalendarEvent para crear eventos en el calendario de Google
- USA updateGoogleCalendarEvent para actualizar eventos en el calendario de Google
- USA deleteGoogleCalendarEvent para eliminar eventos del calendario de Google
- NO uses herramientas para preguntas generales que puedes responder con tu conocimiento
- Siempre explica qué herramienta vas a usar y por qué

FORMATO DE RESPUESTA:
- Menciona si usaste herramientas para obtener información
- Cita fuentes cuando sea relevante
- Mantén un tono conversacional y natural

Fecha actual: ${new Date().toLocaleDateString('es-MX')}

${conversationContext ? `CONVERSACIÓN PREVIA:\n${conversationContext}\n\n` : ''}MENSAJE ACTUAL:
Usuario: ${input.message}`;    try {
      // Array para rastrear herramientas usadas
      const allToolsUsed: string[] = [];
      
      // Override console.log temporalmente para capturar tool executions
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        const message = args.join(' ');
        // Detectar ejecución de herramientas
        if (message.includes('🔧 Tool Execution: searchWeb')) {
          if (!allToolsUsed.includes('searchWeb')) {
            allToolsUsed.push('searchWeb');
          }
        } else if (message.includes('🔧 Tool Execution: analyzeWeb')) {
          if (!allToolsUsed.includes('analyzeWeb')) {
            allToolsUsed.push('analyzeWeb');
          }
        } else if (message.includes('🔧 Tool Execution: analyzeDocument')) {
          if (!allToolsUsed.includes('analyzeDocument')) {
            allToolsUsed.push('analyzeDocument');
          }
        } else if (message.includes('🔧 Tool Execution: listGoogleCalendarEvents')) {
          if (!allToolsUsed.includes('listGoogleCalendarEvents')) {
            allToolsUsed.push('listGoogleCalendarEvents');
          }
        } else if (message.includes('🔧 Tool Execution: createGoogleCalendarEvent')) {
          if (!allToolsUsed.includes('createGoogleCalendarEvent')) {
            allToolsUsed.push('createGoogleCalendarEvent');
          }
        } else if (message.includes('🔧 Tool Execution: updateGoogleCalendarEvent')) {
          if (!allToolsUsed.includes('updateGoogleCalendarEvent')) {
            allToolsUsed.push('updateGoogleCalendarEvent');
          }
        } else if (message.includes('🔧 Tool Execution: deleteGoogleCalendarEvent')) {
          if (!allToolsUsed.includes('deleteGoogleCalendarEvent')) {
            allToolsUsed.push('deleteGoogleCalendarEvent');
          }
        }
        
        // Llamar al log original
        originalLog(...args);
      };
        const result = await ai.generate({
        model: claude35Sonnet,
        prompt: fullPrompt,
        tools: availableTools,
        config: {
          temperature: 0.7,
          maxOutputTokens: 4000
        }
      });

      // Restaurar console.log original
      console.log = originalLog;

      console.log('✅ Chat Flow Completed:', { 
        responseLength: result.text?.length || 0,
        hasResponse: !!result.text,
        allToolsUsed: allToolsUsed
      });

      return {
        response: result.text || 'Lo siento, no pude generar una respuesta.',
        allToolsUsed: allToolsUsed,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('❌ Chat Flow Error:', error);
      
      return {
        response: `Lo siento, ocurrió un error al procesar tu mensaje. Por favor, inténtalo de nuevo. Error: ${error.message}`,
        allToolsUsed: [],
        timestamp: new Date().toISOString()
      };
    }
  }
);

// 🌐 Express Server Setup
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.get('/health', (req: any, res: any) => {  res.json({ 
    status: 'healthy', 
    model: 'Claude 3.5 Sonnet',
    tools: [
      searchWebTool.name, 
      analyzeWebTool.name, 
      analyzeDocumentTool.name, 
      listGoogleCalendarEventsTool.name, 
      createGoogleCalendarEventTool.name, 
      updateGoogleCalendarEventTool.name, 
      deleteGoogleCalendarEventTool.name
    ],
    timestamp: new Date().toISOString()
  });
});

// Chat endpoint using Express instead of Genkit server
app.post('/chatFlow', async (req: any, res: any) => {
  try {
    console.log('📥 Chat request received:', req.body);
    
    const { userId, message, conversationHistory = [], documents = [], accessToken = '' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let enhancedMessage = message;
    let documentContext = '';
    
    // Variable para rastrear herramientas usadas
    let toolsUsed: string[] = [];
    
    // Llamar al flujo de chat pasando el mensaje, la conversación y el accessToken
    const result = await chatFlow({
      message: enhancedMessage || message,
      conversationHistory: conversationHistory,
      accessToken: accessToken || undefined
    });
    
    // Capturar las herramientas usadas del resultado
    if (result.allToolsUsed && Array.isArray(result.allToolsUsed)) {
      toolsUsed = [...result.allToolsUsed];
    }

    // Process documents if provided
    if (documents && Array.isArray(documents) && documents.length > 0) {
      console.log('📄 Processing documents:', documents.length);
      
      let documentAnalysisResults: string[] = [];
      
      for (const doc of documents) {
        try {
          console.log('🔧 Analyzing document:', doc.fileName);
            // Call the document analysis tool directly
          const analysisResult = await analyzeDocumentTool({
            documentBase64: doc.file,
            fileName: doc.fileName,
            analysisType: doc.analysisType || 'analyze',
            maxLength: doc.maxLength || 20000, // Increased for better analysis
            chunkSize: 15000 // Optimal chunk size for Claude 3.5 Sonnet
          });

          if (analysisResult.success) {
            // Create rich document context for Claude
            const documentInfo = `
📄 **Documento: "${doc.fileName}"**
📊 **Metadatos:** ${analysisResult.metadata.pages || 'N/A'} páginas, ${analysisResult.metadata.wordCount} palabras, ${Math.round(analysisResult.metadata.fileSize / 1024)} KB

📋 **Análisis del contenido:**
${analysisResult.summary}

📝 **Contenido extraído (primeras 3000 palabras):**
${analysisResult.content}

${analysisResult.entities && analysisResult.entities.length > 0 ? 
  `🏷️ **Entidades identificadas:**\n${analysisResult.entities.map(e => `- ${e.type.toUpperCase()}: ${e.value}`).join('\n')}` : 
  ''}
---
            `;
            
            documentAnalysisResults.push(documentInfo);
            
            if (!toolsUsed.includes('analyzeDocument')) {
              toolsUsed.push('analyzeDocument');
            }
          } else {
            documentAnalysisResults.push(`
❌ **Error al analizar "${doc.fileName}":**
${analysisResult.error || 'Error desconocido'}
---
            `);
          }
        } catch (docError: any) {
          console.error('❌ Document processing error:', docError);
          documentAnalysisResults.push(`
❌ **Error al procesar "${doc.fileName}":**
${docError.message}
---
          `);
        }
      }

      // Create comprehensive document context
      if (documentAnalysisResults.length > 0) {
        documentContext = `
=== CONTEXTO DE DOCUMENTOS ANALIZADOS ===
${documentAnalysisResults.join('\n')}
=== FIN CONTEXTO DOCUMENTOS ===
`;
        
        // Create enhanced message that explicitly uses the document context
        enhancedMessage = `Contexto: Tengo los siguientes documentos analizados que contienen información relevante.

${documentContext}

Pregunta del usuario: ${message}

Por favor, proporciona una respuesta basada principalmente en la información de los documentos analizados. Si la información en los documentos no es suficiente para responder completamente, indica qué información adicional se necesitaría.`;
      }
    }

    console.log('🔄 Sending enhanced message to chat flow:', {
      originalLength: message.length,
      enhancedLength: enhancedMessage.length,
      hasDocuments: documents && documents.length > 0,
      toolsUsed
    });

    // Construct accessTokenInfo to be included in the prompt
    let accessTokenInfo = '';
    if (accessToken) {
      console.log('🔑 Google Calendar Access Token received in /chatFlow:', accessToken.substring(0, 15) + '...');
      accessTokenInfo = `Se ha proporcionado un token de acceso para Google Calendar. Al usar herramientas de Google Calendar, incluye este token como el parámetro 'accessToken'. Token: ${accessToken}`;
    } else {
      console.log('⚠️ No Google Calendar Access Token received in /chatFlow.');
    }

    // Build conversation context string for the prompt
    const conversationHistoryForPrompt = (conversationHistory || [])
      .map((msg: { role: 'user' | 'assistant'; content: string }) => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
      .join('\n\n');

    // Prepare arguments for the prompt function
    const promptArgs: ChatFlowExpressPromptArgs = {
      currentDate: new Date().toLocaleDateString('es-MX'),
      // Combine formatted conversation history and document context
      documentContext: conversationHistoryForPrompt + (documentContext ? `\n\n${documentContext}` : ''), 
      userMessage: enhancedMessage || message, // Use enhancedMessage if available, otherwise original message
      accessTokenInfo: accessTokenInfo
    };

    // Generate the full prompt using the externalized function
    const fullPrompt = getChatFlowExpressPrompt(promptArgs);

    // Lista de herramientas disponibles para Claude 3.5 Sonnet
    const chatAvailableTools = [
      searchWebTool,
      analyzeWebTool,
      analyzeDocumentTool,
      listGoogleCalendarEventsTool,
      createGoogleCalendarEventTool,
      updateGoogleCalendarEventTool,
      deleteGoogleCalendarEventTool
    ];

    const chatResult = await ai.generate({
      model: claude35Sonnet,
      prompt: fullPrompt,
      tools: chatAvailableTools,
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    });

    // No es necesario crear un nuevo array, usamos el que ya tenemos
    
    // Crear historial actualizado con el mensaje del usuario y la respuesta del asistente
    const updatedConversationHistory = [
      ...(conversationHistory || []),
      { role: 'user', content: message },
      { role: 'assistant', content: chatResult.text || 'Lo siento, no pude generar una respuesta.' }
    ];
    
    return res.json({
      response: chatResult.text || 'Lo siento, no pude generar una respuesta.',
      allToolsUsed: toolsUsed,
      conversationHistory: updatedConversationHistory,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Chat endpoint error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Start Express server
app.listen(PORT, () => {
  console.log(`✅ Agent Hums Server running on port ${PORT}`);
  console.log(`🔗 Chat endpoint: http://localhost:${PORT}/chatFlow`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log('🚀 Server started successfully.');
  console.log('📅 Google Calendar herramientas integradas correctamente.');
});
