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
  },  // Claude Server Configuration
  claude: {
    serverUrl: 'https://your-production-api.com', // Express server for chat (unified)
    expressUrl: 'https://your-production-api.com', // Express server for health/info
    endpoints: {
      chat: '/api/chat', // Express endpoint
      health: '/health'    // Express endpoint
    }  },
  
  // Supabase Configuration (using external config)
  supabase: {
    url: 'https://wbhcwkxvgcexctpxohpy.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiaGN3a3h2Z2NleGN0cHhvaHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MDEyMzQsImV4cCI6MjA2NDI3NzIzNH0.Vz5rEVASE32agvwHNGBhKCwwgz66MNr1c61504q2_fU'
  },
  
  // Google OAuth Configuration - Handled by Supabase Auth
  // Note: Google OAuth is configured in Supabase dashboard, not here
  googleScopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive'
  ],
  
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
