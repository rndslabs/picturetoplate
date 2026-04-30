from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .session import PantrySession
    from .recipe import RecipeCard, SavedRecipe


class User(TimestampMixin, Base):
    __tablename__ = "users"

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    household_adults: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    household_children: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    default_servings: Mapped[int] = mapped_column(Integer, nullable=False, default=2)

    onboarding_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    subscription_tier: Mapped[str] = mapped_column(String(20), nullable=False, default="free")

    preferences: Mapped[Optional[UserPreferences]] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    sessions: Mapped[List[PantrySession]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    recipe_cards: Mapped[List[RecipeCard]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    saved_recipes: Mapped[List[SavedRecipe]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True
    )

    allergens: Mapped[List] = mapped_column(ARRAY(Text), nullable=False, default=list)
    dietary_restrictions: Mapped[List] = mapped_column(ARRAY(Text), nullable=False, default=list)
    disliked_ingredients: Mapped[List] = mapped_column(ARRAY(Text), nullable=False, default=list)
    cuisine_preferences: Mapped[List] = mapped_column(ARRAY(Text), nullable=False, default=list)

    skill_level: Mapped[str] = mapped_column(String(20), nullable=False, default="beginner")
    max_cook_time_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    equipment_available: Mapped[List] = mapped_column(ARRAY(Text), nullable=False, default=list)

    nutrition_goals: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=lambda: {"enabled": False, "daily_calories_kcal": None, "high_protein": False, "low_sodium": False},
    )
    ui_preferences: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=lambda: {"default_unit_system": "metric", "language": "en-US", "voice_input_enabled": True},
    )
    updated_at: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    user: Mapped[User] = relationship(back_populates="preferences")
