# 🚀 Guía de Implementación: Sistema de Herramientas para HumsAI Agent

## 📋 Overview del Proyecto

**Proyecto**: HumsAI Agent - Chat IA con capacidades avanzadas
**Tech Stack**: Angular 20 + Supabase + TypeScript
**Objetivo**: Implementar sistema de herramientas (tools) que permita al agente ejecutar acciones específicas

## 🎯 Tareas Inmediatas

### 1. CREAR INTERFACES CORE
**Ubicación**: `src/app/core/interfaces/`

**Comando para crear archivos**:
```bash
touch src/app/core/interfaces/tool.interface.ts
touch src/app/core/interfaces/tool-result.interface.ts
touch src/app/core/interfaces/index.ts
```

**Archivos a crear**:
- `tool.interface.ts` - Interfaz base para todas las herramientas
- `tool-result.interface.ts` - Estructura de respuesta estándar
- `index.ts` - Export barrel

### 2. CREAR SERVICIO REGISTRY
**Ubicación**: `src/app/core/services/`

**Comando**:
```bash
ng generate service core/services/tool-registry
```

**Función**: Registrar y gestionar todas las herramientas disponibles

### 3. IMPLEMENTAR HERRAMIENTAS PRIORITARIAS

#### A. Google Drive Tool (YA INICIADA)
**Ubicación**: `src/app/features/tools/google-drive/`
**Funciones**: Subir, listar, buscar, compartir archivos

#### B. Google Calendar Tool (NUEVA)
**Comando**:
```bash
mkdir -p src/app/features/tools/google-calendar/{models,services}
touch src/app/features/tools/google-calendar/google-calendar.tool.ts
touch src/app/features/tools/google-calendar/services/calendar-api.service.ts
```

#### C. Web Search Tool (NUEVA)
**Comando**:
```bash
mkdir -p src/app/features/tools/web-search/{models,services}
touch src/app/features/tools/web-search/web-search.tool.ts
touch src/app/features/tools/web-search/services/search-api.service.ts
```

#### D. Document Analyzer Tool (YA INICIADA)
**Ubicación**: `src/app/features/tools/document-analyzer/`
**Funciones**: Analizar PDFs, Word, extraer contenido

## 🔧 Dependencias Requeridas

### NPM Packages
```bash
npm install @google-cloud/storage googleapis @google/generative-ai
npm install cheerio puppeteer-core
npm install pdf-parse mammoth
npm install @types/cheerio @types/pdf-parse
```

### APIs Externas Necesarias
- Google Drive API
- Google Calendar API
- Brave Search API (para búsquedas web)
- Google Gemini API (para análisis de documentos)

## 📁 Estructura de Archivo por Herramienta

```
features/tools/[tool-name]/
├── [tool-name].tool.ts           # Implementación principal
├── services/
│   └── [tool-name]-api.service.ts # Lógica de API
├── models/
│   ├── [tool-name].types.ts       # Tipos específicos
│   └── [tool-name]-config.ts      # Configuración
└── README.md                      # Documentación específica
```

## 🤖 Integración con LLM

### Sistema de Decisión
1. **Usuario envía mensaje**
2. **LLM analiza intención**
3. **Si necesita herramienta → Identifica cual**
4. **Extrae parámetros → Valida**
5. **Ejecuta herramienta → Procesa resultado**
6. **Formatea respuesta → Entrega al usuario**

### Prompt Structure para Tools
```
HERRAMIENTAS DISPONIBLES:
- google-drive: Gestionar archivos en Google Drive
- google-calendar: Manejar eventos y calendario
- web-search: Buscar información actualizada en internet
- document-analyzer: Analizar contenido de documentos

Para usar una herramienta, responde en formato JSON:
{
  "tool": "tool-id",
  "params": { ...parámetros },
  "reasoning": "Explicación de por qué elegí esta herramienta"
}
```

## 🛠️ Pasos de Implementación

