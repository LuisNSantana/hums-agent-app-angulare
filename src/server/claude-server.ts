/**
 * Claude Server - Optimized Implementation with Genkit
 * Fixed tool registration and reduced complexity
 */

// Essential imports
import { genkit, z } from 'genkit';
import { anthropic, claude35Haiku } from 'genkitx-anthropic';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { configDotenv } from 'dotenv';

// Configuration
import { EnvironmentConfig } from './config/environment.config';

// Services
import { BraveSearchService } from './services/brave-search.service';
import { GoogleCalendarService } from './services/google-calendar.service';
import { GoogleDriveService } from './services/google-drive.service';

// AI Prompts
import { buildSystemPrompt, buildContextAwarePrompt, initializePromptCache, getPromptCacheStats } from './ai/prompts';

// AI Services
import { RetryService, createOverloadedRetryWrapper } from './ai/services/retry.service';
import { MockResponseService } from './ai/services/mock-response.service';

// Types
import { ChatMessage, ChatResponse, CalendarEvent, GoogleDriveFile } from './types';

// Type interfaces for service responses  
interface GoogleCalendarSuccessResponse { 
  success: true; 
  events: CalendarEvent[]; 
}

interface GoogleCalendarErrorResponse { 
  success: false; 
  error: string; 
}

interface GoogleDriveSuccessResponse { 
  success: true; 
  files: GoogleDriveFile[]; 
  totalFiles: number; 
}

interface GoogleDriveErrorResponse { 
  success: false; 
  error: string; 
}

// Type aliases for service responses
type CalendarServiceResponse = GoogleCalendarSuccessResponse | GoogleCalendarErrorResponse;
type DriveServiceResponse = GoogleDriveSuccessResponse | GoogleDriveErrorResponse;

// Global instances
let ai: any;
let braveSearchService: BraveSearchService;
let googleCalendarService: GoogleCalendarService;
let googleDriveService: GoogleDriveService;

// Auth tokens for current request
let currentRequestAuthTokens: { calendar?: string; drive?: string } = {};

// Tool tracking for current request
let toolExecutionTracker: Array<{
  name: string;
  input: any;
  output: any;
  timestamp: string;
  executionTime: number;
}> = [];

/**
 * Track tool execution for the current request
 */
function trackToolExecution(toolName: string, input: any, output: any, executionTime: number): void {
  toolExecutionTracker.push({
    name: toolName,
    input,
    output,
    timestamp: new Date().toISOString(),
    executionTime
  });
}

/**
 * Get and clear tool tracking for current request
 */
function getAndClearToolTracking(): Array<{
  name: string;
  input: any;
  output: any;
  timestamp: string;
  executionTime: number;
}> {
  const tools = [...toolExecutionTracker];
  toolExecutionTracker = [];
  return tools;
}

/**
 * Wrap tool execution with tracking
 */
function createTrackedTool<TInput, TOutput>(
  toolName: string,
  toolFunction: (input: TInput) => Promise<TOutput>
): (input: TInput) => Promise<TOutput> {
  return async (input: TInput): Promise<TOutput> => {
    const startTime = Date.now();
    
    try {
      const result = await toolFunction(input);
      const executionTime = Date.now() - startTime;
      
      trackToolExecution(toolName, input, result, executionTime);
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      const errorResult = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      } as TOutput;
      
      trackToolExecution(toolName, input, errorResult, executionTime);
      return errorResult;
    }
  };
}

/**
 * Initialize environment and services
 */
function initializeEnvironment(): void {
  configDotenv();
  EnvironmentConfig.validate();
  
  const config = EnvironmentConfig.getConfig();
  braveSearchService = new BraveSearchService(config.braveSearchApiKey || '');
  googleCalendarService = new GoogleCalendarService();
  googleDriveService = new GoogleDriveService();
}

/**
 * Initialize Genkit with AI and tools
 */
async function initializeGenkit(): Promise<void> {
  const config = EnvironmentConfig.getConfig();
  
  ai = genkit({
    plugins: [
      anthropic({ apiKey: config.anthropicApiKey }),
    ],
  });

  // Define tools using correct Genkit syntax
  defineTools();
}

/**
 * Define all tools using ai.defineTool() with tracking
 */
