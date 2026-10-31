export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string | null
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_hash: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      body_locations: {
        Row: {
          active: boolean | null
          id: string
          name: string
          region: string | null
          sort_order: number | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          id?: string
          name: string
          region?: string | null
          sort_order?: number | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          id?: string
          name?: string
          region?: string | null
          sort_order?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      event_interventions: {
        Row: {
          applied_at: string | null
          event_id: string | null
          id: string
          intervention_id: string | null
          notes: string | null
        }
        Insert: {
          applied_at?: string | null
          event_id?: string | null
          id?: string
          intervention_id?: string | null
          notes?: string | null
        }
        Update: {
          applied_at?: string | null
          event_id?: string | null
          id?: string
          intervention_id?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_interventions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_interventions_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_locations: {
        Row: {
          body_location_id: string
          event_id: string
        }
        Insert: {
          body_location_id: string
          event_id: string
        }
        Update: {
          body_location_id?: string
          event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_locations_body_location_id_fkey"
            columns: ["body_location_id"]
            isOneToOne: false
            referencedRelation: "body_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_locations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_notes: {
        Row: {
          content: string
          created_at: string
          event_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string
          event_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_types: {
        Row: {
          active: boolean | null
          auto_resolve: boolean
          created_at: string | null
          custom_fields: Json | null
          has_duration: boolean | null
          has_location: boolean | null
          has_severity: boolean | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          auto_resolve?: boolean
          created_at?: string | null
          custom_fields?: Json | null
          has_duration?: boolean | null
          has_location?: boolean | null
          has_severity?: boolean | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          auto_resolve?: boolean
          created_at?: string | null
          custom_fields?: Json | null
          has_duration?: boolean | null
          has_location?: boolean | null
          has_severity?: boolean | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          attributes: Json | null
          created_at: string | null
          ended_at: string | null
          event_type_id: string
          id: string
          notes: string | null
          severity: number | null
          started_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attributes?: Json | null
          created_at?: string | null
          ended_at?: string | null
          event_type_id: string
          id?: string
          notes?: string | null
          severity?: number | null
          started_at?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attributes?: Json | null
          created_at?: string | null
          ended_at?: string | null
          event_type_id?: string
          id?: string
          notes?: string | null
          severity?: number | null
          started_at?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_event_types: {
        Row: {
          event_type_id: string
          intervention_id: string
        }
        Insert: {
          event_type_id: string
          intervention_id: string
        }
        Update: {
          event_type_id?: string
          intervention_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_event_types_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_event_types_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          active: boolean | null
          category: string | null
          id: string
          name: string
          sort_order: number | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          id?: string
          name: string
          sort_order?: number | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          user_id?: string | null
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
