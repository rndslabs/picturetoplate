from __future__ import annotations

import datetime
from typing import TYPE_CHECKING, Dict, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User
    from .session import PantrySession


class RecipeCard(Base):
    """A generated recipe card — full expanded contract from ADR-006.

    JSONB columns (ingredients_used, ingredients_missing, steps, nutrition_per_serving,
    generation_meta) are validated by Pydantic before write; never written directly to DB.
    """

    __tablename__ = "recipe_cards"

    recipe_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    # Null if session is later deleted; recipe history is preserved (SET NULL)
    session_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("pantry_sessions.session_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    generated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    servings: Mapped[int] = mapped_column(Integer, nullable=False)

    cuisine_tags: Mapped[List] = mapped_column(ARRAY(Text), nullable=False, default=list)
    dietary_tags: Mapped[List] = mapped_column(ARRAY(Text), nullable=False, default=list)

    # Stored flat for index-based filtering (ADR-006)
    prep_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    cook_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    total_minutes: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    # easy | medium | hard
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    # JSONB blobs — structure validated by Pydantic schemas before any write
    ingredients_used: Mapped[List] = mapped_column(JSONB, nullable=False, default=list)
    ingredients_missing: Mapped[List] = mapped_column(JSONB, nullable=False, default=list)
    steps: Mapped[List] = mapped_column(JSONB, nullable=False, default=list)
    # Includes data_completeness: full | partial | unavailable
    nutrition_per_serving: Mapped[Optional[Dict]] = mapped_column(JSONB, nullable=True)

    # Safety block — ADR-001 / ADR-006
    allergen_check_passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    # string-match-v1 | claude-api-v2
    allergen_check_method: Mapped[str] = mapped_column(String(30), nullable=False, default="string-match-v1")
    # Reserved for v2 Claude-API safety layer (ADR-001)
    allergen_confidence_level: Mapped[Optional[float]] = mapped_column(Numeric(4, 3), nullable=True)
    flagged_allergens: Mapped[List] = mapped_column(ARRAY(Text), nullable=False, default=list)
    disclaimer_shown: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Audit — not shown to users; enables model version and prompt A/B tracking
    generation_meta: Mapped[Optional[Dict]] = mapped_column(JSONB, nullable=True)

    session: Mapped[Optional[PantrySession]] = relationship(back_populates="recipe_cards")
    user: Mapped[User] = relationship(back_populates="recipe_cards")
    saved_by: Mapped[List[SavedRecipe]] = relationship(
        back_populates="recipe", cascade="all, delete-orphan"
    )


class SavedRecipe(Base):
    """Junction table: user ↔ recipe_card with rating and notes."""

    __tablename__ = "saved_recipes"
    __table_args__ = (UniqueConstraint("user_id", "recipe_id", name="uq_saved_user_recipe"),)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recipe_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("recipe_cards.recipe_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    saved_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship(back_populates="saved_recipes")
    recipe: Mapped[RecipeCard] = relationship(back_populates="saved_by")