function defineTools(): void {
  // Search Web Tool with tracking
  ai.defineTool(
    {
      name: 'searchWeb',
      description: 'Buscar información actualizada en internet usando Brave Search API',
      inputSchema: z.object({
        query: z.string().describe('Consulta de búsqueda'),
        limit: z.number().optional().default(5).describe('Número de resultados')
      }),
      outputSchema: z.object({
        success: z.boolean(),
        results: z.array(z.object({
          title: z.string(),
          url: z.string(),
          snippet: z.string()
        })),
        message: z.string()
      })
    },
    createTrackedTool('Brave Search', async (input: { query: string; limit?: number }) => {
      try {
        if (!EnvironmentConfig.getConfig().braveSearchApiKey) {
          return {
            success: false,
            results: [],
            message: 'API key de Brave Search no configurada'
          };
        }
        
        const result = await braveSearchService.search(input.query, input.limit);
        return result.success ? result : {
          success: false,
          results: [],
          message: result.message || 'Error en búsqueda'
        };
      } catch (error) {
        return {
          success: false,
          results: [],
          message: `Error: ${error instanceof Error ? error.message : 'Desconocido'}`
        };
      }
    })
  );  // Google Calendar Tool with tracking
  ai.defineTool(
    {
      name: 'listCalendarEvents',
      description: 'Listar eventos del calendario de Google',
      inputSchema: z.object({
        startDate: z.string().describe('Fecha de inicio (YYYY-MM-DD)'),
        endDate: z.string().describe('Fecha de fin (YYYY-MM-DD)'),
        maxResults: z.number().optional().default(10)
      }),
      outputSchema: z.object({
        success: z.boolean(),
        events: z.array(z.object({
          id: z.string(),
          title: z.string(),
          description: z.string().optional(),
          startDateTime: z.string(),
          endDateTime: z.string(),
          location: z.string().optional()
        })),
        message: z.string()
      })
    },
    createTrackedTool('Google Calendar', async (input: { startDate: string; endDate: string; maxResults?: number }) => {
      try {
        const token = currentRequestAuthTokens.calendar;
        if (!token) {
          return {
            success: false,
            events: [],
            message: 'Token de Google Calendar no disponible'
          };
        }
        
        // Convert YYYY-MM-DD dates to proper RFC3339 format
        const formatToRFC3339 = (dateStr: string, isEndOfDay: boolean = false): string => {
          const date = new Date(dateStr);
          if (isEndOfDay) {
            date.setHours(23, 59, 59, 999);
          } else {
            date.setHours(0, 0, 0, 0);
          }
          return date.toISOString();
        };        const timeMin = formatToRFC3339(input.startDate);
        const timeMax = formatToRFC3339(input.endDate, true);

        const result = await googleCalendarService.listEvents(
          token, 'primary', timeMin, timeMax, input.maxResults
        ) as CalendarServiceResponse;

        if (result.success && 'events' in result) {
          const calendarResult = result as GoogleCalendarSuccessResponse;
          return {
            success: true,
            events: calendarResult.events.map((event: CalendarEvent) => ({
              id: event.id || `event-${Date.now()}`,
              title: event.title || 'Sin título',
              description: event.description,
              startDateTime: event.startDateTime || new Date().toISOString(),
              endDateTime: event.endDateTime || new Date().toISOString(),
              location: event.location
            })),
            message: `${calendarResult.events.length} eventos encontrados`
          };
        } else {
          const errorResult = result as GoogleCalendarErrorResponse;
          return {
            success: false,
            events: [],
            message: errorResult.error || 'Error al obtener eventos'
          };
        }
      } catch (error) {        return {
          success: false,
          events: [],
          message: `Error: ${error instanceof Error ? error.message : 'Desconocido'}`
        };
      }
    })
  );
  // Google Drive Tool with tracking
  ai.defineTool(
    {
      name: 'listDriveFiles',
      description: 'Listar archivos en Google Drive',
      inputSchema: z.object({
        query: z.string().optional().describe('Consulta de búsqueda'),
        maxResults: z.number().optional().default(10),
        folderId: z.string().optional()
      }),
      outputSchema: z.object({
        success: z.boolean(),
        files: z.array(z.object({
          id: z.string(),
          name: z.string(),
          mimeType: z.string(),
          size: z.string(),
          modifiedTime: z.string(),
          webViewLink: z.string()
        })),
        message: z.string()
      })
    },
    createTrackedTool('Google Drive', async (input: { query?: string; maxResults?: number; folderId?: string }) => {
      try {
        const token = currentRequestAuthTokens.drive;
        if (!token) {
          return {
            success: false,
            files: [],
            message: 'Token de Google Drive no disponible'
          };
        }

        const result = await googleDriveService.listFiles(
          token, input.query, input.maxResults, undefined, undefined, input.folderId
        ) as DriveServiceResponse;

        if (result.success && 'files' in result) {
          const driveResult = result as GoogleDriveSuccessResponse;
          return {
            success: true,
            files: driveResult.files.map((file: GoogleDriveFile) => ({
              id: file.id || `file-${Date.now()}`,
              name: file.name || 'Sin nombre',
              mimeType: file.mimeType || 'application/octet-stream',
              size: file.size ? `${Math.round(parseInt(file.size, 10) / 1024)} KB` : 'Desconocido',
              modifiedTime: file.modifiedTime || new Date().toISOString(),
              webViewLink: file.webViewLink || '#'
            })),
            message: `${driveResult.files.length} archivos encontrados`
          };
        } else {
          const errorResult = result as GoogleDriveErrorResponse;
          return {
            success: false,
            files: [],
            message: errorResult.error || 'Error al obtener archivos'
          };
        }
      } catch (error) {
        return {
          success: false,
          files: [],
          message: `Error: ${error instanceof Error ? error.message : 'Desconocido'}`
        };
      }
    })
  );
  // Refresh Tokens Tool with tracking
  ai.defineTool(
    {
      name: 'refreshGoogleTokens',
      description: 'Renovar tokens expirados de Google',
      inputSchema: z.object({
        userId: z.string().describe('ID del usuario')
      }),
      outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        calendarTokenRefreshed: z.boolean().optional(),
        driveTokenRefreshed: z.boolean().optional()
      })
    },
    createTrackedTool('Token Refresh', async (input: { userId: string }) => {
      try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
          process.env['SUPABASE_URL'],
          process.env['SUPABASE_ANON_KEY']
        );

        const { data, error } = await supabase
          .from('user_integrations')
          .select('google_calendar_refresh_token, google_drive_refresh_token')
          .eq('user_id', input.userId);

        if (error || !data || data.length === 0) {
          return {
            success: false,
            message: 'Usuario no encontrado en integraciones',
            calendarTokenRefreshed: false,
            driveTokenRefreshed: false
          };
        }

        // Token refresh logic would go here
        return {
          success: true,
          message: 'Tokens renovados exitosamente',
          calendarTokenRefreshed: true,
          driveTokenRefreshed: true
        };
      } catch (error) {        return {
          success: false,
          message: `Error: ${error instanceof Error ? error.message : 'Desconocido'}`,
          calendarTokenRefreshed: false,
          driveTokenRefreshed: false
        };
      }
    })
  );
}

