# 🛠️ Guía de Herramientas HumsAI Agent con Firebase Genkit y Groq

## 🎯 Objetivo Core
Implementar sistema de herramientas usando **Firebase Genkit** con **Groq + Llama 4 Scout** para crear un agente IA estilo Claude con capacidades avanzadas: gestionar archivos, calendario, búsquedas web y análisis de documentos.

## 🔥 ¿Por qué Firebase Genkit?

### Ventajas Clave de Genkit
- **Framework de producción** de Google para aplicaciones IA
- **Arquitectura code-first** perfecta para desarrollo Angular
- **Soporte nativo para tool calling** y agentes IA
- **Developer tools integradas** para testing y debugging
- **Streaming en tiempo real** para experiencias de chat fluidas
- **Multi-provider support** (Google, OpenAI, Groq, Anthropic, etc.)

### Por qué Groq + Llama 4 Scout
- **Llama 4 Scout**: Modelo más reciente con **gran contexto** y **económico**
- **Groq**: Inferencia **ultra-rápida** ($0.11/M tokens de input)
- **Tool calling nativo** optimizado para agentes
- **Multimodal** (texto e imágenes)
- **17B parámetros** con arquitectura de expertos eficiente

## 🚀 Setup Inicial: Instalación de Genkit

### 1. Instalar Genkit Core
```bash
# Instalar CLI global
npm install -g genkit-cli

# Instalar Genkit en el proyecto
npm install genkit @genkit-ai/express

# Instalar provider Groq (community plugin)
npm install genkitx-groq

# Instalar herramientas adicionales para tools
npm install googleapis @google/generative-ai
npm install cheerio puppeteer-core pdf-parse mammoth
npm install @types/cheerio @types/pdf-parse
```

### 2. Configurar Variables de Entorno
```bash
# Crear archivo .env en la raíz del proyecto
echo "GROQ_API_KEY=tu_groq_api_key_aqui" >> .env
echo "GOOGLE_DRIVE_API_KEY=tu_google_api_key" >> .env
echo "GOOGLE_CALENDAR_API_KEY=tu_calendar_api_key" >> .env
```

### 3. Configurar Genkit en el Servidor
**Archivo**: `src/server.ts` (actualizar)
```typescript
import { genkit } from 'genkit';
import { groq, llama4Scout } from 'genkitx-groq';

// Configurar Genkit con Groq
const ai = genkit({
  plugins: [
    groq({
      apiKey: process.env['GROQ_API_KEY'],
    }),
  ],
  model: llama4Scout, // Llama 4 Scout como modelo por defecto
});
```

## 🏗️ Arquitectura del Sistema

### Estructura Actualizada
```
src/app/
├── core/
│   ├── interfaces/
│   │   ├── tool.interface.ts         # Contratos base
│   │   ├── tool-result.interface.ts  # Respuestas estándar
│   │   ├── genkit.types.ts          # 🆕 Tipos Genkit
│   │   └── index.ts
│   └── services/
│       ├── tool-registry.service.ts  # Registry de herramientas
│       └── genkit-agent.service.ts  # 🆕 Servicio principal Genkit
└── features/tools/
    ├── google-drive/          # ✅ YA INICIADA
    ├── google-calendar/       # 🔄 POR IMPLEMENTAR
    ├── web-search/           # 🔄 POR IMPLEMENTAR
    └── document-analyzer/    # ✅ YA INICIADA
```

## 📋 Contratos de Herramientas (Compatible Genkit)

### Interfaz Principal
```typescript
// tool.interface.ts
interface Tool {
  id: string;                    
  name: string;                  
  description: string;           // Descripción para Llama 4 Scout
  category: ToolCategory;        
  
  // Compatibilidad Genkit
  schema: z.ZodSchema;          // Schema Zod para validación
  examples: ToolExample[];       
  
  // Métodos Genkit
  initialize(): Promise<boolean>;
  execute(params: any): Promise<ToolResult>;
  defineGenkitTool(): any;      // 🆕 Definición para Genkit
}
```

### Servicio Genkit Agent
```typescript
// genkit-agent.service.ts
@Injectable({ providedIn: 'root' })
export class GenkitAgentService {
  private ai = genkit({
    plugins: [groq()],
    model: llama4Scout,
  });

  async processMessage(message: string, tools: Tool[]): Promise<string> {
    // Implementar lógica del agente con Genkit
  }
}
```

