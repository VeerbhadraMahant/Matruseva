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
    PostgrestVersion: "14.5"
  }
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
      care_events: {
        Row: {
          clinic_id: string
          completed_at: string | null
          created_at: string
          document_id: string | null
          due_from: string
          due_to: string
          id: string
          kind: string
          name: string
          patient_id: string
          skipped_reason: string | null
          template_item_id: string | null
        }
        Insert: {
          clinic_id: string
          completed_at?: string | null
          created_at?: string
          document_id?: string | null
          due_from: string
          due_to: string
          id?: string
          kind: string
          name: string
          patient_id: string
          skipped_reason?: string | null
          template_item_id?: string | null
        }
        Update: {
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          document_id?: string | null
          due_from?: string
          due_to?: string
          id?: string
          kind?: string
          name?: string
          patient_id?: string
          skipped_reason?: string | null
          template_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_events_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_followup_risk"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "care_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_events_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "schedule_template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          city: string | null
          created_at: string
          id: string
          message_templates: Json
          name: string
          phone: string | null
          risk_at_risk_days: number
          risk_lost_days: number
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          message_templates?: Json
          name: string
          phone?: string | null
          risk_at_risk_days?: number
          risk_lost_days?: number
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          message_templates?: Json
          name?: string
          phone?: string | null
          risk_at_risk_days?: number
          risk_lost_days?: number
        }
        Relationships: []
      }
      contact_log: {
        Row: {
          channel: string
          clinic_id: string
          created_at: string
          created_by: string | null
          follow_up_date: string | null
          id: string
          notes: string | null
          outcome: string
          patient_id: string
          reason: string | null
        }
        Insert: {
          channel: string
          clinic_id: string
          created_at?: string
          created_by?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          outcome: string
          patient_id: string
          reason?: string | null
        }
        Update: {
          channel?: string
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          outcome?: string
          patient_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_log_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_followup_risk"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "contact_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          care_event_id: string | null
          clinic_id: string
          created_at: string
          created_by: string | null
          doc_date: string | null
          doc_type: string
          id: string
          ocr_status: string
          ocr_text: string | null
          patient_id: string | null
          search: unknown
          source: string
          storage_path: string
        }
        Insert: {
          care_event_id?: string | null
          clinic_id: string
          created_at?: string
          created_by?: string | null
          doc_date?: string | null
          doc_type: string
          id?: string
          ocr_status?: string
          ocr_text?: string | null
          patient_id?: string | null
          search?: unknown
          source: string
          storage_path: string
        }
        Update: {
          care_event_id?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          doc_date?: string | null
          doc_type?: string
          id?: string
          ocr_status?: string
          ocr_text?: string | null
          patient_id?: string | null
          search?: unknown
          source?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_care_event_id_fkey"
            columns: ["care_event_id"]
            isOneToOne: false
            referencedRelation: "care_event_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_care_event_id_fkey"
            columns: ["care_event_id"]
            isOneToOne: false
            referencedRelation: "care_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_followup_risk"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          age: number | null
          alt_phone: string | null
          blood_group: string | null
          clinic_id: string
          clinic_patient_no: string | null
          created_at: string
          created_by: string | null
          edd: string | null
          edd_source: string
          gravida: number | null
          id: string
          lmp: string | null
          name: string
          para: number | null
          phone: string | null
          rh_negative: boolean
          risk_flags: string[]
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          age?: number | null
          alt_phone?: string | null
          blood_group?: string | null
          clinic_id: string
          clinic_patient_no?: string | null
          created_at?: string
          created_by?: string | null
          edd?: string | null
          edd_source?: string
          gravida?: number | null
          id?: string
          lmp?: string | null
          name: string
          para?: number | null
          phone?: string | null
          rh_negative?: boolean
          risk_flags?: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          age?: number | null
          alt_phone?: string | null
          blood_group?: string | null
          clinic_id?: string
          clinic_patient_no?: string | null
          created_at?: string
          created_by?: string | null
          edd?: string | null
          edd_source?: string
          gravida?: number | null
          id?: string
          lmp?: string | null
          name?: string
          para?: number | null
          phone?: string | null
          rh_negative?: boolean
          risk_flags?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          clinic_id: string
          created_at: string
          full_name: string
          id: string
          role: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          full_name: string
          id: string
          role: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          full_name?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_template_items: {
        Row: {
          code: string
          condition: string | null
          id: string
          is_critical: boolean
          kind: string
          name: string
          sort_order: number
          template_id: string
          window_end_week: number
          window_start_week: number
        }
        Insert: {
          code: string
          condition?: string | null
          id?: string
          is_critical?: boolean
          kind: string
          name: string
          sort_order?: number
          template_id: string
          window_end_week: number
          window_start_week: number
        }
        Update: {
          code?: string
          condition?: string | null
          id?: string
          is_critical?: boolean
          kind?: string
          name?: string
          sort_order?: number
          template_id?: string
          window_end_week?: number
          window_start_week?: number
        }
        Relationships: [
          {
            foreignKeyName: "schedule_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "schedule_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_templates: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          is_default: boolean
          name: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          bp_dia: number | null
          bp_sys: number | null
          clinic_id: string
          created_at: string
          created_by: string | null
          fhr: number | null
          fundal_height: number | null
          ga_weeks: number | null
          hb: number | null
          id: string
          next_visit_date: string | null
          notes: string | null
          patient_id: string
          visit_date: string
          weight: number | null
        }
        Insert: {
          bp_dia?: number | null
          bp_sys?: number | null
          clinic_id: string
          created_at?: string
          created_by?: string | null
          fhr?: number | null
          fundal_height?: number | null
          ga_weeks?: number | null
          hb?: number | null
          id?: string
          next_visit_date?: string | null
          notes?: string | null
          patient_id: string
          visit_date?: string
          weight?: number | null
        }
        Update: {
          bp_dia?: number | null
          bp_sys?: number | null
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          fhr?: number | null
          fundal_height?: number | null
          ga_weeks?: number | null
          hb?: number | null
          id?: string
          next_visit_date?: string | null
          notes?: string | null
          patient_id?: string
          visit_date?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_followup_risk"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      care_event_status: {
        Row: {
          clinic_id: string | null
          completed_at: string | null
          created_at: string | null
          document_id: string | null
          due_from: string | null
          due_to: string | null
          id: string | null
          kind: string | null
          name: string | null
          patient_id: string | null
          skipped_reason: string | null
          status: string | null
          template_item_id: string | null
        }
        Insert: {
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          document_id?: string | null
          due_from?: string | null
          due_to?: string | null
          id?: string | null
          kind?: string | null
          name?: string | null
          patient_id?: string | null
          skipped_reason?: string | null
          status?: never
          template_item_id?: string | null
        }
        Update: {
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          document_id?: string | null
          due_from?: string | null
          due_to?: string | null
          id?: string | null
          kind?: string | null
          name?: string | null
          patient_id?: string | null
          skipped_reason?: string | null
          status?: never
          template_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_events_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_followup_risk"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "care_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_events_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "schedule_template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_followup_risk: {
        Row: {
          clinic_id: string | null
          next_visit_date: string | null
          no_answer_streak: number | null
          patient_id: string | null
          patient_status: string | null
          risk: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_clinic_and_profile: {
        Args: { clinic_name: string; doctor_full_name: string }
        Returns: string
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
