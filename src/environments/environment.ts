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
  },  // Claude Server Configuration
  claude: {
    serverUrl: 'http://localhost:3001', // Express server port for chat (unified)
    expressUrl: 'http://localhost:3001', // Express server port for health/info
    endpoints: {
      chat: '/api/chat', // Corrected Express endpoint
      health: '/health'    // Express endpoint
    }
  },
  
  // Supabase Configuration (if needed)
  supabase: {
    url: '',
    anonKey: ''
  },
    // Google OAuth Configuration
  googleClientId: process.env['GOOGLE_CLIENT_ID'] || '',
  googleClientSecret: process.env['GOOGLE_CLIENT_SECRET'] || '',
  googleScopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive'
  ],
  
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