## 🛠️ Implementación por Herramienta

### 1. Google Drive Tool (Expandir)
**Estado**: 🔄 INTEGRAR CON GENKIT

**Setup específico**:
```bash
# Google APIs
npm install googleapis @types/googleapis

# Configurar OAuth2 en Google Cloud Console
# Habilitar Google Drive API
```

**Funciones Priority con Genkit**:
```typescript
const driveUploadTool = ai.defineTool({
  name: 'uploadToDrive',
  description: 'Upload files to Google Drive',
  inputSchema: z.object({
    file: z.string(),
    folder: z.string().optional(),
  }),
  async (input) => {
    // Implementación con Google Drive API
  }
});
```

### 2. Google Calendar Tool (Nuevo)
**Estado**: 🆕 CREAR CON GENKIT

**Setup**:
```bash
mkdir -p src/app/features/tools/google-calendar/{models,services}
touch src/app/features/tools/google-calendar/google-calendar.tool.ts
```

**Herramientas Genkit**:
```typescript
const createEventTool = ai.defineTool({
  name: 'createCalendarEvent',
  description: 'Create events in Google Calendar',
  inputSchema: z.object({
    title: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    attendees: z.array(z.string()).optional(),
  }),
});
```

### 3. Web Search Tool (Nuevo)
**Estado**: 🆕 CREAR CON GENKIT

**Setup**:
```bash
mkdir -p src/app/features/tools/web-search/{models,services}
npm install cheerio puppeteer-core @types/cheerio
```

**Herramientas Genkit**:
```typescript
const webSearchTool = ai.defineTool({
  name: 'searchWeb',
  description: 'Search current information on the internet',
  inputSchema: z.object({
    query: z.string(),
    limit: z.number().optional().default(5),
  }),
});
```

### 4. Document Analyzer Tool (Expandir)
**Estado**: 🔄 INTEGRAR CON GENKIT + LLAMA 4 SCOUT

**Setup específico**:
```bash
npm install pdf-parse mammoth @types/pdf-parse
```

**Integración con Llama 4 Scout**:
```typescript
const analyzeDocumentTool = ai.defineTool({
  name: 'analyzeDocument',
  description: 'Analyze PDF, Word docs using Llama 4 Scout multimodal capabilities',
  inputSchema: z.object({
    file: z.string(),
    analysisType: z.enum(['summary', 'extract', 'translate']),
  }),
});
```

## 🤖 Configuración del Agente Llama 4 Scout

### System Prompt Optimizado
```typescript
const SYSTEM_PROMPT = `
Eres un asistente IA avanzado usando Llama 4 Scout con las siguientes capacidades:

HERRAMIENTAS DISPONIBLES:
- uploadToDrive: Subir archivos a Google Drive
- createCalendarEvent: Crear eventos en calendario  
- searchWeb: Buscar información actualizada en internet
- analyzeDocument: Analizar documentos PDF/Word con capacidades multimodales

INSTRUCCIONES:
1. Analiza la solicitud del usuario
2. Identifica si necesitas usar herramientas
3. Usa tool calling para ejecutar acciones
4. Proporciona respuestas contextuales y útiles
5. Mantén conversaciones naturales y fluidas

FORMATO DE TOOL CALLING:
Usa las herramientas cuando sea necesario siguiendo el formato estándar de Genkit.
`;
```

### Flujo Principal del Agente
```typescript
export const chatAgentFlow = ai.defineFlow(
  {
    name: 'chatAgent',
    inputSchema: z.object({
      message: z.string(),
      conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })).optional(),
    }),
    outputSchema: z.string(),
    streamSchema: z.string(), // Para streaming
  },
  async (input, { sendChunk }) => {
    const tools = [
      driveUploadTool,
      createEventTool, 
      webSearchTool,
      analyzeDocumentTool,
    ];

    const { stream, response } = await ai.generateStream({
      model: llama4Scout,
      tools,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...(input.conversationHistory || []),
        { role: 'user', content: input.message }
      ],
    });

    // Stream response chunks
    for await (const chunk of stream) {
      if (chunk.content?.[0]?.text) {
        sendChunk(chunk.content[0].text);
      }
    }

    return (await response).text;
  }
);
```

