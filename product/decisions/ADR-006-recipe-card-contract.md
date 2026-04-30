# ADR-006: JSON Contract — Recipe Card

**Status:** Accepted  
**Date:** April 2026  
**Author:** Deb (PM Lead / Architect)

---

## Context

A recipe card is the primary output of the PictureToPlate pipeline. It must carry enough data to:

1. Render a full recipe detail screen on mobile and web (title, description, steps, timing).
2. Display a nutritional summary per serving.
3. Show which detected ingredients are used and which must be bought ("missing ingredients").
4. Record the result of the allergen safety check so the UI can surface the correct warning state.
5. Be saved to a user's favourites and rated.

The existing backend (routes.py) returns a minimal recipe shape. This ADR defines the **canonical expanded contract** that all clients and services must use going forward. The existing shape is a strict subset and is backwards-compatible.

## Decision

### `RecipeCard` — full shape

```json
{
  "recipe_id": "uuid-v4",
  "session_id": "uuid-v4",
  "user_id": "uuid-v4",
  "generated_at": "2026-04-30T10:20:00Z",

  "title": "Lemon Garlic Chicken",
  "description": "A bright, 30-minute weeknight chicken dish that uses pantry staples.",
  "servings": 3,
  "cuisine_tags": ["american", "weeknight"],
  "dietary_tags": ["gluten-free", "dairy-free"],

  "time": {
    "prep_minutes": 10,
    "cook_minutes": 20,
    "total_minutes": 30
  },
  "difficulty": "easy",

  "ingredients_used": [
    {
      "name": "chicken breast",
      "display_name": "Chicken Breast",
      "quantity": {
        "amount": 600.0,
        "unit": "g"
      },
      "notes": "boneless, skinless",
      "catalog_ref": "uuid-v4"
    }
  ],
  "ingredients_missing": [
    {
      "name": "lemon",
      "display_name": "Lemon",
      "quantity": {
        "amount": 2.0,
        "unit": "piece"
      },
      "notes": null,
      "catalog_ref": "uuid-v4"
    }
  ],

  "steps": [
    {
      "step_number": 1,
      "instruction": "Pat the chicken dry and season both sides with salt and pepper.",
      "duration_minutes": 2
    },
    {
      "step_number": 2,
      "instruction": "Heat oil in a skillet over medium-high heat. Sear chicken 5 minutes per side.",
      "duration_minutes": 10
    }
  ],

  "nutrition_per_serving": {
    "calories_kcal": 285,
    "protein_g": 35.0,
    "carbohydrates_g": 5.0,
    "fat_g": 12.0,
    "fiber_g": 0.5,
    "sugar_g": 1.0,
    "sodium_mg": 420.0,
    "data_completeness": "partial"
  },

  "safety": {
    "allergen_check_passed": true,
    "allergen_check_method": "string-match-v1",
    "confidence_level": null,
    "flagged_allergens": [],
    "disclaimer_shown": true
  },

  "user_interaction": {
    "saved": false,
    "rating": null,
    "notes": null,
    "saved_at": null
  },

  "generation_meta": {
    "model": "claude-sonnet-4-6",
    "prompt_version": "recipe-v1",
    "input_ingredient_count": 8,
    "source_session_id": "uuid-v4"
  }
}
```

### Enum definitions

**`difficulty`**  
`easy` | `medium` | `hard`

**`allergen_check_method`**  
`string-match-v1` | `claude-api-v2`

**`data_completeness`** (nutrition_per_serving)  
`full` | `partial` | `unavailable`

- `full` — all detected ingredients resolved to catalog entries with USDA nutritional data.
- `partial` — at least one ingredient lacked a catalog match; nutrition totals are estimates.
- `unavailable` — nutritional catalog was unreachable or all ingredients unresolved.

**`rating`**  
Integer `1`–`5` or `null`.

## Reasoning

**`ingredients_missing`** is a first-class field, not a note buried in `description`. Busy parents need to know immediately if a recipe requires a store run. The UI uses this to surface a "Shopping list" CTA.

**`time`** is split into `prep_minutes`, `cook_minutes`, and `total_minutes` rather than a single integer. The "max cook time" preference filter in ADR-005 applies to `total_minutes`, but the UI may want to show prep vs. cook separately for users who prep at lunchtime and cook at dinner.

**`nutrition_per_serving.data_completeness`** is an explicit signal so the UI can render the correct caveat ("Estimated nutrition — some ingredients could not be resolved") rather than silently displaying potentially incomplete numbers.

**`safety.disclaimer_shown`** records that the UI surface-rendered the v1 string-match disclaimer for this card. This is an audit field for the safety upgrade in v2 — when migrating to `claude-api-v2`, we can identify cards that were generated under the weaker check.

**`generation_meta`** is stored but not displayed to end users. It enables debugging, prompt A/B testing, and model version auditing without coupling those concerns to the user-facing schema.

## Backwards compatibility

The existing backend `Recipe` Pydantic model (`title`, `description`, `ingredients_used`, `steps`, `time_minutes`, `difficulty`) is a strict subset of this contract. The current `time_minutes` field maps to `time.total_minutes`. The migration path is:

1. Backend: expand the Pydantic model to emit the full `RecipeCard` shape.
2. Frontend: consume the expanded shape; ignore unknown fields during transition.
3. DB: store full JSONB in `recipe_cards` table; add indexed columns for `difficulty`, `total_minutes`, `allergen_check_passed` for query performance.

## Trade-offs

- **Nutritional calculation is approximate.** Nutrition is summed from catalog entries scaled by quantity. Unit-to-gram conversions (e.g. "1 cup of rice = 185 g") are maintained in a conversion table; missing conversions yield `data_completeness: partial`.
- **`cuisine_tags` and `dietary_tags` are Claude-generated** and may be inconsistent across invocations. A normalisation step should canonicalise tags against a known list before storage.
- **`ingredients_missing` relies on session context.** If a recipe is re-displayed without its originating session, `ingredients_missing` reflects the state at generation time, not the user's current pantry.

## Revisit if

- We add a meal planner — add `planned_for_date` and `meal_slot` (`breakfast` | `lunch` | `dinner` | `snack`) fields.
- We surface video cooking guides — add an optional `media` array of `{type: "video", url, thumbnail_url}` objects.
- The recipe generation prompt is versioned for A/B testing — `generation_meta.prompt_version` already supports this; add a lookup table mapping version strings to prompt templates.