### PASO 1: Interfaces Base
```typescript
// tool.interface.ts
export interface Tool {
  id: string;
  name: string;
  description: string;
  parameters: ToolParameter[];
  examples: ToolExample[];
  
  initialize(): Promise<boolean>;
  execute(params: any): Promise<ToolResult>;
  validate(params: any): ValidationResult;
}
```

### PASO 2: Tool Registry Service
```typescript
// tool-registry.service.ts
@Injectable({ providedIn: 'root' })
export class ToolRegistryService {
  private tools = new Map<string, Tool>();
  
  registerTool(tool: Tool): void
  getTool(id: string): Tool | undefined
  getAllTools(): Tool[]
  executeToolAction(toolId: string, params: any): Promise<ToolResult>
}
```

### PASO 3: Implementar Google Drive Tool
- Configurar Google Drive API
- Implementar métodos: upload, list, search, share
- Validar parámetros y permisos
- Manejar errores y respuestas

### PASO 4: Implementar Google Calendar Tool
- Configurar Google Calendar API
- Implementar métodos: create, list, update, delete events
- Buscar horarios libres
- Enviar invitaciones

### PASO 5: Implementar Web Search Tool
- Integrar Brave Search API
- Implementar búsqueda web
- Procesar y filtrar resultados
- Extraer contenido relevante

### PASO 6: Implementar Document Analyzer Tool
- Configurar procesadores (PDF, Word, etc.)
- Implementar análisis de contenido
- Extraer texto y metadatos
- Generar resúmenes

## 🔍 Búsquedas de Información Requeridas

### Para Google APIs
**Usar herramienta de búsqueda**: Busca información actualizada sobre:
- "Google Drive API v3 authentication Angular 2024"
- "Google Calendar API integration TypeScript"
- "Google OAuth2 setup Angular application"

### Para Document Processing
**Usar herramienta de búsqueda**: Busca información sobre:
- "pdf-parse npm library usage examples"
- "mammoth js Word document processing"
- "Google Gemini API document analysis"

### Para Web Search
**Usar herramienta de búsqueda**: Busca información sobre:
- "Brave Search API integration JavaScript"
- "Web scraping with Puppeteer Angular"
- "Cheerio HTML parsing best practices"

## 📋 Checklist de Verificación

- [ ] Interfaces core creadas
- [ ] Tool Registry Service implementado
- [ ] Google Drive Tool funcional
- [ ] Google Calendar Tool funcional  
- [ ] Web Search Tool funcional
- [ ] Document Analyzer Tool funcional
- [ ] Todas las herramientas registradas
- [ ] Validación de parámetros implementada
- [ ] Manejo de errores configurado
- [ ] Tests básicos creados
- [ ] Documentación actualizada

## 🚨 Puntos Críticos

1. **Autenticación**: Todas las herramientas deben manejar OAuth correctamente
2. **Rate Limiting**: Implementar límites para evitar abuse de APIs
3. **Error Handling**: Respuestas descriptivas para el LLM
4. **Security**: Validar todos los inputs antes de procesarlos
5. **Performance**: Timeouts y optimizaciones para respuestas rápidas

## 💡 Comandos Útiles

```bash
# Generar nueva herramienta
ng generate service features/tools/[tool-name]/[tool-name]

# Instalar dependencias específicas
npm install [package-name]

# Ejecutar en desarrollo
npm start

# Build para producción
npm run build
```

## 🔗 Enlaces de Referencia

- [Google Drive API Docs](https://developers.google.com/drive/api)
- [Google Calendar API Docs](https://developers.google.com/calendar/api)
- [Brave Search API Docs](https://brave.com/search/api/)
- [Angular 20 Documentation](https://angular.dev/)

---

**IMPORTANTE**: Cada herramienta debe ser independiente, reutilizable y documentada para que el LLM pueda usarla efectivamente. Prioriza simplicidad y claridad sobre funcionalidad compleja.