## 🔧 Comandos de Desarrollo

### Inicializar Genkit en el Proyecto
```bash
# En la raíz del proyecto
genkit init

# Configurar para Angular + Supabase
# Seleccionar: Node.js/TypeScript
# Provider: Groq (community)
# Deployment: Express (para Angular SSR)
```

### Testing y Debugging con Genkit
```bash
# Iniciar Genkit Developer UI
genkit start

# Ejecutar flow específico
genkit flow:run chatAgent '{"message": "Hola, busca información sobre Angular 20"}'

# Testing batch
genkit flow:batchRun chatAgent test-data.json
```

### Desarrollo con Hot Reload
```bash
# Terminal 1: Angular dev server
npm start

# Terminal 2: Genkit en modo desarrollo  
genkit start -- npm run serve:ssr:agent-hums-app
```

## 📊 Búsquedas de Información Requeridas

**USAR TUS HERRAMIENTAS DE BÚSQUEDA** para obtener información actualizada:

### APIs y Configuración
```
Buscar: "Groq API key setup 2025 pricing Llama 4 Scout"
Buscar: "Google Cloud Console OAuth2 configuration Angular 2025"
Buscar: "genkitx-groq plugin latest version configuration examples"
```

### Tool Calling y Streaming
```
Buscar: "Genkit tool calling examples TypeScript 2025"
Buscar: "Llama 4 Scout tool use capabilities multimodal"
Buscar: "Angular SSR streaming response implementation"
```

### Performance y Optimización
```
Buscar: "Groq rate limits best practices"
Buscar: "Genkit deployment optimization Angular production"
Buscar: "Llama 4 Scout vs other models performance comparison"
```

## 🚨 Puntos Críticos

### Configuración
- ✅ **API Keys seguros**: Usar variables de entorno, no hardcodear
- ✅ **Rate Limiting**: Groq tiene límites, implementar throttling
- ✅ **Error Handling**: Respuestas descriptivas para el LLM
- ✅ **Timeouts**: 30s máximo por herramienta

### Performance con Llama 4 Scout
- ⚡ **Context Management**: Llama 4 Scout tiene gran contexto, usarlo eficientemente
- ⚡ **Streaming**: Implementar streaming para mejor UX
- ⚡ **Tool Selection**: Llama 4 Scout es eficiente en tool calling
- ⚡ **Caching**: Cache respuestas frecuentes

### Seguridad
- 🔒 **Input Validation**: Validar todos los inputs con Zod
- 🔒 **OAuth Scopes**: Mínimos permisos necesarios
- 🔒 **CORS**: Configurar correctamente para Angular
- 🔒 **Audit Logs**: Log de operaciones importantes

## 📋 Checklist de Implementación

### Setup Base
- [ ] Genkit CLI instalado globalmente
- [ ] genkitx-groq plugin instalado y configurado
- [ ] Variables de entorno configuradas (GROQ_API_KEY, etc.)
- [ ] Genkit inicializado en el proyecto

### Desarrollo Genkit
- [ ] GenkitAgentService creado
- [ ] chatAgentFlow implementado con Llama 4 Scout
- [ ] Streaming configurado para UI
- [ ] Developer UI funcionando (genkit start)

### Herramientas
- [ ] Google Drive Tool integrada con Genkit
- [ ] Google Calendar Tool implementada
- [ ] Web Search Tool implementada  
- [ ] Document Analyzer con Llama 4 Scout multimodal

### Integración Angular
- [ ] Servicio Angular conectado con Genkit flows
- [ ] Component chat actualizado para streaming
- [ ] Error handling y loading states
- [ ] Tool results renderizados en UI

### Testing y Deployment
- [ ] Tests con Genkit Developer UI
- [ ] Performance testing con Llama 4 Scout
- [ ] Build production configurado
- [ ] Monitoreo básico implementado

---

**NEXT ACTION**: Instalar Genkit y configurar el setup base con Groq + Llama 4 Scout. Usar herramientas de búsqueda para obtener información actualizada sobre las APIs y configuraciones específicas.
