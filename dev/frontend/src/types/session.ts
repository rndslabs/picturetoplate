// Matches ADR-007: Pantry Scan Session Contract

import type { SessionIngredientRead } from './ingredient'

export type SessionStatus =
  | 'draft'
  | 'detecting'
  | 'detected'
  | 'confirming'
  | 'confirmed'
  | 'generating'
  | 'done'

export type InputMethod = 'photo' | 'voice' | 'keyboard'

export interface PantrySessionRead {
  session_id: string
  user_id: string
  status: SessionStatus
  input_method: InputMethod
  image_key: string | null
  voice_transcript: string | null
  keyboard_raw: string | null
  detection_raw: string[] | null
  // Maps ingredient name → raw confidence from the vision model
  detection_confidence_scores: Record<string, number> | null
  ingredients: SessionIngredientRead[]
  created_at: string // ISO 8601
  updated_at: string // ISO 8601
}
