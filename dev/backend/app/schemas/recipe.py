from __future__ import annotations

import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.ingredient import IngredientQuantity


Difficulty = Literal["easy", "medium", "hard"]
AllergenCheckMethod = Literal["string-match-v1", "claude-api-v2"]
NutritionDataCompleteness = Literal["full", "partial", "unavailable"]


class RecipeTime(BaseModel):
    prep_minutes: int = Field(ge=0)
    cook_minutes: int = Field(ge=0)
    total_minutes: int = Field(ge=1)


class RecipeIngredient(BaseModel):
    name: str
    display_name: str
    quantity: IngredientQuantity
    notes: Optional[str] = None
    catalog_ref: Optional[UUID] = None


class RecipeStep(BaseModel):
    step_number: int = Field(ge=1)
    instruction: str
    duration_minutes: Optional[int] = None


class NutritionPerServing(BaseModel):
    calories_kcal: Optional[float] = None
    protein_g: Optional[float] = None
    carbohydrates_g: Optional[float] = None
    fat_g: Optional[float] = None
    fiber_g: Optional[float] = None
    sugar_g: Optional[float] = None
    sodium_mg: Optional[float] = None
    data_completeness: NutritionDataCompleteness = "unavailable"


class RecipeSafety(BaseModel):
    allergen_check_passed: bool
    allergen_check_method: AllergenCheckMethod = "string-match-v1"
    confidence_level: Optional[float] = None  # reserved for claude-api-v2
    flagged_allergens: List[str] = []
    disclaimer_shown: bool = True


class RecipeGenerationMeta(BaseModel):
    model: str
    prompt_version: str
    input_ingredient_count: int
    source_session_id: Optional[UUID] = None


class UserRecipeInteraction(BaseModel):
    saved: bool = False
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    notes: Optional[str] = None
    saved_at: Optional[datetime.datetime] = None


# ── Recipe card schemas (ADR-006) ─────────────────────────────────────────────

class RecipeCardRead(BaseModel):
    """Full expanded recipe card — canonical output shape from ADR-006."""

    recipe_id: UUID
    session_id: Optional[UUID]
    user_id: UUID
    generated_at: datetime.datetime

    title: str
    description: str
    servings: int
    cuisine_tags: List[str]
    dietary_tags: List[str]

    time: RecipeTime
    difficulty: Difficulty

    ingredients_used: List[RecipeIngredient]
    ingredients_missing: List[RecipeIngredient]
    steps: List[RecipeStep]
    nutrition_per_serving: Optional[NutritionPerServing]

    safety: RecipeSafety
    user_interaction: UserRecipeInteraction
    generation_meta: Optional[RecipeGenerationMeta]

    model_config = {"from_attributes": True}


class RecipeCardSummary(BaseModel):
    recipe_id: UUID
    title: str
    description: str
    difficulty: Difficulty
    total_minutes: int
    cuisine_tags: List[str]
    dietary_tags: List[str]
    allergen_check_passed: bool
    saved: bool = False
    rating: Optional[int] = None

    model_config = {"from_attributes": True}


class SaveRecipeRequest(BaseModel):
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    notes: Optional[str] = None


class SavedRecipeRead(BaseModel):
    id: UUID
    user_id: UUID
    recipe_id: UUID
    saved_at: datetime.datetime
    rating: Optional[int]
    notes: Optional[str]

    model_config = {"from_attributes": True}
