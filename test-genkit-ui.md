# 🧪 Testing Completo - Genkit Developer UI

## 📋 Checklist de Validación

### 1. Verificar Conexión del Sistema
- [ ] Angular Dev Server ejecutándose en http://localhost:4200
- [ ] Genkit Hybrid Server ejecutándose en http://localhost:3001
- [ ] Genkit Developer UI ejecutándose en http://localhost:4000

### 2. Testing en Genkit Developer UI

#### A. Validar Flow Principal: `hybridChatFlow`
1. **Abrir**: http://localhost:4000
2. **Navegar a**: "Flows" section
3. **Seleccionar**: `hybridChatFlow`
4. **Ejecutar tests**:

##### Test 1: Chat Normal (Llama 4 Scout)
```json
{
  "message": "Hola, ¿cómo estás hoy?",
  "conversationHistory": []
}
```
**Esperado**: 
- Uso de Llama 4 Scout (velocidad: ~460 tok/s)
- Respuesta conversacional sin tool calling
- TaskType: CHAT_NORMAL

##### Test 2: Tool Calling (Llama 3.3 70B)
```json
{
  "message": "Busca información actual sobre Angular 20 en internet",
  "conversationHistory": []
}
```
**Esperado**:
- Uso de Llama 3.3 70B Versatile
- Activación de webSearchTool
- TaskType: TOOL_CALLING

##### Test 3: Análisis Complejo (Llama 3.3 70B)
```json
{
  "message": "Analiza este documento PDF y extrae las conclusiones principales",
  "conversationHistory": []
}
```
**Esperado**:
- Uso de Llama 3.3 70B Versatile
- Activación de documentAnalyzerTool
- TaskType: COMPLEX_ANALYSIS

### 3. Validar Herramientas Mock

#### Tool 1: driveManagerTool
```json
{
  "message": "Sube este archivo a Google Drive en la carpeta 'Proyectos'",
  "conversationHistory": []
}
```

#### Tool 2: calendarManagerTool
```json
{
  "message": "Crea un evento en mi calendario para mañana a las 3 PM sobre reunión de equipo",
  "conversationHistory": []
}
```

#### Tool 3: webSearchTool
```json
{
  "message": "Busca las últimas noticias sobre inteligencia artificial",
  "conversationHistory": []
}
```

#### Tool 4: documentAnalyzerTool
```json
{
  "message": "Analiza este PDF y dame un resumen ejecutivo",
  "conversationHistory": []
}
```

### 4. Validar Routing Inteligente

#### Keywords para TOOL_CALLING:
- "busca", "buscar", "search"
- "sube", "subir", "upload" 
- "crea evento", "calendar"
- "analiza", "analyze"

#### Keywords para COMPLEX_ANALYSIS:
- "analiza documento", "analyze document"
- "extrae conclusiones", "extract"
- "resumen ejecutivo", "summary"
- "comparativa", "compare"

### 5. Verificar Logs y Debugging

#### En Terminal del Servidor Híbrido:
- [ ] Logs de routing decision
- [ ] Logs de model selection
- [ ] Logs de tool activation
- [ ] Error handling proper

#### En Genkit Developer UI:
- [ ] Flow execution traces
- [ ] Model response times
- [ ] Tool call results
- [ ] Error messages claros

### 6. Performance Validation

#### Tiempos Esperados:
- **Llama 4 Scout**: ~460 tokens/segundo
- **Llama 3.3 70B**: ~276 tokens/segundo
- **Tool Response**: < 5 segundos
- **Total Response**: < 10 segundos

#### Costos Esperados:
- **Chat Normal**: $0.11/M tokens
- **Tool Calling**: $0.59/M tokens
- **Análisis Complejo**: $0.59/M tokens

## 🐛 Troubleshooting Common Issues

### Error: "Flow not found"
- Verificar que el servidor híbrido esté ejecutándose
- Revisar logs en terminal del servidor
- Reiniciar Genkit UI

### Error: "Model not available"
- Verificar GROQ_API_KEY en .env
- Comprobar límites de rate en Groq
- Verificar conexión a internet

### Error: "Tool execution failed"
- Revisar schemas Zod de herramientas
- Verificar que los parámetros son válidos
- Comprobar logs de herramientas mock

### Error: "Unsupported part type"
- Ya corregido en servidor híbrido
- Verificar formato de mensajes en Groq

## ✅ Criterios de Éxito

1. **Routing funciona**: Diferentes tipos de tareas usan diferentes modelos
2. **Tools se activan**: Herramientas mock responden correctamente
3. **Performance adecuada**: Tiempos de respuesta dentro de rangos
4. **No errores**: Sistema estable sin crashes
5. **Logs claros**: Debugging information disponible

## 🎯 Próximos Pasos Después del Testing

1. **Implementar herramientas reales**: Reemplazar mocks con APIs
2. **Conectar frontend Angular**: Integrar con chat interface
3. **Optimizar prompts**: Ajustar system prompts por modelo
4. **Configurar APIs externas**: Google Drive, Calendar, etc.
5. **Deploy y monitoreo**: Preparar para producción
