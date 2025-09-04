import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 型安全なクライアント（後で型定義追加）
export type Database = {
  public: {
    Tables: {
      buildings_table_2: {
        Row: {
          building_id: number
          uid: string
          title: string
          titleEn: string | null
          thumbnailUrl: string | null
          youtubeUrl: string | null
          completionYears: string | null
          parentBuildingTypes: string | null
          parentBuildingTypesEn: string | null
          buildingTypes: string | null
          buildingTypesEn: string | null
          parentStructures: string | null
          parentStructuresEn: string | null
          structures: string | null
          structuresEn: string | null
          prefectures: string | null
          prefecturesEn: string | null
          areas: string
          areasEn: string | null
          location: string
          locationEn_from_datasheetChunkEn: string | null
          architectDetails: string | null
          datasheetChunkEn: string | null
          lat: number | null
          lng: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          building_id?: number
          uid: string
          title: string
          titleEn?: string | null
          thumbnailUrl?: string | null
          youtubeUrl?: string | null
          completionYears?: string | null
          parentBuildingTypes?: string | null
          parentBuildingTypesEn?: string | null
          buildingTypes?: string | null
          buildingTypesEn?: string | null
          parentStructures?: string | null
          parentStructuresEn?: string | null
          structures?: string | null
          structuresEn?: string | null
          prefectures?: string | null
          prefecturesEn?: string | null
          areas: string
          areasEn?: string | null
          location: string
          locationEn_from_datasheetChunkEn?: string | null
          architectDetails?: string | null
          datasheetChunkEn?: string | null
          lat?: number | null
          lng?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          building_id?: number
          uid?: string
          title?: string
          titleEn?: string | null
          thumbnailUrl?: string | null
          youtubeUrl?: string | null
          completionYears?: string | null
          parentBuildingTypes?: string | null
          parentBuildingTypesEn?: string | null
          buildingTypes?: string | null
          buildingTypesEn?: string | null
          parentStructures?: string | null
          parentStructuresEn?: string | null
          structures?: string | null
          structuresEn?: string | null
          prefectures?: string | null
          prefecturesEn?: string | null
          areas?: string
          areasEn?: string | null
          location?: string
          locationEn_from_datasheetChunkEn?: string | null
          architectDetails?: string | null
          datasheetChunkEn?: string | null
          lat?: number | null
          lng?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      individual_architects: {
        Row: {
          individual_architect_id: number
          name_ja: string
          name_en: string
          slug: string
        }
        Insert: {
          individual_architect_id?: number
          name_ja: string
          name_en: string
          slug: string
        }
        Update: {
          individual_architect_id?: number
          name_ja?: string
          name_en?: string
          slug?: string
        }
      }
      architect_compositions: {
        Row: {
          composition_id: number
          architect_id: number
          individual_architect_id: number
          order_index: number
        }
        Insert: {
          composition_id?: number
          architect_id: number
          individual_architect_id: number
          order_index: number
        }
        Update: {
          composition_id?: number
          architect_id?: number
          individual_architect_id?: number
          order_index?: number
        }
      }
      building_architects: {
        Row: {
          building_id: number
          architect_id: number
          architect_order: number
        }
        Insert: {
          building_id: number
          architect_id: number
          architect_order: number
        }
        Update: {
          building_id?: number
          architect_id?: number
          architect_order?: number
        }
      }
      architect_websites_3: {
        Row: {
          website_id: number
          architect_id: number
          url: string | null
          architectJa: string
          architectEn: string | null
          invalid: boolean | null
          title: string | null
        }
        Insert: {
          website_id?: number
          architect_id: number
          url?: string | null
          architectJa: string
          architectEn?: string | null
          invalid?: boolean | null
          title?: string | null
        }
        Update: {
          website_id?: number
          architect_id?: number
          url?: string | null
          architectJa?: string
          architectEn?: string | null
          invalid?: boolean | null
          title?: string | null
        }
      }
      photos: {
        Row: {
          id: number
          building_id: number
          url: string
          thumbnail_url: string
          likes: number
          created_at: string
        }
        Insert: {
          id?: number
          building_id: number
          url: string
          thumbnail_url: string
          likes?: number
          created_at?: string
        }
        Update: {
          id?: number
          building_id?: number
          url?: string
          thumbnail_url?: string
          likes?: number
          created_at: string
        }
      }
      architect_names: {
        Row: {
          name_id: number
          architect_name: string
          slug: string
          created_at: string
        }
        Insert: {
          name_id?: number
          architect_name: string
          slug: string
          created_at?: string
        }
        Update: {
          name_id?: number
          architect_name?: string
          slug?: string
          created_at?: string
        }
      }
      architect_name_relations: {
        Row: {
          relation_id: number
          architect_id: number
          name_id: number
          created_at: string
        }
        Insert: {
          relation_id?: number
          architect_id: number
          name_id: number
          created_at?: string
        }
        Update: {
          relation_id?: number
          architect_id?: number
          name_id?: number
          created_at?: string
        }
      }
    }
  }
}