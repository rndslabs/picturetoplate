from __future__ import annotations

import datetime
from typing import Dict, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel

from app.schemas.ingredient import SessionIngredientRead


SessionStatus = Literal[
    "created",
    "ingredients_detecting",
    "ingredients_detected",
    "confirmed",
    "recipes_generating",
    "recipes_generated",
    "completed",
    "error",
]

InputMethod = Literal["image", "voice", "keyboard"]

SessionErrorCode = Literal[
    "DETECTION_FAILED",
    "RECIPE_GENERATION_FAILED",
    "IMAGE_TOO_LARGE",
    "UNSUPPORTED_MEDIA_TYPE",
    "RATE_LIMITED",
    "UNKNOWN",
]


class ImageInputMeta(BaseModel):
    original_filename: str
    stored_key: str
    media_type: str
    size_bytes: int
    thumbnail_key: Optional[str] = None


class SessionError(BaseModel):
    code: SessionErrorCode
    message: str
    occurred_at: datetime.datetime
    retriable: bool


class DetectionMeta(BaseModel):
    raw_detected: List[str]
    model: Optional[str]
    detected_at: Optional[datetime.datetime]
    detection_duration_ms: Optional[int]
    confidence_scores: Optional[Dict[str, float]] = None


class RecipesMeta(BaseModel):
    generated_at: datetime.datetime
    recipe_ids: List[UUID]
    generation_duration_ms: Optional[int]


class PantrySessionCreate(BaseModel):
    input_method: InputMethod
    servings: int = 2
    dietary_notes: str = ""


class PantrySessionRead(BaseModel):
    session_id: UUID
    user_id: UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime
    status: SessionStatus
    input_method: InputMethod

    image: Optional[ImageInputMeta] = None
    voice_transcript: Optional[str] = None
    keyboard_text: Optional[str] = None

    detection: Optional[DetectionMeta] = None
    recipes: Optional[RecipesMeta] = None

    servings_used: int
    dietary_notes_used: Optional[str]
    error: Optional[SessionError] = None

    detected: List[SessionIngredientRead] = []
    confirmed: List[SessionIngredientRead] = []
    removed: List[SessionIngredientRead] = []
    added_manually: List[SessionIngredientRead] = []

    model_config = {"from_attributes": True}
