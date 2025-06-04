/**
 * Genkit Backend Server
 * Firebase Genkit + Groq + Llama 4 Scout integration with Flow Server
 */

import { genkit } from 'genkit';
import { groq, llama33x70bVersatile } from 'genkitx-groq';
import { startFlowServer } from '@genkit-ai/express';
import { z } from 'zod';

// Get environment variables directly (without dotenv)
const GROQ_API_KEY = process.env['GROQ_API_KEY'] || 'your-groq-api-key-here';
const PORT = process.env['PORT'] || 3001;

console.log(`🔑 Groq API Key: ${GROQ_API_KEY.substring(0, 8)}...`);

// Initialize Genkit with Groq - Using Llama 3.3 70B Versatile with tool calling support
const ai = genkit({
  plugins: [
    groq({
      apiKey: GROQ_API_KEY,
    }),
  ],
  model: llama33x70bVersatile, // ✅ Llama 3.3 70B with tool calling support
});

// System prompt for Llama 4 Scout
const SYSTEM_PROMPT = `
Eres un asistente IA avanzado usando Llama 4 Scout con las siguientes capacidades:

HERRAMIENTAS DISPONIBLES:
- uploadToDrive: Subir archivos a Google Drive
- createCalendarEvent: Crear eventos en calendario  
- searchWeb: Buscar información actualizada en internet
- analyzeDocument: Analizar documentos PDF/Word

INSTRUCCIONES:
1. Analiza la solicitud del usuario
2. Identifica si necesitas usar herramientas
3. Usa tool calling para ejecutar acciones
4. Proporciona respuestas contextuales y útiles
5. Mantén conversaciones naturales y fluidas

FORMATO DE TOOL CALLING:
Usa las herramientas cuando sea necesario siguiendo el formato estándar de Genkit.
`;

// Tool definitions - Import actual tools
import { GoogleDriveTool } from './app/features/tools/google-drive/google-drive.tool';
import { GoogleCalendarTool } from './app/features/tools/google-calendar/google-calendar.tool';
import { WebSearchTool } from './app/features/tools/web-search/web-search.tool';
import { DocumentAnalyzerTool } from './app/features/tools/document-analyzer/document-analyzer.tool';

// Initialize tools
const googleDriveTool = new GoogleDriveTool();
const googleCalendarTool = new GoogleCalendarTool();
const webSearchTool = new WebSearchTool();
const documentAnalyzerTool = new DocumentAnalyzerTool();

// Define Genkit tools
const driveUploadTool = ai.defineTool(
  googleDriveTool.defineGenkitTool(),
  async (input) => {
    const result = await googleDriveTool.execute(input);
    return result.data || result.error || 'No result';
  }
);

const createEventTool = ai.defineTool(
  googleCalendarTool.defineGenkitTool(),
  async (input) => {
    const result = await googleCalendarTool.execute(input);
    return result.data || result.error || 'No result';
  }
);

const webSearchGenkitTool = ai.defineTool(
  webSearchTool.defineGenkitTool(),
  async (input) => {
    const result = await webSearchTool.execute(input);
    return result.data || result.error || 'No result';
  }
);

const analyzeDocumentTool = ai.defineTool(
  documentAnalyzerTool.defineGenkitTool(),
  async (input) => {
    const result = await documentAnalyzerTool.execute(input);
    return result.data || result.error || 'No result';
  }
);

// Main chat flow
export const chatAgentFlow = ai.defineFlow(
  {
    name: 'chatAgent',
    inputSchema: z.object({
      message: z.string(),
      conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      })).optional(),
      tools: z.array(z.string()).optional(),
    }),
    outputSchema: z.string(),
    streamSchema: z.string(),
  },
  async (input, { sendChunk }) => {
    try {
      console.log('📥 Received input:', JSON.stringify(input, null, 2));

      const availableTools = [
        driveUploadTool,
        createEventTool,
        webSearchGenkitTool,
        analyzeDocumentTool,
      ];

      // Build messages in Genkit format (content as array of { text })
      const messages = [
        { role: 'system' as const, content: [{ text: SYSTEM_PROMPT }] },
        ...((input.conversationHistory || []).map((msg: any) => {
          return {
            role: msg.role,
            content: [{ text: msg.content }]
          };
        })),
        { role: 'user' as const, content: [{ text: input.message }] }
      ];

      console.log('📤 Sending to Llama 4 Scout:', JSON.stringify(messages, null, 2));

      const { stream } = await ai.generateStream({
        model: llama33x70bVersatile,
        tools: availableTools,
        messages,
        config: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      });

      // Collect streamed text
      let fullText = '';
      for await (const chunk of stream) {
        if (chunk.content?.[0]?.text) {
          const text = chunk.content[0].text;
          sendChunk(text);
          fullText += text;
        }
      }

      console.log('✅ Generated response:', fullText.substring(0, 200) + '...');
      return fullText;
    } catch (error) {
      console.error('❌ Error en chatAgentFlow:', error);
      throw new Error('Error procesando la solicitud');
    }
  }
);

// Test flow for health check
export const healthFlow = ai.defineFlow(
  {
    name: 'health',
    inputSchema: z.any().optional(), // Acepta cualquier entrada o ninguna
    outputSchema: z.object({
      status: z.string(),
      model: z.string(),
      timestamp: z.string(),
    }),
  },
  async (input) => {
    console.log('🔍 Health check input:', input);
    return {
      status: 'ok',
      model: 'llama4MScout17b',
      timestamp: new Date().toISOString(),
    };
  }
);

// Start the Genkit Flow Server
console.log('🚀 Starting Genkit Flow Server...');

startFlowServer({
  flows: [chatAgentFlow, healthFlow],
  port: Number(PORT),
  cors: {
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    credentials: true,
  },
  jsonParserOptions: {
    limit: '50mb',
    strict: false, // Permite JSON menos estricto
    type: 'application/json', // Especifica el tipo de contenido
  },
});

console.log(`✅ Genkit Flow Server running at http://localhost:${PORT}`);
console.log(`📊 Available flows:`);
console.log(`   - POST http://localhost:${PORT}/chatAgent`);
console.log(`   - POST http://localhost:${PORT}/health`);
console.log(`🔧 Start Genkit Developer UI with: genkit start`);
console.log(`🔑 Using API Key: ${GROQ_API_KEY ? '✅ Configured' : '❌ Missing'}`);
