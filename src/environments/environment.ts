/**
 * Environment Configuration for Development
 * Angular 20 Environment Setup
 */

export const environment = {
  production: false,
  
  // API Configuration
  api: {
    baseUrl: 'http://localhost:3001',
    timeout: 30000,
  },
  
  // Claude Server Configuration
  claude: {
    serverUrl: 'http://localhost:3001',
    endpoints: {
      chat: '/chatFlow',
      health: '/health'
    }
  },
  
  // Supabase Configuration (if needed)
  supabase: {
    url: '',
    anonKey: ''
  },
  
  // Feature Flags
  features: {
    enableWebSearch: true,
    enableFileUploads: true,
    enableStreamingChat: true,
    enableDebugMode: true
  },
  
  // Logging Configuration
  logging: {
    level: 'debug',
    enableConsoleLogging: true
  }
};
