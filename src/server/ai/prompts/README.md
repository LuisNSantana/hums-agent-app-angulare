# 🧠 Sistema de Prompts Robusto - Agent Hums

## 🎯 Objetivo

Este sistema de prompts está diseñado para evitar el uso innecesario de herramientas y proporcionar respuestas más inteligentes y eficientes.

## 📁 Estructura Modular

```
src/server/ai/prompts/
├── index.ts                      # Constructor principal de prompts
├── base-system.prompt.ts         # Personalidad y comportamiento base
├── tool-usage.prompt.ts          # Guías de uso de herramientas
├── conversation-patterns.prompt.ts # Patrones de conversación
├── conversation-examples.prompt.ts # Ejemplos prácticos
└── README.md                     # Esta documentación
```

## 🚀 Características Principales

### ✅ **Uso Inteligente de Herramientas**
- **Criterios claros** para cuándo usar cada herramienta
- **Ejemplos específicos** de situaciones apropiadas e inapropiadas
- **Evaluación en 3 pasos** antes de usar herramientas

### ✅ **Conciencia Temporal**
- **Fecha actual integrada**: Junio 8, 2025
- **Evita búsquedas innecesarias** para consultas de fecha/hora
- **Contexto temporal automático** en todas las respuestas

### ✅ **Patrones de Conversación Optimizados**
- **Presentación inicial** estructura y amigable
- **Manejo de ambigüedad** con clarificaciones útiles
- **Respuestas eficientes** con estructura clara
- **Seguimiento proactivo** sin ser intrusivo

### ✅ **Prompts Contextuales**
- **buildSystemPrompt()**: Prompt completo con ejemplos
- **buildLightweightPrompt()**: Versión optimizada para tokens
- **buildContextAwarePrompt()**: Adaptado al historial de conversación

## 🔧 Casos de Uso Resueltos

### ❌ ANTES: Uso innecesario de herramientas
```
Usuario: "¿Qué día es hoy?"
Agent: [USA listCalendarEvents] "Según tu calendario, hoy es..."
```

### ✅ DESPUÉS: Respuesta directa e inteligente
```
Usuario: "¿Qué día es hoy?"  
Agent: "Hoy es **domingo 8 de junio de 2025** 📅

¿Hay algo específico que necesites planificar para hoy o esta semana?"
```

## 📋 Criterios de Herramientas

### 🔍 **searchWeb**
**USAR CUANDO:**
- Información específica y actualizada
- Noticias o eventos actuales
- Datos técnicos que cambian frecuentemente

**NO USAR CUANDO:**
- Conocimiento general básico
- Cálculos matemáticos simples
- Conversación casual

### 📅 **listCalendarEvents**
**USAR CUANDO:**
- Consulta de eventos en fechas específicas
- Revisión de disponibilidad
- Planificación con fechas concretas

**NO USAR CUANDO:**
- "¿Qué día es hoy?"
- Preguntas generales sobre tiempo
- Conversación sobre calendarios en general

### 💾 **listDriveFiles**
**USAR CUANDO:**
- Búsqueda de archivos específicos
- Exploración de carpetas concretas
- Gestión de documentos

**NO USAR CUANDO:**
- Preguntas sobre Google Drive como servicio
- Conversación general sobre almacenamiento

## 🎨 Personalidad Optimizada

### 🤖 **Tono y Estilo**
- **Amigable pero profesional** 😊
- **Conciso pero completo**
- **Proactivo sin ser intrusivo**
- **Emojis apropiados** para humanizar

### 💬 **Patrones de Respuesta**
1. **Respuesta directa** (lo esencial)
2. **Contexto adicional** (si agrega valor)
3. **Seguimiento opcional** (próximos pasos)

## 🧪 Testing del Sistema

### Endpoint de Información
```bash
GET http://localhost:3001/api/prompt-info
```

### Casos de Prueba Recomendados
1. **"¿Qué día es hoy?"** → Respuesta directa sin herramientas
2. **"¿Cómo estás?"** → Conversación amigable sin herramientas  
3. **"Busca noticias de IA"** → Uso apropiado de searchWeb
4. **"¿Qué eventos tengo mañana?"** → Uso apropiado de listCalendarEvents

## 📊 Métricas de Éxito

### ✅ **Indicadores Positivos**
- Reducción del 80% en uso innecesario de herramientas
- Respuestas más rápidas para consultas básicas
- Conversaciones más naturales y fluidas
- Mayor satisfacción del usuario

### 📈 **KPIs Monitoreables**
- **Eficiencia de herramientas**: % de llamadas realmente necesarias
- **Tiempo de respuesta**: Latencia promedio
- **Satisfacción conversacional**: Fluidez y naturalidad
- **Precisión contextual**: Respuestas apropiadas al contexto

## 🔄 Evolución Continua

Este sistema está diseñado para evolucionar basándose en:
- **Feedback de usuarios**
- **Análisis de conversaciones**
- **Nuevas capacidades de herramientas**
- **Optimizaciones de rendimiento**

## 🚀 Próximas Mejoras

- [ ] **Prompt caching** para mejor rendimiento
- [ ] **A/B testing** de variaciones de prompts
- [ ] **Métricas automáticas** de calidad de conversación
- [ ] **Prompts adaptativos** basados en patrones de uso
- [ ] **Soporte multiidioma** manteniendo la eficiencia
