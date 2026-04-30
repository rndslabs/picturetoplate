from __future__ import annotations

import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


SkillLevel = Literal["beginner", "intermediate", "advanced"]
SubscriptionTier = Literal["free", "pro"]
UnitSystem = Literal["metric", "imperial"]


class Household(BaseModel):
    adults: int = Field(ge=1, default=1)
    children: int = Field(ge=0, default=0)
    default_servings: int = Field(ge=1, default=2)


class NutritionGoals(BaseModel):
    enabled: bool = False
    daily_calories_kcal: Optional[int] = None
    high_protein: bool = False
    low_sodium: bool = False


class UiPreferences(BaseModel):
    default_unit_system: UnitSystem = "metric"
    language: str = "en-US"
    voice_input_enabled: bool = True


# ── User profile schemas (ADR-005) ────────────────────────────────────────────

class UserProfileCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    household: Household = Household()


class UserProfileRead(BaseModel):
    user_id: UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime
    display_name: str
    email: str
    avatar_url: Optional[str]
    household: Household
    onboarding_completed: bool
    subscription_tier: SubscriptionTier

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_flat(cls, row: object) -> UserProfileRead:
        return cls(
            user_id=row.user_id,  # type: ignore[attr-defined]
            created_at=row.created_at,  # type: ignore[attr-defined]
            updated_at=row.updated_at,  # type: ignore[attr-defined]
            display_name=row.display_name,  # type: ignore[attr-defined]
            email=row.email,  # type: ignore[attr-defined]
            avatar_url=row.avatar_url,  # type: ignore[attr-defined]
            household=Household(
                adults=row.household_adults,  # type: ignore[attr-defined]
                children=row.household_children,  # type: ignore[attr-defined]
                default_servings=row.default_servings,  # type: ignore[attr-defined]
            ),
            onboarding_completed=row.onboarding_completed,  # type: ignore[attr-defined]
            subscription_tier=row.subscription_tier,  # type: ignore[attr-defined]
        )


# ── User preferences schemas (ADR-005) ───────────────────────────────────────

class UserPreferencesCreate(BaseModel):
    allergens: List[str] = []
    dietary_restrictions: List[str] = []
    disliked_ingredients: List[str] = []
    cuisine_preferences: List[str] = []
    skill_level: SkillLevel = "beginner"
    max_cook_time_minutes: int = Field(ge=5, default=60)
    equipment_available: List[str] = []
    nutrition_goals: NutritionGoals = NutritionGoals()
    ui_preferences: UiPreferences = UiPreferences()


class UserPreferencesRead(UserPreferencesCreate):
    user_id: UUID
    updated_at: Optional[str]

    model_config = {"from_attributes": True}
