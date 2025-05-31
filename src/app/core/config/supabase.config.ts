/**
 * Supabase Configuration
 * Contains all Supabase-related configuration for the Agent Hums application
 */

export const supabaseConfig = {
  url: 'https://wbhcwkxvgcexctpxohpy.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiaGN3a3h2Z2NleGN0cHhvaHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MDEyMzQsImV4cCI6MjA2NDI3NzIzNH0.Vz5rEVASE32agvwHNGBhKCwwgz66MNr1c61504q2_fU',
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
} as const;

export type SupabaseConfig = typeof supabaseConfig;
