/**
 * Supabase Database Types
 * Auto-generated types from Supabase CLI
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_models: {
        Row: {
          configuration: Json | null
          context_window: number | null
          created_at: string
          description: string | null
          id: string
          is_available: boolean | null
          max_tokens: number | null
          model_id: string
          name: string
          provider: string
          updated_at: string
        }
        Insert: {
          configuration?: Json | null
          context_window?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean | null
          max_tokens?: number | null
          model_id: string
          name: string
          provider: string
          updated_at?: string
        }
        Update: {
          configuration?: Json | null
          context_window?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean | null
          max_tokens?: number | null
          model_id?: string
          name?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_shares: {
        Row: {
          conversation_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_public: boolean | null
          share_token: string
          shared_by: string
          view_count: number | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_public?: boolean | null
          share_token?: string
          shared_by: string
          view_count?: number | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_public?: boolean | null
          share_token?: string
          shared_by?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_shares_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          ai_model_id: string | null
          created_at: string
          id: string
          is_archived: boolean | null
          message_count: number | null
          settings: Json | null
          system_prompt: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model_id?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean | null
          message_count?: number | null
          settings?: Json | null
          system_prompt?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_model_id?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean | null
          message_count?: number | null
          settings?: Json | null
          system_prompt?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_ai_model_id_fkey"
            columns: ["ai_model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          message_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          message_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          message_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          metadata: Json | null
          parent_message_id: string | null
          role: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          metadata?: Json | null
          parent_message_id?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          metadata?: Json | null
          parent_message_id?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          preferences: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          preferences?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          preferences?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

// Type helpers for easy access to table data
export type AIModel = Tables<'ai_models'>
export type Conversation = Tables<'conversations'>
export type Message = Tables<'messages'>
export type Profile = Tables<'profiles'>
export type ConversationShare = Tables<'conversation_shares'>
export type MessageAttachment = Tables<'message_attachments'>

// Insert types
export type AIModelInsert = TablesInsert<'ai_models'>
export type ConversationInsert = TablesInsert<'conversations'>
export type MessageInsert = TablesInsert<'messages'>
export type ProfileInsert = TablesInsert<'profiles'>

// Update types
export type AIModelUpdate = TablesUpdate<'ai_models'>
export type ConversationUpdate = TablesUpdate<'conversations'>
export type MessageUpdate = TablesUpdate<'messages'>
export type ProfileUpdate = TablesUpdate<'profiles'>
