/**
 * Environment Configuration
 * Manejo centralizado de variables de entorno y configuración del servidor
 */

import 'dotenv/config';

export interface ServerConfig {
  anthropicApiKey: string;
  braveSearchApiKey: string;
  port: number;
  corsOrigins: string[];
  isDevelopment: boolean;
}

export class EnvironmentConfig {
  private static config: ServerConfig;

  static getConfig(): ServerConfig {
    if (!this.config) {
      this.config = this.createConfig();
    }
    return this.config;
  }
  static validate(): void {
    const config = this.getConfig();
    console.log('🔑 Environment Variables Check:');
    console.log('- ANTHROPIC_API_KEY:', config.anthropicApiKey ? `${config.anthropicApiKey.substring(0, 8)}...` : 'NOT FOUND (will use mock mode)');
    console.log('- BRAVE_SEARCH_API_KEY:', config.braveSearchApiKey ? `${config.braveSearchApiKey.substring(0, 8)}...` : 'NOT FOUND (will use mock mode)');
    console.log(`- PORT: ${config.port}`);
    console.log(`- ENVIRONMENT: ${config.isDevelopment ? 'development' : 'production'}`);
    
    // Warning for missing keys but don't throw error in development
    if (!config.anthropicApiKey || !config.braveSearchApiKey) {
      console.warn('⚠️ WARNING: Missing API keys. Server will run in mock mode.');
      console.warn('⚠️ Add ANTHROPIC_API_KEY and BRAVE_SEARCH_API_KEY to .env for full functionality.');
    }
  }

  static getExpressPort(): number {
    return this.getConfig().port;
  }

  static getGenkitPort(): number {
    return this.getConfig().port + 1; // Genkit port is Express port + 1
  }

  static getGenkitConfig() {
    const config = this.getConfig();
    return {
      model: null, // Will be set by genkit.config.ts
      anthropicApiKey: config.anthropicApiKey
    };
  }

  static getFrontendUrl(): string {
    return process.env['FRONTEND_URL'] || 'http://localhost:4200';
  }
  private static createConfig(): ServerConfig {
    const ANTHROPIC_API_KEY = process.env['ANTHROPIC_API_KEY'] || 'mock-anthropic-key';
    const BRAVE_SEARCH_API_KEY = process.env['BRAVE_SEARCH_API_KEY'] || 'mock-brave-key';
    const PORT = parseInt(process.env['PORT'] || '3001');
    const NODE_ENV = process.env['NODE_ENV'] || 'development';

    // En modo desarrollo, permitir keys mockeadas
    if (NODE_ENV === 'development' && (!process.env['ANTHROPIC_API_KEY'] || !process.env['BRAVE_SEARCH_API_KEY'])) {
      console.warn('⚠️ Using mock API keys in development mode');
    }

    return {
      anthropicApiKey: ANTHROPIC_API_KEY,
      braveSearchApiKey: BRAVE_SEARCH_API_KEY,
      port: PORT,
      corsOrigins: ['http://localhost:4200', 'http://localhost:3000'],
      isDevelopment: NODE_ENV === 'development'
    };  }
}

// Legacy exports for backwards compatibility
export const createServerConfig = (): ServerConfig => {
  return EnvironmentConfig.getConfig();
};

export const validateEnvironment = (config: ServerConfig): void => {
  EnvironmentConfig.validate();
};

export const logServerInfo = (config: ServerConfig): void => {
  console.log('🚀 AGENT HUMS - CLAUDE 3.5 SONNET SERVER');
  console.log('🤖 Model: Claude 3.5 Sonnet (Advanced reasoning + tool calling)');
  console.log('🔍 Search: Brave Search API (Real-time web search)');
  console.log('📄 Document Analysis: PDF parsing with Claude 3.5 Sonnet');
  console.log(`🌐 Server: http://localhost:${EnvironmentConfig.getExpressPort()}`);
  console.log('📅 Google Calendar integration: Enabled');
  console.log('📁 Google Drive integration: Enabled');
};
