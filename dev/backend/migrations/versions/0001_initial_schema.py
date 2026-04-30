"""Initial schema — all tables from ADR-003 through ADR-007

Revision ID: 0001
Revises:
Create Date: 2026-04-30
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("avatar_url", sa.Text, nullable=True),
        sa.Column("household_adults", sa.Integer, nullable=False, server_default="1"),
        sa.Column("household_children", sa.Integer, nullable=False, server_default="0"),
        sa.Column("default_servings", sa.Integer, nullable=False, server_default="2"),
        sa.Column("onboarding_completed", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("subscription_tier", sa.String(20), nullable=False, server_default="free"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ── user_preferences ──────────────────────────────────────────────────────
    op.create_table(
        "user_preferences",
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.user_id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("updated_at", sa.String, nullable=True),
        sa.Column("allergens", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("dietary_restrictions", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("disliked_ingredients", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("cuisine_preferences", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("skill_level", sa.String(20), nullable=False, server_default="beginner"),
        sa.Column("max_cook_time_minutes", sa.Integer, nullable=False, server_default="60"),
        sa.Column("equipment_available", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column(
            "nutrition_goals",
            postgresql.JSONB,
            nullable=False,
            server_default='{"enabled": false, "daily_calories_kcal": null, "high_protein": false, "low_sodium": false}',
        ),
        sa.Column(
            "ui_preferences",
            postgresql.JSONB,
            nullable=False,
            server_default='{"default_unit_system": "metric", "language": "en-US", "voice_input_enabled": true}',
        ),
    )

    # ── ingredient_catalog ────────────────────────────────────────────────────
    op.create_table(
        "ingredient_catalog",
        sa.Column("ingredient_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("display_name", sa.String(200), nullable=False),
        sa.Column("category", sa.String(50), nullable=False, server_default="other"),
        sa.Column("aliases", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("common_allergens", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
    )
    op.create_index("ix_ingredient_catalog_name", "ingredient_catalog", ["name"], unique=True)
    op.create_index("ix_ingredient_catalog_category", "ingredient_catalog", ["category"])

    # ── nutrition_catalog ─────────────────────────────────────────────────────
    op.create_table(
        "nutrition_catalog",
        sa.Column(
            "ingredient_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ingredient_catalog.ingredient_id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("calories_kcal", sa.Numeric(7, 2), nullable=True),
        sa.Column("protein_g", sa.Numeric(7, 2), nullable=True),
        sa.Column("carbohydrates_g", sa.Numeric(7, 2), nullable=True),
        sa.Column("fat_g", sa.Numeric(7, 2), nullable=True),
        sa.Column("fiber_g", sa.Numeric(7, 2), nullable=True),
        sa.Column("sugar_g", sa.Numeric(7, 2), nullable=True),
        sa.Column("sodium_mg", sa.Numeric(7, 2), nullable=True),
        sa.Column("nutrition_source", sa.String(50), nullable=True),
        sa.Column("nutrition_source_id", sa.String(50), nullable=True),
    )

    # ── pantry_sessions ───────────────────────────────────────────────────────
    op.create_table(
        "pantry_sessions",
        sa.Column("session_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.user_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="created"),
        sa.Column("input_method", sa.String(20), nullable=False),
        # Image fields
        sa.Column("image_stored_key", sa.Text, nullable=True),
        sa.Column("image_media_type", sa.String(50), nullable=True),
        sa.Column("image_size_bytes", sa.Integer, nullable=True),
        sa.Column("image_thumbnail_key", sa.Text, nullable=True),
        # Voice / keyboard fields
        sa.Column("voice_transcript", sa.Text, nullable=True),
        sa.Column("keyboard_text", sa.Text, nullable=True),
        # Detection outputs
        sa.Column("detection_raw", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("detection_model", sa.String(100), nullable=True),
        sa.Column("detection_confidence_scores", postgresql.JSONB, nullable=True),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("detection_duration_ms", sa.Integer, nullable=True),
        # Recipe generation snapshot
        sa.Column("servings_used", sa.Integer, nullable=False, server_default="2"),
        sa.Column("dietary_notes_used", sa.Text, nullable=True),
        sa.Column("recipes_generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("generation_duration_ms", sa.Integer, nullable=True),
        # Error state
        sa.Column("error", postgresql.JSONB, nullable=True),
    )
    op.create_index("ix_pantry_sessions_user_id", "pantry_sessions", ["user_id"])
    op.create_index("ix_pantry_sessions_status", "pantry_sessions", ["status"])

    # ── session_ingredients ───────────────────────────────────────────────────
    op.create_table(
        "session_ingredients",
        sa.Column("session_ingredient_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("pantry_sessions.session_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "catalog_ref",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ingredient_catalog.ingredient_id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("display_name", sa.String(200), nullable=False),
        sa.Column("quantity_amount", sa.Numeric(10, 3), nullable=False, server_default="1.0"),
        sa.Column("quantity_unit", sa.String(20), nullable=False, server_default="piece"),
        sa.Column("input_method", sa.String(20), nullable=False),
        sa.Column("state", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("confidence_score", sa.Numeric(4, 3), nullable=True),
        sa.Column("detected_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_session_ingredients_session_id", "session_ingredients", ["session_id"])
    op.create_index("ix_session_ingredients_catalog_ref", "session_ingredients", ["catalog_ref"])
    op.create_index("ix_session_ingredients_state", "session_ingredients", ["state"])

    # ── recipe_cards ──────────────────────────────────────────────────────────
    op.create_table(
        "recipe_cards",
        sa.Column("recipe_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("pantry_sessions.session_id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.user_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("servings", sa.Integer, nullable=False),
        sa.Column("cuisine_tags", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("dietary_tags", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("prep_minutes", sa.Integer, nullable=False),
        sa.Column("cook_minutes", sa.Integer, nullable=False),
        sa.Column("total_minutes", sa.Integer, nullable=False),
        sa.Column("difficulty", sa.String(20), nullable=False),
        # JSONB blobs — validated by Pydantic before write
        sa.Column("ingredients_used", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("ingredients_missing", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("steps", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("nutrition_per_serving", postgresql.JSONB, nullable=True),
        # Safety block
        sa.Column("allergen_check_passed", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("allergen_check_method", sa.String(30), nullable=False, server_default="string-match-v1"),
        sa.Column("allergen_confidence_level", sa.Numeric(4, 3), nullable=True),
        sa.Column("flagged_allergens", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("disclaimer_shown", sa.Boolean, nullable=False, server_default="true"),
        # Audit / A/B testing — not exposed to users
        sa.Column("generation_meta", postgresql.JSONB, nullable=True),
    )
    op.create_index("ix_recipe_cards_user_id", "recipe_cards", ["user_id"])
    op.create_index("ix_recipe_cards_session_id", "recipe_cards", ["session_id"])
    op.create_index("ix_recipe_cards_total_minutes", "recipe_cards", ["total_minutes"])
    op.create_index("ix_recipe_cards_difficulty", "recipe_cards", ["difficulty"])
    op.create_index("ix_recipe_cards_allergen_check_passed", "recipe_cards", ["allergen_check_passed"])

    # ── saved_recipes ─────────────────────────────────────────────────────────
    op.create_table(
        "saved_recipes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.user_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "recipe_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("recipe_cards.recipe_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("saved_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("rating", sa.Integer, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.UniqueConstraint("user_id", "recipe_id", name="uq_saved_user_recipe"),
    )
    op.create_index("ix_saved_recipes_user_id", "saved_recipes", ["user_id"])
    op.create_index("ix_saved_recipes_recipe_id", "saved_recipes", ["recipe_id"])


def downgrade() -> None:
    op.drop_table("saved_recipes")
    op.drop_table("recipe_cards")
    op.drop_table("session_ingredients")
    op.drop_table("pantry_sessions")
    op.drop_table("nutrition_catalog")
    op.drop_table("ingredient_catalog")
    op.drop_table("user_preferences")
    op.drop_table("users")
