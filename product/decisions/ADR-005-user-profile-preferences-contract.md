# ADR-005: JSON Contract — User Profile and Preferences

**Status:** Accepted  
**Date:** April 2026  
**Author:** Nikitha (Personalisation & Safety Owner)

---

## Context

PictureToPlate's primary persona is **busy parents and caregivers** feeding households with mixed dietary needs — children with allergies, partners with intolerances, varying skill levels in the kitchen. The user object must capture enough household context to:

1. Personalise recipe suggestions (serving size, cuisine style, skill level, max cook time).
2. Enforce allergen safety filtering on every generated recipe (see ADR-001).
3. Drive onboarding UX — collect the minimum viable preference set without friction.

## Decision

Two shapes stored together but conceptually distinct:

### `UserProfile` — account-level identity and household facts

```json
{
  "user_id": "uuid-v4",
  "created_at": "2026-04-30T10:00:00Z",
  "updated_at": "2026-04-30T10:00:00Z",
  "display_name": "Sarah",
  "email": "sarah@example.com",
  "avatar_url": null,
  "household": {
    "adults": 2,
    "children": 1,
    "default_servings": 3
  },
  "onboarding_completed": false,
  "subscription_tier": "free"
}
```

### `UserPreferences` — dietary, safety, and UX settings (1-to-1 with UserProfile)

```json
{
  "user_id": "uuid-v4",
  "updated_at": "2026-04-30T10:00:00Z",
  "allergens": ["peanuts", "tree nuts"],
  "dietary_restrictions": ["vegetarian"],
  "disliked_ingredients": ["cilantro", "blue cheese"],
  "cuisine_preferences": ["italian", "asian", "mexican"],
  "skill_level": "beginner",
  "max_cook_time_minutes": 30,
  "equipment_available": ["oven", "microwave", "air-fryer"],
  "nutrition_goals": {
    "enabled": false,
    "daily_calories_kcal": null,
    "high_protein": false,
    "low_sodium": false
  },
  "ui_preferences": {
    "default_unit_system": "metric",
    "language": "en-US",
    "voice_input_enabled": true
  }
}
```

### Enum definitions

**`dietary_restrictions`** (array of strings, open-ended but canonical values)  
`vegetarian` | `vegan` | `pescatarian` | `gluten-free` | `dairy-free` | `keto` | `paleo` | `halal` | `kosher`

**`skill_level`**  
`beginner` | `intermediate` | `advanced`

**`equipment_available`**  
`oven` | `stovetop` | `microwave` | `slow-cooker` | `instant-pot` | `air-fryer` | `grill` | `blender` | `food-processor`

**`default_unit_system`**  
`metric` | `imperial`

**`subscription_tier`**  
`free` | `pro`

## Reasoning

**Allergens are plain strings**, not a closed enum. This matches v1's string-match safety layer (ADR-001) — both the user record and the recipe text are plain strings. A closed enum would require maintaining an allergen taxonomy and would break if a user typed a regional term. The trade-off is that "groundnuts" and "peanuts" are treated as different allergens, which ADR-001 already documents and mitigates with a UI disclaimer.

**`disliked_ingredients`** is separate from allergens because the consequence of a match is different: allergens hard-block a recipe, dislikes soft-filter (deprioritise) it. The recipe generation prompt and safety layer must treat these two arrays differently.

**`nutrition_goals`** is opt-in and disabled by default. Collecting calorie targets during onboarding increases drop-off; we ask only after the user has successfully completed one scan.

**`onboarding_completed`** is a boolean flag (not a step index) so the frontend can always decide which onboarding screen to show without encoding step logic in the backend.

## Onboarding minimum required fields

During onboarding, collect and persist these fields before allowing the first scan:

| Field | Why it matters |
|---|---|
| `household.default_servings` | Recipe generation needs a serving count |
| `allergens` | Safety filtering cannot work without this |
| `dietary_restrictions` | Prevents showing recipes the user cannot eat |
| `skill_level` | Filters out recipes that are too complex |
| `max_cook_time_minutes` | Core "busy parent" filter |

All other preference fields default to empty/null and can be set later in Settings.

## Trade-offs

- **Open-ended allergen strings** risk inconsistency across users (peanut vs peanuts). A normalisation step (lowercase, singular) should be applied on write. Canonical allergen aliases are the concern of the v2 safety layer.
- **`cuisine_preferences`** is used as a soft signal to the recipe generation prompt, not a hard filter. Claude may still return a non-preferred cuisine if it best matches available ingredients.
- **`subscription_tier`** is stored here for API gating logic but its business rules live in the billing service, not the preference layer.

## Revisit if

- We add household member profiles (individual allergen profiles per child) — add a `household_members` array to `UserProfile`.
- Nutrition goal tracking is prioritised — expand `nutrition_goals` with weekly targets and a history link.
- We support multiple languages beyond `en-US` — add localisation catalog entries alongside `language`.
