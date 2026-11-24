// Generated from the Supabase schema. Do not edit by hand.
// Regenerate with `npm run db:types` after changing supabase/migrations.

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
    PostgrestVersion: "17.1"
  }
  public: {
    Tables: {
      account_categories: {
        Row: {
          code: string
          id: number
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          id?: never
          name: string
          sort_order: number
        }
        Update: {
          code?: string
          id?: never
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      category_mappings: {
        Row: {
          category_id: number
          source_category: string
        }
        Insert: {
          category_id: number
          source_category: string
        }
        Update: {
          category_id?: number
          source_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_mappings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "account_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_mappings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "monthly_category_totals"
            referencedColumns: ["category_id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_jpy: number
          category_id: number
          confidence: Json | null
          created_at: string
          date: string
          dedupe_key: string | null
          description: string
          id: string
          invoice_number: string | null
          source: Database["public"]["Enums"]["expense_source"]
          source_category: string | null
          status: Database["public"]["Enums"]["expense_status"]
          tax_type: Database["public"]["Enums"]["tax_type"] | null
          updated_at: string
          upload_id: string | null
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount_jpy: number
          category_id: number
          confidence?: Json | null
          created_at?: string
          date: string
          dedupe_key?: string | null
          description?: string
          id?: string
          invoice_number?: string | null
          source: Database["public"]["Enums"]["expense_source"]
          source_category?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          tax_type?: Database["public"]["Enums"]["tax_type"] | null
          updated_at?: string
          upload_id?: string | null
          user_id?: string
          vendor?: string | null
        }
        Update: {
          amount_jpy?: number
          category_id?: number
          confidence?: Json | null
          created_at?: string
          date?: string
          dedupe_key?: string | null
          description?: string
          id?: string
          invoice_number?: string | null
          source?: Database["public"]["Enums"]["expense_source"]
          source_category?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          tax_type?: Database["public"]["Enums"]["tax_type"] | null
          updated_at?: string
          upload_id?: string | null
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "account_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "monthly_category_totals"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "expenses_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      uploads: {
        Row: {
          byte_size: number | null
          created_at: string
          error_message: string | null
          file_name: string
          id: string
          kind: Database["public"]["Enums"]["upload_kind"]
          processing_started_at: string | null
          row_count: number
          skipped_count: number
          status: Database["public"]["Enums"]["upload_status"]
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          byte_size?: number | null
          created_at?: string
          error_message?: string | null
          file_name: string
          id?: string
          kind: Database["public"]["Enums"]["upload_kind"]
          processing_started_at?: string | null
          row_count?: number
          skipped_count?: number
          status?: Database["public"]["Enums"]["upload_status"]
          storage_path: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          byte_size?: number | null
          created_at?: string
          error_message?: string | null
          file_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["upload_kind"]
          processing_started_at?: string | null
          row_count?: number
          skipped_count?: number
          status?: Database["public"]["Enums"]["upload_status"]
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      monthly_category_totals: {
        Row: {
          category_code: string | null
          category_id: number | null
          category_name: string | null
          expense_count: number | null
          month: string | null
          sort_order: number | null
          total_jpy: number | null
          user_id: string | null
        }
        Relationships: []
      }
      monthly_expense_totals: {
        Row: {
          csv_count: number | null
          expense_count: number | null
          manual_count: number | null
          month: string | null
          receipt_count: number | null
          total_jpy: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      expense_source: "csv" | "receipt" | "manual"
      expense_status: "pending_review" | "confirmed"
      tax_type: "standard_10" | "reduced_8" | "exempt"
      upload_kind: "csv" | "xlsx" | "pdf" | "image"
      upload_status: "processing" | "needs_review" | "completed" | "failed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      expense_source: ["csv", "receipt", "manual"],
      expense_status: ["pending_review", "confirmed"],
      tax_type: ["standard_10", "reduced_8", "exempt"],
      upload_kind: ["csv", "xlsx", "pdf", "image"],
      upload_status: ["processing", "needs_review", "completed", "failed"],
    },
  },
} as const
