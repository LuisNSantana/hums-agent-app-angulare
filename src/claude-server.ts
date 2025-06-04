/**
 * Agent Hums - Claude 3.5 Sonnet Server
 * Production-ready chat server with integrated web search capabilities
 * Angular 20 + Claude 3.5 Sonnet + Brave Search API
 */

import 'dotenv/config';
import { genkit } from 'genkit';
import { anthropic, claude35Sonnet } from 'genkitx-anthropic';
import { z } from 'zod';
import axios from 'axios';
import express from 'express';
import cors from 'cors';

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
const searchWebTool = ai.defineTool(
  {
    name: 'searchWeb',
    description: 'Buscar información actualizada en internet usando Brave Search API. Ideal para obtener información reciente, noticias, datos actualizados, precios, eventos actuales.',
    inputSchema: z.object({
      query: z.string().describe('Consulta de búsqueda específica y clara en español'),
      limit: z.number().optional().default(5).describe('Número de resultados (máximo 10)')
    }),
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
  async (input) => {
    console.log('🔧 Tool Execution: searchWeb', input);
    const limit = Math.min(input.limit || 5, 10);
    return await searchWithBrave(input.query, limit);
  }
);

const analyzeWebTool = ai.defineTool(
  {
    name: 'analyzeWeb',
    description: 'Buscar y analizar información específica en internet. Combina búsqueda web con análisis profundo.',
    inputSchema: z.object({
      topic: z.string().describe('Tema o pregunta específica a investigar'),
      analysisType: z.enum(['comparison', 'trends', 'technical', 'news', 'general']).describe('Tipo de análisis deseado'),
      searchQueries: z.array(z.string()).optional().describe('Consultas de búsqueda específicas (se generan automáticamente si no se proporcionan)')
    }),
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
  async (input) => {
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

    const summary = `Análisis completado con ${uniqueResults.length} fuentes verificadas. La información recopilada proporciona una visión ${input.analysisType} actualizada sobre ${input.topic}.`;

    return {
      analysis,
      sources: uniqueResults.slice(0, 8), // Limit sources
      summary,
      timestamp: new Date().toISOString()
    };
  }
);

// 💬 Chat Flow with Claude 3.5 Sonnet
const chatFlow = ai.defineFlow(
  {
    name: 'chat',
    inputSchema: z.object({
      message: z.string().describe('User message'),
      conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string()
      })).optional().describe('Previous conversation messages')
    }),
    outputSchema: z.object({
      response: z.string(),
      toolsUsed: z.array(z.string()).optional(),
      timestamp: z.string()
    })
  },
  async (input) => {
    console.log('💬 Chat Flow Started:', { 
      message: input.message.substring(0, 100),
      historyLength: input.conversationHistory?.length || 0
    });    // Build conversation context
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

INSTRUCCIONES DE USO DE HERRAMIENTAS:
- USA searchWeb cuando necesites información actualizada, datos recientes, noticias, precios, eventos actuales
- USA analyzeWeb para investigaciones más profundas que requieren múltiples búsquedas y análisis
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
      const toolsUsed: string[] = [];
      
      // Override console.log temporalmente para capturar tool executions
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        const message = args.join(' ');
        
        // Detectar ejecución de herramientas
        if (message.includes('🔧 Tool Execution: searchWeb')) {
          if (!toolsUsed.includes('searchWeb')) {
            toolsUsed.push('searchWeb');
          }
        } else if (message.includes('🔧 Tool Execution: analyzeWeb')) {
          if (!toolsUsed.includes('analyzeWeb')) {
            toolsUsed.push('analyzeWeb');
          }
        }
        
        // Llamar al log original
        originalLog(...args);
      };
      
      const result = await ai.generate({
        model: claude35Sonnet,
        prompt: fullPrompt,
        tools: [searchWebTool, analyzeWebTool],
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
        toolsUsed: toolsUsed
      });

      return {
        response: result.text || 'Lo siento, no pude generar una respuesta.',
        toolsUsed: toolsUsed,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('❌ Chat Flow Error:', error);
      
      return {
        response: `Lo siento, ocurrió un error al procesar tu mensaje. Por favor, inténtalo de nuevo. Error: ${error.message}`,
        toolsUsed: [],
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

// Health check endpoint
app.get('/health', (req: any, res: any) => {
  res.json({ 
    status: 'healthy', 
    model: 'Claude 3.5 Sonnet',
    tools: ['searchWeb', 'analyzeWeb'],
    timestamp: new Date().toISOString()
  });
});

// Chat endpoint using Express instead of Genkit server
app.post('/chatFlow', async (req: any, res: any) => {
  try {
    console.log('📥 Chat request received:', req.body);
    
    const { message, conversationHistory } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Execute the chat flow
    const result = await chatFlow({
      message,
      conversationHistory: conversationHistory || []
    });

    return res.json(result);
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
});
