/**
 * Main Prompt Builder for Agent Hums
 * Combines all prompt components into a comprehensive system prompt
 */

import { BASE_SYSTEM_PROMPT } from './base-system.prompt';
import { TOOL_USAGE_GUIDELINES } from './tool-usage.prompt';
import { CONVERSATION_PATTERNS } from './conversation-patterns.prompt';
import { CONVERSATION_EXAMPLES } from './conversation-examples.prompt';

/**
 * Builds the complete system prompt for Agent Hums
 * @param includeExamples - Whether to include conversation examples (default: true)
 * @param includeDateTime - Whether to include current date/time context (default: true)
 * @returns Complete system prompt string
 */
export function buildSystemPrompt(
  includeExamples: boolean = true,
  includeDateTime: boolean = true
): string {
  const currentDate = new Date();
  const dateContext = includeDateTime 
    ? `\n\n## CONTEXTO TEMPORAL ACTUAL
- **Fecha actual:** ${currentDate.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}
- **Hora actual:** ${currentDate.toLocaleTimeString('es-ES')}
- **Zona horaria:** ${Intl.DateTimeFormat().resolvedOptions().timeZone}

IMPORTANTE: Tienes esta información temporal integrada. NO uses herramientas para consultas básicas de fecha/hora.`
    : '';

  const examplesSection = includeExamples 
    ? `\n\n${CONVERSATION_EXAMPLES}`
    : '';

  return `${BASE_SYSTEM_PROMPT}${dateContext}

${TOOL_USAGE_GUIDELINES}

${CONVERSATION_PATTERNS}${examplesSection}

## INSTRUCCIONES FINALES
1. **PIENSA ANTES DE ACTUAR:** Evalúa si realmente necesitas una herramienta
2. **SÉ EFICIENTE:** Responde directamente cuando puedas
3. **SÉ ÚTIL:** Usa herramientas cuando agreguen valor real
4. **SÉ NATURAL:** Mantén conversaciones fluidas y amigables
5. **SÉ PROACTIVO:** Ofrece seguimiento relevante

¡Ahora estás listo para ser el mejor asistente posible! 🚀`;
}

/**
 * Builds a lightweight version of the system prompt
 * For scenarios where token efficiency is crucial
 */
export function buildLightweightPrompt(): string {
  const currentDate = new Date();
  
  return `Eres Agent Hums, asistente IA amigable y eficiente.

FECHA ACTUAL: ${currentDate.toLocaleDateString('es-ES')} - NO uses herramientas para consultas básicas de fecha/hora.

HERRAMIENTAS: Úsalas SOLO cuando sean realmente necesarias:
- searchWeb: Para información actualizada específica
- listCalendarEvents: Para consultar agenda en fechas específicas  
- listDriveFiles: Para explorar archivos específicos
- refreshGoogleTokens: Solo si hay errores de autenticación

RESPONDE: De forma directa, amigable y en español. Piensa antes de usar herramientas.`;
}

/**
 * Builds context-aware prompt based on conversation history
 * @param hasUsedTools - Whether tools have been used in recent conversation
 * @param conversationLength - Number of messages in current conversation
 */
export function buildContextAwarePrompt(
  hasUsedTools: boolean = false,
  conversationLength: number = 0
): string {
  const basePrompt = buildSystemPrompt(false, true);
  
  if (conversationLength === 0) {
    // First message - include greeting guidance
    return `${basePrompt}

## CONTEXTO: PRIMERA INTERACCIÓN
Este es el primer mensaje de la conversación. Sé acogedor y explica brevemente tus capacidades.`;
  }
  
  if (hasUsedTools) {
    // Tools recently used - emphasize efficiency
    return `${basePrompt}

## CONTEXTO: HERRAMIENTAS USADAS RECIENTEMENTE  
Ya has usado herramientas en esta conversación. Evita usarlas nuevamente a menos que sea absolutamente necesario.`;
  }
  
  return basePrompt;
}

// Export all individual components for flexibility
export {
  BASE_SYSTEM_PROMPT,
  TOOL_USAGE_GUIDELINES,
  CONVERSATION_PATTERNS,
  CONVERSATION_EXAMPLES
};
