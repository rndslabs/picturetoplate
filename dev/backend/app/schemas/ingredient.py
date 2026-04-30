from __future__ import annotations

import datetime
from typing import Dict, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


QuantityUnit = Literal[
    "piece", "g", "kg", "ml", "l", "cup", "tbsp", "tsp", "oz", "lb", "pinch", "bunch", "slice"
]

IngredientCategory = Literal[
    "protein", "dairy", "produce", "grain", "legume",
    "spice", "condiment", "oil", "beverage", "other",
]

IngredientInputMethod = Literal["detected", "voice", "keyboard"]

SessionIngredientState = Literal["pending", "confirmed", "removed", "edited"]


class IngredientQuantity(BaseModel):
    amount: float = Field(gt=0)
    unit: QuantityUnit


# ── Catalog schemas (ADR-004) ─────────────────────────────────────────────────

class NutritionPer100g(BaseModel):
    calories_kcal: Optional[float] = None
    protein_g: Optional[float] = None
    carbohydrates_g: Optional[float] = None
    fat_g: Optional[float] = None
    fiber_g: Optional[float] = None
    sugar_g: Optional[float] = None
    sodium_mg: Optional[float] = None
    nutrition_source: Optional[str] = None
    nutrition_source_id: Optional[str] = None


class IngredientCatalogEntry(BaseModel):
    ingredient_id: UUID
    name: str
    display_name: str
    category: IngredientCategory
    aliases: List[str] = []
    common_allergens: List[str] = []
    nutrition_per_100g: Optional[NutritionPer100g] = None

    model_config = {"from_attributes": True}


# ── Session ingredient schemas (ADR-004) ──────────────────────────────────────

class SessionIngredientCreate(BaseModel):
    name: str
    display_name: str
    quantity: IngredientQuantity = IngredientQuantity(amount=1.0, unit="piece")
    input_method: IngredientInputMethod
    catalog_ref: Optional[UUID] = None
    confidence_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class SessionIngredientRead(BaseModel):
    session_ingredient_id: UUID
    session_id: UUID
    catalog_ref: Optional[UUID]
    name: str
    display_name: str
    quantity: IngredientQuantity
    input_method: IngredientInputMethod
    state: SessionIngredientState
    confidence_score: Optional[float]
    detected_at: datetime.datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_flat(cls, row: object) -> SessionIngredientRead:
        """Map flat ORM columns (quantity_amount, quantity_unit) to nested quantity."""
        return cls(
            session_ingredient_id=row.session_ingredient_id,  # type: ignore[attr-defined]
            session_id=row.session_id,  # type: ignore[attr-defined]
            catalog_ref=row.catalog_ref,  # type: ignore[attr-defined]
            name=row.name,  # type: ignore[attr-defined]
            display_name=row.display_name,  # type: ignore[attr-defined]
            quantity=IngredientQuantity(
                amount=float(row.quantity_amount),  # type: ignore[attr-defined]
                unit=row.quantity_unit,  # type: ignore[attr-defined]
            ),
            input_method=row.input_method,  # type: ignore[attr-defined]
            state=row.state,  # type: ignore[attr-defined]
            confidence_score=float(row.confidence_score) if row.confidence_score is not None else None,  # type: ignore[attr-defined]
            detected_at=row.detected_at,  # type: ignore[attr-defined]
        )
