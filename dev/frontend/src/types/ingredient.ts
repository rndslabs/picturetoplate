// Matches ADR-004: Ingredient JSON Contract

export type QuantityUnit =
  | 'ea'
  | 'g'
  | 'kg'
  | 'ml'
  | 'L'
  | 'cup'
  | 'tbsp'
  | 'tsp'
  | 'oz'
  | 'lb'
  | 'bunch'
  | 'slice'
  | 'loaf'
  | 'ball'
  | 'pantry'
  | 'other'

export type IngredientSource = 'photo' | 'voice' | 'text' | 'pantry'

export interface IngredientQuantity {
  // number for measurables; string for fractions ("½") and pantry marker ("—")
  amount: number | string
  unit: QuantityUnit
}

export interface SessionIngredientRead {
  session_ingredient_id: string
  session_id: string
  catalog_ref: string | null
  name: string
  quantity: IngredientQuantity
  // null for text/pantry sources; 0.000–1.000 for photo/voice
  confidence_score: number | null
  source: IngredientSource
  is_confirmed: boolean
  is_deleted: boolean
  added_at: string // ISO 8601
}

export interface IngredientCatalogEntry {
  ingredient_id: string
  name: string
  category: string
  aliases: string[]
}