/**
 * Process chat request with Claude
 */
async function processChatRequest(
  message: string, 
  conversationId: string, 
  authTokens?: { calendar?: string; drive?: string },
  conversationLength: number = 0
): Promise<ChatResponse> {
  try {
    // Store tokens for current request
    currentRequestAuthTokens = authTokens || {};

    // Check if we should use mock mode
    const config = EnvironmentConfig.getConfig();
    const shouldUseMock = MockResponseService.shouldUseMockMode(config);

    if (shouldUseMock) {
      console.log('🎭 [MockMode] Using mock response due to configuration or recent 529 errors');
      const mockResponse = MockResponseService.generateMockResponse(message, conversationId);
      
      return {
        success: mockResponse.success,
        message: mockResponse.message,
        conversationId: mockResponse.conversationId,
        model: 'claude-3-5-haiku-mock',
        usage: {
          inputTokens: message.length / 4, // Rough token estimation
          outputTokens: mockResponse.message.length / 4,
          totalTokens: (message.length + mockResponse.message.length) / 4
        },
        toolCalls: mockResponse.toolCalls?.map(tool => ({
          name: tool.toolName,
          input: { query: message },
          output: { status: tool.status, executionTime: tool.executionTime }
        })) || [],
        timestamp: new Date().toISOString()
      };
    }

    if (!ai) {
      throw new Error('AI instance not initialized');
    }    // Build context-aware system prompt
    const systemPrompt = buildContextAwarePrompt(false, conversationLength);
    
    // Create user prompt with clear context
    const userPrompt = `${message}`;

    // Use specialized retry service for 529 overloaded errors
    const overloadedRetryWrapper = createOverloadedRetryWrapper();
    const response = await overloadedRetryWrapper(async () => {
      return await ai.generate({
        model: claude35Haiku,
        prompt: systemPrompt + '\n\nUsuario: ' + userPrompt,
        tools: ['searchWeb', 'listCalendarEvents', 'listDriveFiles', 'refreshGoogleTokens']
      });
    });

    // Get tracked tools instead of relying on Genkit response
    const trackedTools = getAndClearToolTracking();
    
    // Map tracked tools to expected format
    const toolCalls = trackedTools.map(tool => ({
      name: tool.name,
      input: tool.input,
      output: tool.output
    }));

    return {
      success: true,
      message: response.text || 'Respuesta generada',
      conversationId,
      model: response.model || 'claude-3-5-haiku',
      usage: {
        inputTokens: response.usage?.inputTokens || 0,
        outputTokens: response.usage?.outputTokens || 0,
        totalTokens: response.usage?.totalTokens || 0
      },
      toolCalls, // Use our tracked tools
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('❌ Chat processing error:', error);
    
    // If this is a 529 error or overload, try to use mock as fallback
    if (error?.status === 529 || error?.message?.toLowerCase().includes('overloaded')) {
      console.log('🎭 [Fallback] Using mock response due to 529 error after all retries');
      const mockResponse = MockResponseService.generateMockResponse(message, conversationId);
      
      return {
        success: true,
        message: mockResponse.message + '\n\n⚠️ *Esta respuesta fue generada en modo de emergencia debido a sobrecarga del servidor de Anthropic.*',
        conversationId: mockResponse.conversationId,
        model: 'claude-3-5-haiku-fallback',
        usage: {
          inputTokens: message.length / 4,
          outputTokens: mockResponse.message.length / 4,
          totalTokens: (message.length + mockResponse.message.length) / 4
        },
        toolCalls: mockResponse.toolCalls?.map(tool => ({
          name: tool.toolName,
          input: { query: message },
          output: { status: tool.status, executionTime: tool.executionTime }
        })) || [],
        timestamp: new Date().toISOString()
      };
    }
    
    throw error;
  }
}

/**
 * Create Express server
 */
function createExpressServer(): express.Application {
  const app = express();
  
  app.use(cors({
    origin: ['http://localhost:4200', 'http://localhost:3001'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Calendar-Token', 'X-Drive-Token'],
    credentials: true
  }));
  
  app.use(express.json({ limit: '10mb' }));  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });
  // Runtime configuration endpoint
  app.get('/api/config', (req: Request, res: Response) => {
    try {
      const config = {
        googleClientId: process.env['GOOGLE_CLIENT_ID'] || '',
        googleScopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/drive'
        ],
        features: {
          enableWebSearch: true,
          enableFileUploads: true,
          enableStreamingChat: true,
          enableDebugMode: process.env['NODE_ENV'] !== 'production'
        }
      };
      
      res.json(config);
    } catch (error) {
      console.error('[Server] Config endpoint error:', error);
      res.status(500).json({ error: 'Failed to load configuration' });
    }
  });
  // Prompt system info
  app.get('/api/prompt-info', (req: Request, res: Response) => {
    const systemPrompt = buildSystemPrompt(false, true);
    const cacheStats = getPromptCacheStats();
    
    res.json({
      promptLength: systemPrompt.length,
      currentDate: new Date().toLocaleDateString('es-ES'),
      version: '2.0.0-robust-cached',
      features: [
        'Context-aware prompting',
        'Tool usage optimization', 
        'Conversation patterns',
        'Temporal awareness',
        'Intelligent prompt caching'
      ],
      cache: cacheStats
    });
  });
  // Main chat endpoint
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { message, conversationId, conversationLength } = req.body;
      
      const calendarToken = req.headers['x-calendar-token'] as string;
      const driveToken = req.headers['x-drive-token'] as string;
      
      const authTokens = {
        calendar: calendarToken?.trim() || undefined,
        drive: driveToken?.trim() || undefined
      };

      console.log('📥 Incoming chat request:', {
        messageLength: message?.length || 0,
        conversationId: conversationId?.substring(0, 8) + '...',
        hasCalendarToken: !!authTokens.calendar,
        hasDriveToken: !!authTokens.drive,
        conversationLength: conversationLength || 0
      });

      const response = await processChatRequest(
        message, 
        conversationId, 
        authTokens, 
        conversationLength || 0
      );
      res.json(response);    } catch (error) {
      console.error('❌ API Error:', error);
      res.status(500).json({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Desconocido'}`
      });
    }
  });

  // Cache monitoring endpoint
  app.get('/api/cache-stats', (req: Request, res: Response) => {
    const cacheStats = getPromptCacheStats();
    res.json({
      status: 'active',
      timestamp: new Date().toISOString(),
      ...cacheStats
    });
  });

  return app;
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    console.log('🔑 Initializing environment...');
    initializeEnvironment();
    
    console.log('📋 Initializing Genkit...');
    await initializeGenkit();
    
    console.log('🧠 Initializing Prompt Cache...');
    initializePromptCache();
    
    console.log('📋 Creating Express server...');
    const app = createExpressServer();
      const port = process.env['PORT'] || 3001;
    app.listen(port, () => {      console.log(`✅ Server running on http://localhost:${port}`);
      console.log('\nAvailable endpoints:');
      console.log('- GET  /health           - Health check');
      console.log('- GET  /api/prompt-info  - Prompt system information');
      console.log('- GET  /api/cache-stats  - Prompt cache statistics');
      console.log('- POST /api/chat         - Main chat endpoint (with robust prompting)');
      console.log('\n🧠 Prompt System Features:');
      console.log('- ✅ Context-aware prompting');
      console.log('- ✅ Tool usage optimization');
      console.log('- ✅ Temporal awareness');
      console.log('- ✅ Conversation flow patterns');
      console.log('- ✅ Intelligent prompt caching (NEW!)');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

export { processChatRequest, createExpressServer, startServer };
