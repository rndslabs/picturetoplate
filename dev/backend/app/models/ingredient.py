from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .session import SessionIngredient


class IngredientCatalog(Base):
    """Master ingredient reference — canonical names, categories, aliases.

    Nutritional data lives in the paired NutritionCatalog row (1-to-1).
    Seeded from USDA FDC / Open Food Facts; treated as read-only at runtime.
    """

    __tablename__ = "ingredient_catalog"

    ingredient_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    # protein | dairy | produce | grain | legume | spice | condiment | oil | beverage | other
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="other", index=True)
    aliases: Mapped[List] = mapped_column(ARRAY(Text), nullable=False, default=list)
    common_allergens: Mapped[List] = mapped_column(ARRAY(Text), nullable=False, default=list)

    nutrition: Mapped[Optional[NutritionCatalog]] = relationship(
        back_populates="ingredient", uselist=False, cascade="all, delete-orphan"
    )
    session_ingredients: Mapped[List[SessionIngredient]] = relationship(
        back_populates="catalog_entry"
    )


class NutritionCatalog(Base):
    """Nutritional values per 100 g for each catalog ingredient.

    All macro columns nullable — entries may exist before nutrition data is sourced.
    """

    __tablename__ = "nutrition_catalog"

    ingredient_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True
    )

    calories_kcal: Mapped[Optional[float]] = mapped_column(Numeric(7, 2), nullable=True)
    protein_g: Mapped[Optional[float]] = mapped_column(Numeric(7, 2), nullable=True)
    carbohydrates_g: Mapped[Optional[float]] = mapped_column(Numeric(7, 2), nullable=True)
    fat_g: Mapped[Optional[float]] = mapped_column(Numeric(7, 2), nullable=True)
    fiber_g: Mapped[Optional[float]] = mapped_column(Numeric(7, 2), nullable=True)
    sugar_g: Mapped[Optional[float]] = mapped_column(Numeric(7, 2), nullable=True)
    sodium_mg: Mapped[Optional[float]] = mapped_column(Numeric(7, 2), nullable=True)

    nutrition_source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    nutrition_source_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    ingredient: Mapped[IngredientCatalog] = relationship(back_populates="nutrition")
