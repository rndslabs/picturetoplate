from __future__ import annotations

import datetime
from typing import TYPE_CHECKING, Dict, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .user import User
    from .ingredient import IngredientCatalog
    from .recipe import RecipeCard


class PantrySession(TimestampMixin, Base):
    """One row per user scan interaction — image, voice, or keyboard.

    Status lifecycle (ADR-007):
      created → ingredients_detecting → ingredients_detected →
      confirmed → recipes_generating → recipes_generated → completed | error
    """

    __tablename__ = "pantry_sessions"

    session_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # image | voice | keyboard
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="created", index=True)
    input_method: Mapped[str] = mapped_column(String(20), nullable=False)

    # Image fields — null when input_method != "image"
    image_stored_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_media_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    image_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    image_thumbnail_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Voice / keyboard raw input
    voice_transcript: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    keyboard_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Detection outputs
    detection_raw: Mapped[List] = mapped_column(ARRAY(Text), nullable=False, default=list)
    detection_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    detection_confidence_scores: Mapped[Optional[Dict]] = mapped_column(JSONB, nullable=True)
    detected_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    detection_duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Snapshot of parameters used at generation time
    servings_used: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    dietary_notes_used: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recipes_generated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    generation_duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # {code, message, occurred_at, retriable} — null unless status == "error"
    error: Mapped[Optional[Dict]] = mapped_column(JSONB, nullable=True)

    user: Mapped[User] = relationship(back_populates="sessions")
    ingredients: Mapped[List[SessionIngredient]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )
    recipe_cards: Mapped[List[RecipeCard]] = relationship(back_populates="session")


class SessionIngredient(Base):
    """One detected/confirmed/added ingredient within a scan session.

    input_method: detected | voice | keyboard
    state:        pending | confirmed | removed | edited
    """

    __tablename__ = "session_ingredients"

    session_ingredient_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    session_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("pantry_sessions.session_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Null when Claude Vision detects an item not in the catalog (ADR-004)
    catalog_ref: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("ingredient_catalog.ingredient_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)

    # Defaults to 1.0 / piece until user corrects (ADR-004)
    quantity_amount: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False, default=1.0)
    quantity_unit: Mapped[str] = mapped_column(String(20), nullable=False, default="piece")

    input_method: Mapped[str] = mapped_column(String(20), nullable=False)
    state: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)

    # Null for voice/keyboard; 0.0–1.0 for Claude Vision detections
    confidence_score: Mapped[Optional[float]] = mapped_column(Numeric(4, 3), nullable=True)
    detected_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    session: Mapped[PantrySession] = relationship(back_populates="ingredients")
    catalog_entry: Mapped[Optional[IngredientCatalog]] = relationship(
        back_populates="session_ingredients"
    )
