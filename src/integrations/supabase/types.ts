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
      bookings: {
        Row: {
          auto_cancel_at: string | null
          business_id: string
          business_signature: string | null
          business_signature_at: string | null
          business_signature_name: string | null
          consumer_id: string
          consumer_signature: string | null
          consumer_signature_at: string | null
          consumer_signature_name: string | null
          created_at: string
          dispute_opened_at: string | null
          dispute_reason: string | null
          dispute_resolved_at: string | null
          dispute_status: string | null
          id: string
          invoice_photos: string[]
          notes: string | null
          payment_intent_id: string | null
          payment_status: string | null
          platform_fee: number | null
          refunded_amount: number | null
          scheduled_date: string | null
          scheduled_time: string | null
          service_address: string | null
          service_id: string
          service_lat: number | null
          service_lng: number | null
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number | null
          travel_distance_miles: number | null
          travel_fee: number
          updated_at: string
        }
        Insert: {
          auto_cancel_at?: string | null
          business_id: string
          business_signature?: string | null
          business_signature_at?: string | null
          business_signature_name?: string | null
          consumer_id: string
          consumer_signature?: string | null
          consumer_signature_at?: string | null
          consumer_signature_name?: string | null
          created_at?: string
          dispute_opened_at?: string | null
          dispute_reason?: string | null
          dispute_resolved_at?: string | null
          dispute_status?: string | null
          id?: string
          invoice_photos?: string[]
          notes?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          refunded_amount?: number | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_address?: string | null
          service_id: string
          service_lat?: number | null
          service_lng?: number | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number | null
          travel_distance_miles?: number | null
          travel_fee?: number
          updated_at?: string
        }
        Update: {
          auto_cancel_at?: string | null
          business_id?: string
          business_signature?: string | null
          business_signature_at?: string | null
          business_signature_name?: string | null
          consumer_id?: string
          consumer_signature?: string | null
          consumer_signature_at?: string | null
          consumer_signature_name?: string | null
          created_at?: string
          dispute_opened_at?: string | null
          dispute_reason?: string | null
          dispute_resolved_at?: string | null
          dispute_status?: string | null
          id?: string
          invoice_photos?: string[]
          notes?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          refunded_amount?: number | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_address?: string | null
          service_id?: string
          service_lat?: number | null
          service_lng?: number | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number | null
          travel_distance_miles?: number | null
          travel_fee?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          address: string | null
          business_name: string
          cancellation_fee_pct: number
          cancellation_window_hours: number
          city: string | null
          created_at: string
          description: string | null
          free_radius_miles: number
          id: string
          is_verified: boolean | null
          logo_url: string | null
          origin_lat: number | null
          origin_lng: number | null
          per_mile_rate: number
          rating: number | null
          service_area: string | null
          state: string | null
          stripe_account_id: string | null
          total_reviews: number | null
          updated_at: string
          user_id: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          cancellation_fee_pct?: number
          cancellation_window_hours?: number
          city?: string | null
          created_at?: string
          description?: string | null
          free_radius_miles?: number
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          per_mile_rate?: number
          rating?: number | null
          service_area?: string | null
          state?: string | null
          stripe_account_id?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          cancellation_fee_pct?: number
          cancellation_window_hours?: number
          city?: string | null
          created_at?: string
          description?: string | null
          free_radius_miles?: number
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          per_mile_rate?: number
          rating?: number | null
          service_area?: string | null
          state?: string | null
          stripe_account_id?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          booking_id: string | null
          business_id: string
          consumer_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          business_id: string
          consumer_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          business_id?: string
          consumer_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          related_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string | null
          home_address: string | null
          home_lat: number | null
          home_lng: number | null
          id: string
          phone: string | null
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          home_address?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          phone?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          home_address?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          phone?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_availability: {
        Row: {
          business_id: string
          created_at: string
          end_time: string
          id: string
          start_time: string
          updated_at: string
          weekday: number
        }
        Insert: {
          business_id: string
          created_at?: string
          end_time: string
          id?: string
          start_time: string
          updated_at?: string
          weekday: number
        }
        Update: {
          business_id?: string
          created_at?: string
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          business_id: string
          comment: string | null
          consumer_id: string
          created_at: string
          id: string
          rating: number
        }
        Insert: {
          booking_id: string
          business_id: string
          comment?: string | null
          consumer_id: string
          created_at?: string
          id?: string
          rating: number
        }
        Update: {
          booking_id?: string
          business_id?: string
          comment?: string | null
          consumer_id?: string
          created_at?: string
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          business_id: string
          category: Database["public"]["Enums"]["service_category"]
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          price_max: number | null
          price_min: number | null
          price_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          price_max?: number | null
          price_min?: number | null
          price_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          price_max?: number | null
          price_min?: number | null
          price_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_business_profiles: {
        Row: {
          address: string | null
          business_name: string | null
          city: string | null
          created_at: string | null
          description: string | null
          free_radius_miles: number | null
          id: string | null
          is_verified: boolean | null
          logo_url: string | null
          origin_lat: number | null
          origin_lng: number | null
          per_mile_rate: number | null
          rating: number | null
          service_area: string | null
          state: string | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string | null
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          free_radius_miles?: number | null
          id?: string | null
          is_verified?: boolean | null
          logo_url?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          per_mile_rate?: number | null
          rating?: number | null
          service_area?: string | null
          state?: string | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          free_radius_miles?: number | null
          id?: string | null
          is_verified?: boolean | null
          logo_url?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          per_mile_rate?: number | null
          rating?: number | null
          service_area?: string | null
          state?: string | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_my_business_profile: {
        Args: never
        Returns: {
          address: string | null
          business_name: string
          cancellation_fee_pct: number
          cancellation_window_hours: number
          city: string | null
          created_at: string
          description: string | null
          free_radius_miles: number
          id: string
          is_verified: boolean | null
          logo_url: string | null
          origin_lat: number | null
          origin_lng: number | null
          per_mile_rate: number
          rating: number | null
          service_area: string | null
          state: string | null
          stripe_account_id: string | null
          total_reviews: number | null
          updated_at: string
          user_id: string
          website: string | null
          zip_code: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "business_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_travel_estimate: {
        Args: { _business_id: string; _dest_lat: number; _dest_lng: number }
        Returns: {
          distance_miles: number
          free_radius_miles: number
          per_mile_rate: number
          travel_fee: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      booking_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      service_category:
        | "cleaning"
        | "plumbing"
        | "electrical"
        | "landscaping"
        | "painting"
        | "moving"
        | "handyman"
        | "hvac"
        | "pest_control"
        | "other"
      user_role: "consumer" | "business" | "admin"
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
      booking_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      service_category: [
        "cleaning",
        "plumbing",
        "electrical",
        "landscaping",
        "painting",
        "moving",
        "handyman",
        "hvac",
        "pest_control",
        "other",
      ],
      user_role: ["consumer", "business", "admin"],
    },
  },
} as const
