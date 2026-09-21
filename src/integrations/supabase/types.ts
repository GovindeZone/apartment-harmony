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
  public: {
    Tables: {
      apartment_settings: {
        Row: {
          address: string | null
          blocks: string[]
          city: string | null
          gates: string[]
          helpdesk_whatsapp: string | null
          id: string
          manager_whatsapp: string | null
          name: string
          notifications_enabled: boolean
          shifts: string[]
          total_flats: number
          updated_at: string
          zones: string[]
        }
        Insert: {
          address?: string | null
          blocks?: string[]
          city?: string | null
          gates?: string[]
          helpdesk_whatsapp?: string | null
          id?: string
          manager_whatsapp?: string | null
          name: string
          notifications_enabled?: boolean
          shifts?: string[]
          total_flats?: number
          updated_at?: string
          zones?: string[]
        }
        Update: {
          address?: string | null
          blocks?: string[]
          city?: string | null
          gates?: string[]
          helpdesk_whatsapp?: string | null
          id?: string
          manager_whatsapp?: string | null
          name?: string
          notifications_enabled?: boolean
          shifts?: string[]
          total_flats?: number
          updated_at?: string
          zones?: string[]
        }
        Relationships: []
      }
      contractors: {
        Row: {
          company_name: string
          proprietor_owner_name: string | null
          contact_person: string | null
          registration_number: string | null
          phone1: string | null
          phone2: string | null
          phone3: string | null
          email: string | null
          website: string | null
          contract_start_date: string | null
          contract_end_date: string | null
          contract_amount: number | null
          contract_particulars: string | null
          contract_document_path: string | null
          contract_document_name: string | null
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          company_name: string
          proprietor_owner_name?: string | null
          contact_person?: string | null
          registration_number?: string | null
          phone1?: string | null
          phone2?: string | null
          phone3?: string | null
          email?: string | null
          website?: string | null
          contract_start_date?: string | null
          contract_end_date?: string | null
          contract_amount?: number | null
          contract_particulars?: string | null
          contract_document_path?: string | null
          contract_document_name?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          proprietor_owner_name?: string | null
          contact_person?: string | null
          registration_number?: string | null
          phone1?: string | null
          phone2?: string | null
          phone3?: string | null
          email?: string | null
          website?: string | null
          contract_start_date?: string | null
          contract_end_date?: string | null
          contract_amount?: number | null
          contract_particulars?: string | null
          contract_document_path?: string | null
          contract_document_name?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          age: number | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          relation: string | null
          resident_id: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          relation?: string | null
          resident_id: string
        }
        Update: {
          age?: number | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          relation?: string | null
          resident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      flats: {
        Row: {
          area_sqft: number | null
          bedrooms: number
          block: string
          created_at: string
          flat_no: string
          floor: number
          id: string
          status: string
          zone: string
        }
        Insert: {
          area_sqft?: number | null
          bedrooms?: number
          block: string
          created_at?: string
          flat_no: string
          floor: number
          id?: string
          status?: string
          zone: string
        }
        Update: {
          area_sqft?: number | null
          bedrooms?: number
          block?: string
          created_at?: string
          flat_no?: string
          floor?: number
          id?: string
          status?: string
          zone?: string
        }
        Relationships: []
      }
      gate_entries: {
        Row: {
          category: string
          created_at: string
          direction: string
          entry_time: string
          exit_time: string | null
          flat_id: string | null
          flat_no: string | null
          gate: string
          id: string
          person_name: string
          phone: string | null
          purpose: string | null
          recorded_by: string | null
          status: string
          vehicle_no: string | null
          vehicle_type: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          direction?: string
          entry_time?: string
          exit_time?: string | null
          flat_id?: string | null
          flat_no?: string | null
          gate?: string
          id?: string
          person_name: string
          phone?: string | null
          purpose?: string | null
          recorded_by?: string | null
          status?: string
          vehicle_no?: string | null
          vehicle_type?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          direction?: string
          entry_time?: string
          exit_time?: string | null
          flat_id?: string | null
          flat_no?: string | null
          gate?: string
          id?: string
          person_name?: string
          phone?: string | null
          purpose?: string | null
          recorded_by?: string | null
          status?: string
          vehicle_no?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_entries_flat_id_fkey"
            columns: ["flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_records: {
        Row: {
          category: string
          created_at: string
          direction: string
          flat_no: string | null
          handled_by: string | null
          helpdesk_whatsapp: string | null
          id: string
          manager_whatsapp: string | null
          message: string
          resident_id: string | null
          resident_whatsapp: string | null
          status: string
        }
        Insert: {
          category?: string
          created_at?: string
          direction?: string
          flat_no?: string | null
          handled_by?: string | null
          helpdesk_whatsapp?: string | null
          id?: string
          manager_whatsapp?: string | null
          message: string
          resident_id?: string | null
          resident_whatsapp?: string | null
          status?: string
        }
        Update: {
          category?: string
          created_at?: string
          direction?: string
          flat_no?: string | null
          handled_by?: string | null
          helpdesk_whatsapp?: string | null
          id?: string
          manager_whatsapp?: string | null
          message?: string
          resident_id?: string | null
          resident_whatsapp?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_records_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      residents: {
        Row: {
          created_at: string
          email: string | null
          flat_id: string | null
          full_name: string
          id: string
          is_primary: boolean
          move_in_date: string | null
          move_out_date: string | null
          notes: string | null
          occupant_type: string
          phone: string | null
          resident_type: string
          status: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          flat_id?: string | null
          full_name: string
          id?: string
          is_primary?: boolean
          move_in_date?: string | null
          move_out_date?: string | null
          notes?: string | null
          occupant_type?: string
          phone?: string | null
          resident_type?: string
          status?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          flat_id?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean
          move_in_date?: string | null
          move_out_date?: string | null
          notes?: string | null
          occupant_type?: string
          phone?: string | null
          resident_type?: string
          status?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "residents_flat_id_fkey"
            columns: ["flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          aadhaar_number: string | null
          address: string | null
          contractor_id: string | null
          staff_type: string
          created_at: string
          department: string
          designation: string
          emergency_contact: string | null
          employee_code: string
          full_name: string
          id: string
          join_date: string | null
          monthly_salary: number
          phone: string | null
          reference_name: string | null
          reference_phone: string | null
          relieving_date: string | null
          shift: string
          status: string
          whatsapp: string | null
        }
        Insert: {
          aadhaar_number?: string | null
          address?: string | null
          contractor_id?: string | null
          staff_type?: string
          created_at?: string
          department: string
          designation: string
          emergency_contact?: string | null
          employee_code: string
          full_name: string
          id?: string
          join_date?: string | null
          monthly_salary?: number
          phone?: string | null
          reference_name?: string | null
          reference_phone?: string | null
          relieving_date?: string | null
          shift?: string
          status?: string
          whatsapp?: string | null
        }
        Update: {
          aadhaar_number?: string | null
          address?: string | null
          contractor_id?: string | null
          staff_type?: string
          created_at?: string
          department?: string
          designation?: string
          emergency_contact?: string | null
          employee_code?: string
          full_name?: string
          id?: string
          join_date?: string | null
          monthly_salary?: number
          phone?: string | null
          reference_name?: string | null
          reference_phone?: string | null
          relieving_date?: string | null
          shift?: string
          status?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_attendance: {
        Row: {
          attendance_date: string
          check_in: string | null
          check_out: string | null
          created_at: string
          id: string
          remarks: string | null
          staff_id: string
          status: string
        }
        Insert: {
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          id?: string
          remarks?: string | null
          staff_id: string
          status?: string
        }
        Update: {
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          id?: string
          remarks?: string | null
          staff_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string
          file_path: string
          id: string
          staff_id: string
        }
        Insert: {
          created_at?: string
          doc_type?: string
          file_name: string
          file_path: string
          id?: string
          staff_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string
          file_path?: string
          id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_documents_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_salaries: {
        Row: {
          base_amount: number
          bonus: number
          created_at: string
          deductions: number
          id: string
          net_amount: number
          paid_on: string | null
          salary_month: string
          staff_id: string
          status: string
        }
        Insert: {
          base_amount?: number
          bonus?: number
          created_at?: string
          deductions?: number
          id?: string
          net_amount?: number
          paid_on?: string | null
          salary_month: string
          staff_id: string
          status?: string
        }
        Update: {
          base_amount?: number
          bonus?: number
          created_at?: string
          deductions?: number
          id?: string
          net_amount?: number
          paid_on?: string | null
          salary_month?: string
          staff_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_salaries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string
          flat_id: string | null
          id: string
          make_model: string | null
          resident_id: string | null
          sticker_no: string | null
          vehicle_no: string
          vehicle_type: string
        }
        Insert: {
          created_at?: string
          flat_id?: string | null
          id?: string
          make_model?: string | null
          resident_id?: string | null
          sticker_no?: string | null
          vehicle_no: string
          vehicle_type?: string
        }
        Update: {
          created_at?: string
          flat_id?: string | null
          id?: string
          make_model?: string | null
          resident_id?: string | null
          sticker_no?: string | null
          vehicle_no?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_flat_id_fkey"
            columns: ["flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "security" | "helpdesk"
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
      app_role: ["admin", "manager", "security", "helpdesk"],
    },
  },
} as const
