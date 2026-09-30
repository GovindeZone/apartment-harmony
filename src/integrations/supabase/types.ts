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
          floors: string[]
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
          floors?: string[]
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
          floors?: string[]
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
      bye_law_repository: {
        Row: {
          bye_law_type: string
          created_at: string
          document_description: string | null
          document_name: string
          effective_date: string | null
          gb_approved_date: string | null
          id: string
          updated_at: string
        }
        Insert: {
          bye_law_type?: string
          created_at?: string
          document_description?: string | null
          document_name: string
          effective_date?: string | null
          gb_approved_date?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          bye_law_type?: string
          created_at?: string
          document_description?: string | null
          document_name?: string
          effective_date?: string | null
          gb_approved_date?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      checklist_master: {
        Row: {
          active: boolean
          created_at: string
          department: string
          frequency: string
          id: string
          task: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          department: string
          frequency: string
          id?: string
          task: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          department?: string
          frequency?: string
          id?: string
          task?: string
          updated_at?: string
        }
        Relationships: []
      }
      contractors: {
        Row: {
          company_name: string
          contact_person: string | null
          contract_amount: number | null
          contract_document_name: string | null
          contract_document_path: string | null
          contract_end_date: string | null
          contract_particulars: string | null
          contract_start_date: string | null
          created_at: string
          email: string | null
          id: string
          phone1: string | null
          phone2: string | null
          phone3: string | null
          proprietor_owner_name: string | null
          registration_number: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          company_name: string
          contact_person?: string | null
          contract_amount?: number | null
          contract_document_name?: string | null
          contract_document_path?: string | null
          contract_end_date?: string | null
          contract_particulars?: string | null
          contract_start_date?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone1?: string | null
          phone2?: string | null
          phone3?: string | null
          proprietor_owner_name?: string | null
          registration_number?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          company_name?: string
          contact_person?: string | null
          contract_amount?: number | null
          contract_document_name?: string | null
          contract_document_path?: string | null
          contract_end_date?: string | null
          contract_particulars?: string | null
          contract_start_date?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone1?: string | null
          phone2?: string | null
          phone3?: string | null
          proprietor_owner_name?: string | null
          registration_number?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      ec_repository: {
        Row: {
          created_at: string
          designation: string
          email: string | null
          family_member_id: string | null
          flat_id: string
          general_body_approved_date: string | null
          id: string
          period_from: string
          period_to: string
          phone: string | null
          resident_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          designation: string
          email?: string | null
          family_member_id?: string | null
          flat_id: string
          general_body_approved_date?: string | null
          id?: string
          period_from: string
          period_to: string
          phone?: string | null
          resident_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          designation?: string
          email?: string | null
          family_member_id?: string | null
          flat_id?: string
          general_body_approved_date?: string | null
          id?: string
          period_from?: string
          period_to?: string
          phone?: string | null
          resident_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ec_repository_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ec_repository_flat_id_fkey"
            columns: ["flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ec_repository_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_management_tasks: {
        Row: {
          assigned_department: string | null
          assigned_staff_id: string | null
          created_at: string
          expected_end_date: string | null
          frequency: string | null
          id: string
          status: string
          task_description: string | null
          task_name: string
          task_start_date: string
          task_type: string
          updated_at: string
        }
        Insert: {
          assigned_department?: string | null
          assigned_staff_id?: string | null
          created_at?: string
          expected_end_date?: string | null
          frequency?: string | null
          id?: string
          status?: string
          task_description?: string | null
          task_name: string
          task_start_date?: string
          task_type?: string
          updated_at?: string
        }
        Update: {
          assigned_department?: string | null
          assigned_staff_id?: string | null
          created_at?: string
          expected_end_date?: string | null
          frequency?: string | null
          id?: string
          status?: string
          task_description?: string | null
          task_name?: string
          task_start_date?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_management_tasks_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
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
          phone_country_code: string
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
          phone_country_code?: string
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
          phone_country_code?: string
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
      mc_repository: {
        Row: {
          created_at: string
          designation: string
          email: string | null
          family_member_id: string | null
          flat_id: string
          id: string
          period_from: string
          period_to: string
          phone: string | null
          primary_portfolio: string | null
          resident_id: string
          secondary_portfolio: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          designation: string
          email?: string | null
          family_member_id?: string | null
          flat_id: string
          id?: string
          period_from: string
          period_to: string
          phone?: string | null
          primary_portfolio?: string | null
          resident_id: string
          secondary_portfolio?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          designation?: string
          email?: string | null
          family_member_id?: string | null
          flat_id?: string
          id?: string
          period_from?: string
          period_to?: string
          phone?: string | null
          primary_portfolio?: string | null
          resident_id?: string
          secondary_portfolio?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mc_repository_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mc_repository_flat_id_fkey"
            columns: ["flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mc_repository_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      official_records: {
        Row: {
          additional_remarks: string | null
          created_at: string
          document_description: string | null
          document_file_name: string | null
          document_name: string
          document_path: string | null
          document_type: string
          id: string
          updated_at: string
        }
        Insert: {
          additional_remarks?: string | null
          created_at?: string
          document_description?: string | null
          document_file_name?: string | null
          document_name: string
          document_path?: string | null
          document_type?: string
          id?: string
          updated_at?: string
        }
        Update: {
          additional_remarks?: string | null
          created_at?: string
          document_description?: string | null
          document_file_name?: string | null
          document_name?: string
          document_path?: string | null
          document_type?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
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
          phone_country_code: string
          resident_type: string
          status: string
          whatsapp: string | null
          whatsapp_country_code: string
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
          phone_country_code?: string
          resident_type?: string
          status?: string
          whatsapp?: string | null
          whatsapp_country_code?: string
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
          phone_country_code?: string
          resident_type?: string
          status?: string
          whatsapp?: string | null
          whatsapp_country_code?: string
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
          aadhaar_document_path: string | null
          aadhaar_number: string | null
          address: string | null
          contractor_id: string | null
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
          phone_country_code: string
          reference_name: string | null
          reference_phone: string | null
          relieving_date: string | null
          resume_document_path: string | null
          shift: string
          staff_type: string
          status: string
          whatsapp: string | null
          whatsapp_country_code: string
        }
        Insert: {
          aadhaar_document_path?: string | null
          aadhaar_number?: string | null
          address?: string | null
          contractor_id?: string | null
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
          phone_country_code?: string
          reference_name?: string | null
          reference_phone?: string | null
          relieving_date?: string | null
          resume_document_path?: string | null
          shift?: string
          staff_type?: string
          status?: string
          whatsapp?: string | null
          whatsapp_country_code?: string
        }
        Update: {
          aadhaar_document_path?: string | null
          aadhaar_number?: string | null
          address?: string | null
          contractor_id?: string | null
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
          phone_country_code?: string
          reference_name?: string | null
          reference_phone?: string | null
          relieving_date?: string | null
          resume_document_path?: string | null
          shift?: string
          staff_type?: string
          status?: string
          whatsapp?: string | null
          whatsapp_country_code?: string
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
          shift: string
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
          shift?: string
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
          shift?: string
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
      user_tab_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          tab_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          tab_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          tab_key?: string
          updated_at?: string
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
