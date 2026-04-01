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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      car: {
        Row: {
          buy_at: string | null
          created_at: string
          current_engine_km: number
          current_ev_km: number
          current_total_km: number | null
          energy_type: Database["public"]["Enums"]["car_energy_type"]
          id: string
          last_mileage_recorded_at: string | null
          name: string
          note: string | null
          plate_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          buy_at?: string | null
          created_at?: string
          current_engine_km?: number
          current_ev_km?: number
          current_total_km?: number | null
          energy_type: Database["public"]["Enums"]["car_energy_type"]
          id?: string
          last_mileage_recorded_at?: string | null
          name: string
          note?: string | null
          plate_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          buy_at?: string | null
          created_at?: string
          current_engine_km?: number
          current_ev_km?: number
          current_total_km?: number | null
          energy_type?: Database["public"]["Enums"]["car_energy_type"]
          id?: string
          last_mileage_recorded_at?: string | null
          name?: string
          note?: string | null
          plate_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      car_insurance_policy: {
        Row: {
          car_id: string
          contact_name: string | null
          contact_note: string | null
          contact_phone: string | null
          created_at: string
          effective_end_at: string
          effective_start_at: string
          id: string
          insurance_type: Database["public"]["Enums"]["insurance_type"]
          note: string | null
          premium_amount: number
          purchased_at: string
          updated_at: string
          voucher_key: string | null
          voucher_url: string | null
        }
        Insert: {
          car_id: string
          contact_name?: string | null
          contact_note?: string | null
          contact_phone?: string | null
          created_at?: string
          effective_end_at: string
          effective_start_at: string
          id?: string
          insurance_type: Database["public"]["Enums"]["insurance_type"]
          note?: string | null
          premium_amount: number
          purchased_at: string
          updated_at?: string
          voucher_key?: string | null
          voucher_url?: string | null
        }
        Update: {
          car_id?: string
          contact_name?: string | null
          contact_note?: string | null
          contact_phone?: string | null
          created_at?: string
          effective_end_at?: string
          effective_start_at?: string
          id?: string
          insurance_type?: Database["public"]["Enums"]["insurance_type"]
          note?: string | null
          premium_amount?: number
          purchased_at?: string
          updated_at?: string
          voucher_key?: string | null
          voucher_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "car_insurance_policy_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "car"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_insurance_policy_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "car_maintenance_reminder_view"
            referencedColumns: ["car_id"]
          },
        ]
      }
      car_maintenance_config: {
        Row: {
          car_id: string
          created_at: string
          enabled_override: boolean | null
          id: string
          interval_days_override: number | null
          interval_km_override: number | null
          item_code: Database["public"]["Enums"]["maintenance_item_code"]
          note: string | null
          updated_at: string
        }
        Insert: {
          car_id: string
          created_at?: string
          enabled_override?: boolean | null
          id?: string
          interval_days_override?: number | null
          interval_km_override?: number | null
          item_code: Database["public"]["Enums"]["maintenance_item_code"]
          note?: string | null
          updated_at?: string
        }
        Update: {
          car_id?: string
          created_at?: string
          enabled_override?: boolean | null
          id?: string
          interval_days_override?: number | null
          interval_km_override?: number | null
          item_code?: Database["public"]["Enums"]["maintenance_item_code"]
          note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_maintenance_config_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "car"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_maintenance_config_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "car_maintenance_reminder_view"
            referencedColumns: ["car_id"]
          },
          {
            foreignKeyName: "car_maintenance_config_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "car_maintenance_reminder_view"
            referencedColumns: ["item_code"]
          },
          {
            foreignKeyName: "car_maintenance_config_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "maintenance_item_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      car_maintenance_service_log: {
        Row: {
          car_id: string
          created_at: string
          engine_km: number
          ev_km: number
          id: string
          item_code: Database["public"]["Enums"]["maintenance_item_code"]
          note: string | null
          performed_at: string
          total_km: number | null
          updated_at: string
        }
        Insert: {
          car_id: string
          created_at?: string
          engine_km?: number
          ev_km?: number
          id?: string
          item_code: Database["public"]["Enums"]["maintenance_item_code"]
          note?: string | null
          performed_at: string
          total_km?: number | null
          updated_at?: string
        }
        Update: {
          car_id?: string
          created_at?: string
          engine_km?: number
          ev_km?: number
          id?: string
          item_code?: Database["public"]["Enums"]["maintenance_item_code"]
          note?: string | null
          performed_at?: string
          total_km?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_maintenance_service_log_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "car"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_maintenance_service_log_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "car_maintenance_reminder_view"
            referencedColumns: ["car_id"]
          },
          {
            foreignKeyName: "car_maintenance_service_log_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "car_maintenance_reminder_view"
            referencedColumns: ["item_code"]
          },
          {
            foreignKeyName: "car_maintenance_service_log_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "maintenance_item_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      car_mileage_log: {
        Row: {
          car_id: string
          created_at: string
          engine_km: number
          ev_km: number
          id: string
          note: string | null
          recorded_at: string
          total_km: number | null
          updated_at: string
        }
        Insert: {
          car_id: string
          created_at?: string
          engine_km?: number
          ev_km?: number
          id?: string
          note?: string | null
          recorded_at: string
          total_km?: number | null
          updated_at?: string
        }
        Update: {
          car_id?: string
          created_at?: string
          engine_km?: number
          ev_km?: number
          id?: string
          note?: string | null
          recorded_at?: string
          total_km?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_mileage_log_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "car"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_mileage_log_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "car_maintenance_reminder_view"
            referencedColumns: ["car_id"]
          },
        ]
      }
      car_reminder_delivery_log: {
        Row: {
          channel: string
          created_at: string
          id: string
          reminder_key: string
          response_excerpt: string | null
          sent_at: string
          status: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          reminder_key: string
          response_excerpt?: string | null
          sent_at?: string
          status: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          reminder_key?: string
          response_excerpt?: string | null
          sent_at?: string
          status?: string
        }
        Relationships: []
      }
      car_reminder_state: {
        Row: {
          acknowledged_at: string | null
          car_id: string
          created_at: string
          last_notified_at: string | null
          last_notified_channel: string | null
          reminder_key: string
          resolved_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          car_id: string
          created_at?: string
          last_notified_at?: string | null
          last_notified_channel?: string | null
          reminder_key: string
          resolved_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          car_id?: string
          created_at?: string
          last_notified_at?: string | null
          last_notified_channel?: string | null
          reminder_key?: string
          resolved_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_reminder_state_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "car"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_reminder_state_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "car_maintenance_reminder_view"
            referencedColumns: ["car_id"]
          },
        ]
      }
      counterparty: {
        Row: {
          created_at: string
          id: string
          name: string
          note: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          note?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      maintenance_item_catalog: {
        Row: {
          category: Database["public"]["Enums"]["maintenance_category"]
          code: Database["public"]["Enums"]["maintenance_item_code"]
          created_at: string
          default_interval_days: number
          default_interval_km: number
          enabled_for_electric: boolean
          enabled_for_fuel: boolean
          enabled_for_hybrid: boolean
          label: string
          requires_note: boolean
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["maintenance_category"]
          code: Database["public"]["Enums"]["maintenance_item_code"]
          created_at?: string
          default_interval_days: number
          default_interval_km: number
          enabled_for_electric?: boolean
          enabled_for_fuel?: boolean
          enabled_for_hybrid?: boolean
          label: string
          requires_note?: boolean
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["maintenance_category"]
          code?: Database["public"]["Enums"]["maintenance_item_code"]
          created_at?: string
          default_interval_days?: number
          default_interval_km?: number
          enabled_for_electric?: boolean
          enabled_for_fuel?: boolean
          enabled_for_hybrid?: boolean
          label?: string
          requires_note?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      money_ledger: {
        Row: {
          amount: number
          counterparty_id: string
          created_at: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id: string
          note: string | null
          occurred_at: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          screenshot_key: string | null
          screenshot_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          counterparty_id: string
          created_at?: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          note?: string | null
          occurred_at: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          screenshot_key?: string | null
          screenshot_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          counterparty_id?: string
          created_at?: string
          entry_type?: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          note?: string | null
          occurred_at?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          screenshot_key?: string | null
          screenshot_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "money_ledger_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparty"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      car_insurance_reminder_view: {
        Row: {
          car_id: string | null
          car_name: string | null
          channel_payload: Json | null
          due_at: string | null
          due_km: number | null
          insurance_type: Database["public"]["Enums"]["insurance_type"] | null
          plate_number: string | null
          reminder_key: string | null
          severity: string | null
          source_id: string | null
          title: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "car_insurance_policy_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "car"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_insurance_policy_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "car_maintenance_reminder_view"
            referencedColumns: ["car_id"]
          },
        ]
      }
      car_maintenance_reminder_view: {
        Row: {
          car_id: string | null
          car_name: string | null
          category: Database["public"]["Enums"]["maintenance_category"] | null
          channel_payload: Json | null
          due_at: string | null
          due_km: number | null
          item_code: Database["public"]["Enums"]["maintenance_item_code"] | null
          plate_number: string | null
          reminder_key: string | null
          severity: string | null
          source_id: string | null
          title: string | null
          user_id: string | null
        }
        Relationships: []
      }
      car_reminder_view: {
        Row: {
          car_id: string | null
          car_name: string | null
          channel_payload: Json | null
          due_at: string | null
          due_km: number | null
          plate_number: string | null
          reminder_key: string | null
          reminder_type: string | null
          severity: string | null
          source_id: string | null
          title: string | null
          user_id: string | null
        }
        Relationships: []
      }
      debt_balance_view: {
        Row: {
          counterparty_id: string | null
          counterparty_name: string | null
          last_occurred_at: string | null
          loan_total: number | null
          outstanding_amount: number | null
          repaid_total: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "money_ledger_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparty"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assert_car_metric_pair: {
        Args: {
          input_energy_type: Database["public"]["Enums"]["car_energy_type"]
          input_engine_km: number
          input_ev_km: number
        }
        Returns: undefined
      }
      sync_car_current_mileage: {
        Args: { target_car_id: string }
        Returns: undefined
      }
    }
    Enums: {
      car_energy_type: "fuel" | "electric" | "hybrid"
      insurance_type: "compulsory" | "commercial"
      ledger_entry_type: "loan" | "repayment"
      maintenance_category: "basic" | "engine"
      maintenance_item_code:
        | "tire_rotation"
        | "brake_fluid"
        | "engine_coolant"
        | "battery_coolant"
        | "transmission_gear_oil"
        | "engine_oil_and_filter"
        | "fuel_system_cleaner"
        | "spark_plug"
        | "fuel_filter"
        | "air_filter_element"
      payment_method: "wechat" | "alipay" | "bank_transfer" | "cash" | "other"
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
    Enums: {
      car_energy_type: ["fuel", "electric", "hybrid"],
      insurance_type: ["compulsory", "commercial"],
      ledger_entry_type: ["loan", "repayment"],
      maintenance_category: ["basic", "engine"],
      maintenance_item_code: [
        "tire_rotation",
        "brake_fluid",
        "engine_coolant",
        "battery_coolant",
        "transmission_gear_oil",
        "engine_oil_and_filter",
        "fuel_system_cleaner",
        "spark_plug",
        "fuel_filter",
        "air_filter_element",
      ],
      payment_method: ["wechat", "alipay", "bank_transfer", "cash", "other"],
    },
  },
} as const
