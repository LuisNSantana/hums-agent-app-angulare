/**
 * Mock Response Service - Simulates Anthropic API responses for testing
 * Used when Anthropic API is down (529 errors) or in development mode
 */

export interface MockToolCall {
  toolName: string;
  status: 'success' | 'pending' | 'error';
  executionTime?: number;
}

export interface MockResponse {
  success: boolean;
  message: string;
  conversationId: string;
  toolCalls?: MockToolCall[];
  error?: string;
}

export class MockResponseService {
  
  /**
   * Generate a mock response that simulates tool usage
   * This helps test the UI tool indicators when Anthropic API is down
   */
  static generateMockResponse(userMessage: string, conversationId: string): MockResponse {
    console.log('🎭 [MockResponseService] Generating mock response for testing UI');
    
    // Analyze user message to determine which tools to mock
    const toolsToMock = this.determineMockTools(userMessage);
    
    // Generate a realistic response
    const mockMessage = this.generateMockMessage(userMessage, toolsToMock);
    
    return {
      success: true,
      message: mockMessage,
      conversationId: conversationId,
      toolCalls: toolsToMock.map(tool => ({
        toolName: tool,
        status: 'success' as const,
        executionTime: Math.floor(Math.random() * 2000) + 500 // 500-2500ms
      }))
    };
  }

  /**
   * Determine which tools to mock based on user message content
   */
  private static determineMockTools(userMessage: string): string[] {
    const message = userMessage.toLowerCase();
    const tools: string[] = [];

    // Web search indicators
    if (message.includes('busca') || message.includes('search') || 
        message.includes('noticias') || message.includes('news') ||
        message.includes('información') || message.includes('últimas')) {
      tools.push('brave_search');
    }

    // Calendar indicators
    if (message.includes('calendario') || message.includes('calendar') ||
        message.includes('reunión') || message.includes('meeting') ||
        message.includes('cita') || message.includes('evento')) {
      tools.push('google_calendar');
    }

    // Drive indicators
    if (message.includes('drive') || message.includes('documento') ||
        message.includes('archivo') || message.includes('file') ||
        message.includes('pdf') || message.includes('guardar')) {
      tools.push('google_drive');
    }

    // Document analysis indicators
    if (message.includes('analiza') || message.includes('analyze') ||
        message.includes('resumen') || message.includes('summary') ||
        message.includes('extracto')) {
      tools.push('document_analysis');
    }

    // Default to web search if no specific tools detected
    if (tools.length === 0) {
      tools.push('brave_search');
    }

    return tools;
  }

  /**
   * Generate a realistic mock message response
   */
  private static generateMockMessage(userMessage: string, tools: string[]): string {
    const message = userMessage.toLowerCase();
    
    // Argentina news specific response
    if (message.includes('argentina') && (message.includes('noticias') || message.includes('news'))) {
      return `**🔍 Búsqueda de Noticias de Argentina**

He realizado una búsqueda de las últimas noticias de Argentina. Aquí tienes un resumen de los acontecimientos más importantes:

**📈 Economía**
- El peso argentino muestra signos de estabilización tras las últimas medidas económicas
- Inflación mensual registra una ligera disminución según datos preliminares
- Exportaciones de productos agrícolas mantienen tendencia positiva

**🏛️ Política**
- El gobierno anuncia nuevas reformas en el sector público
- Diálogo entre partidos políticos sobre agenda legislativa prioritaria
- Provincias coordinan estrategias para desarrollo regional

**⚽ Deportes**
- La selección argentina prepara próximos compromisos internacionales
- Liga profesional: resultados y posiciones actualizadas
- Deportistas argentinos destacan en competencias internacionales

**🌡️ Clima**
- Pronóstico favorable para la región pampeana
- Alertas meteorológicas para algunas provincias del norte
- Temperaturas dentro de parámetros normales para la época

*Nota: Esta es una respuesta simulada para testing. En modo normal, obtendría información real y actualizada.*`;
    }

    // General response based on tools used
    let response = `He procesado tu consulta utilizando las siguientes herramientas:\n\n`;
    
    tools.forEach(tool => {
      switch (tool) {
        case 'brave_search':
          response += `🔍 **Búsqueda Web**: Encontré información relevante en internet\n`;
          break;
        case 'google_calendar':
          response += `📅 **Google Calendar**: Revisé tu calendario para eventos relacionados\n`;
          break;
        case 'google_drive':
          response += `📄 **Google Drive**: Accedí a documentos en tu Drive\n`;
          break;
        case 'document_analysis':
          response += `📊 **Análisis de Documentos**: Procesé documentos adjuntos\n`;
          break;
      }
    });

    response += `\n**Respuesta Simulada**\n`;
    response += `Esta es una respuesta de prueba generada mientras la API de Anthropic experimenta problemas de sobrecarga (error 529). `;
    response += `En condiciones normales, recibirías información real y actualizada basada en tu consulta: "${userMessage}"\n\n`;
    response += `🎭 **Modo Testing Activo**: Los indicadores de herramientas y badges deberían aparecer correctamente en la interfaz.`;

    return response;
  }

  /**
   * Simulate a gradual tool execution for realistic UI testing
   */
  static async simulateToolExecution(toolName: string): Promise<void> {
    const executionTime = Math.floor(Math.random() * 1500) + 800; // 800-2300ms
    console.log(`🛠️ [MockResponseService] Simulating ${toolName} execution for ${executionTime}ms`);
    await new Promise(resolve => setTimeout(resolve, executionTime));
  }

  /**
   * Check if we should use mock mode based on configuration and error history
   */
  static shouldUseMockMode(config: any, recentErrors: any[] = []): boolean {
    // Always use mock if explicitly enabled
    if (config.enableMockMode) {
      return true;
    }

    // Use mock if we've had multiple 529 errors recently
    const recent529Errors = recentErrors.filter(error => 
      error.status === 529 || error.message?.includes('overloaded')
    );

    return recent529Errors.length >= 3;
  }
}
