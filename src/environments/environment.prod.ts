/**
 * Environment Configuration for Production
 * Angular 20 Environment Setup
 */

export const environment = {
  production: true,
  
  // API Configuration
  api: {
    baseUrl: 'https://your-production-api.com',
    timeout: 30000,
  },
  
  // Claude Server Configuration
  claude: {
    serverUrl: 'https://your-production-api.com',
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
    enableDebugMode: false
  },
  
  // Logging Configuration
  logging: {
    level: 'error',
    enableConsoleLogging: false
  }
};
