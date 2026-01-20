export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_grants: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          notes: string | null
          plan: string
          source: string
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          notes?: string | null
          plan: string
          source?: string
          starts_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          notes?: string | null
          plan?: string
          source?: string
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      allowed_pairs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          rank: number
          symbol: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          rank: number
          symbol: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          rank?: number
          symbol?: string
        }
        Relationships: []
      }
      candles: {
        Row: {
          close: number
          created_at: string | null
          high: number
          id: string
          low: number
          open: number
          open_time: string
          pair_id: string
          timeframe: string
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          high: number
          id?: string
          low: number
          open: number
          open_time: string
          pair_id: string
          timeframe: string
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          high?: number
          id?: string
          low?: number
          open?: number
          open_time?: string
          pair_id?: string
          timeframe?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "candles_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "allowed_pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          id: string
          is_admin: boolean
          language: string
          plan: string
          referral_code: string
          referred_by: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_admin?: boolean
          language?: string
          plan?: string
          referral_code: string
          referred_by?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_admin?: boolean
          language?: string
          plan?: string
          referral_code?: string
          referred_by?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          approved_at: string | null
          created_at: string
          id: string
          notes: string | null
          referee_user_id: string
          referrer_user_id: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          referee_user_id: string
          referrer_user_id: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          referee_user_id?: string
          referrer_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referee_user_id_fkey"
            columns: ["referee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referrals_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      signals: {
        Row: {
          analysis: string | null
          closed_at: string | null
          confidence: number | null
          created_at: string
          direction: string
          entry_price: number
          expires_at: string | null
          grade: string
          id: string
          meta: Json | null
          outcome_price: number | null
          outcome_tp: number | null
          pair_id: string
          pnl_percent: number | null
          setup: string | null
          status: string
          stop_loss: number
          take_profit_1: number
          take_profit_2: number
          take_profit_3: number
          timeframe: string
        }
        Insert: {
          analysis?: string | null
          closed_at?: string | null
          confidence?: number | null
          created_at?: string
          direction: string
          entry_price: number
          expires_at?: string | null
          grade: string
          id?: string
          meta?: Json | null
          outcome_price?: number | null
          outcome_tp?: number | null
          pair_id: string
          pnl_percent?: number | null
          setup?: string | null
          status?: string
          stop_loss: number
          take_profit_1: number
          take_profit_2: number
          take_profit_3: number
          timeframe: string
        }
        Update: {
          analysis?: string | null
          closed_at?: string | null
          confidence?: number | null
          created_at?: string
          direction?: string
          entry_price?: number
          expires_at?: string | null
          grade?: string
          id?: string
          meta?: Json | null
          outcome_price?: number | null
          outcome_tp?: number | null
          pair_id?: string
          pnl_percent?: number | null
          setup?: string | null
          status?: string
          stop_loss?: number
          take_profit_1?: number
          take_profit_2?: number
          take_profit_3?: number
          timeframe?: string
        }
        Relationships: [
          {
            foreignKeyName: "signals_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "allowed_pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          notifications_enabled: boolean
          selected_pair_id: string | null
          timeframe: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notifications_enabled?: boolean
          selected_pair_id?: string | null
          timeframe?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notifications_enabled?: boolean
          selected_pair_id?: string | null
          timeframe?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_selected_pair_id_fkey"
            columns: ["selected_pair_id"]
            isOneToOne: false
            referencedRelation: "allowed_pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_signals: {
        Row: {
          created_at: string
          id: string
          is_notified: boolean
          is_read: boolean
          signal_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_notified?: boolean
          is_read?: boolean
          signal_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_notified?: boolean
          is_read?: boolean
          signal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_signals_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "latest_signals_by_pair"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_signals_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      latest_signals_by_pair: {
        Row: {
          analysis: string | null
          closed_at: string | null
          confidence: number | null
          created_at: string | null
          direction: string | null
          entry_price: number | null
          expires_at: string | null
          grade: string | null
          id: string | null
          outcome_tp: number | null
          pair_id: string | null
          pair_name: string | null
          pair_rank: number | null
          pnl_percent: number | null
          setup: string | null
          status: string | null
          stop_loss: number | null
          symbol: string | null
          take_profit_1: number | null
          take_profit_2: number | null
          take_profit_3: number | null
          timeframe: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signals_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "allowed_pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_stats: {
        Row: {
          last_updated: string | null
          open_24h: number | null
          open_30d: number | null
          open_7d: number | null
          stops_24h: number | null
          stops_30d: number | null
          stops_7d: number | null
          tp1_hits_24h: number | null
          tp1_hits_30d: number | null
          tp1_hits_7d: number | null
          tp2_hits_24h: number | null
          tp2_hits_30d: number | null
          tp2_hits_7d: number | null
          tp3_hits_24h: number | null
          tp3_hits_30d: number | null
          tp3_hits_7d: number | null
          win_rate_24h: number | null
          win_rate_30d: number | null
          win_rate_7d: number | null
        }
        Relationships: []
      }
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
