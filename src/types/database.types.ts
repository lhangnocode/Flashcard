
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "card_tags": {
                  Row: {
                    "card_id": string,"tag_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id": string,"tag_id": string,"user_id": string
                  }
                  Update: {
                    "card_id"?: string,"tag_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_tags_card_id_user_id_fkey"
      columns: ["card_id","user_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "card_tags_tag_id_user_id_fkey"
      columns: ["tag_id","user_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"cards": {
                  Row: {
                    "back": string,"created_at": string,"deck_id": string,"ease_factor": number,"example": string | null,"front": string,"id": string,"interval_days": number,"next_review_at": string,"notes": string | null,"reading": string | null,"repetitions": number,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "back": string,"created_at"?: string,"deck_id": string,"ease_factor"?: number,"example"?: string | null,"front": string,"id"?: string,"interval_days"?: number,"next_review_at"?: string,"notes"?: string | null,"reading"?: string | null,"repetitions"?: number,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "back"?: string,"created_at"?: string,"deck_id"?: string,"ease_factor"?: number,"example"?: string | null,"front"?: string,"id"?: string,"interval_days"?: number,"next_review_at"?: string,"notes"?: string | null,"reading"?: string | null,"repetitions"?: number,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cards_deck_id_user_id_fkey"
      columns: ["deck_id","user_id"]
isOneToOne: false
      referencedRelation: "deck_summaries"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "cards_deck_id_user_id_fkey"
      columns: ["deck_id","user_id"]
isOneToOne: false
      referencedRelation: "decks"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"decks": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"title": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"review_logs": {
                  Row: {
                    "card_id": string | null,"id": string,"rating": string,"review_duration_ms": number | null,"reviewed_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id"?: string | null,"id"?: string,"rating": string,"review_duration_ms"?: number | null,"reviewed_at"?: string,"user_id": string
                  }
                  Update: {
                    "card_id"?: string | null,"id"?: string,"rating"?: string,"review_duration_ms"?: number | null,"reviewed_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_logs_card_id_user_id_fkey"
      columns: ["card_id","user_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"tags": {
                  Row: {
                    "id": string,"name": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string,"user_id": string
                  }
                  Update: {
                    "id"?: string,"name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "deck_summaries": {
                  Row: {
                    "created_at": string,"description": string | null,"due_cards": number | null,"id": string,"new_cards": number | null,"title": string,"total_cards": number | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "submit_card_review":
{ Args: { "p_card_id": string,"p_rating": string,"p_review_duration_ms": number,"p_review_id": string }; Returns: {
              "ease_factor": number,"interval_days": number,"next_review_at": string,"repetitions": number,"status": string
            }[]
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
