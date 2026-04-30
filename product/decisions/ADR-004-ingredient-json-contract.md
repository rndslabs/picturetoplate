# ADR-004: JSON Contract — Ingredient (with Nutritional Value)

**Status:** Accepted  
**Date:** April 2026  
**Author:** Deb (PM Lead / Architect)

---

## Context

The app detects ingredients from images, voice, and keyboard input. Every detected item must carry enough information to:

1. Display it meaningfully on the ingredient confirmation screen.
2. Filter recipes against user allergens and dietary tags.
3. Power a nutritional summary on each recipe card.

We needed a single canonical ingredient object used across the scan session, the ingredient catalog, and any recipe ingredient reference.

## Decision

Two distinct but related shapes:

### 1. `IngredientCatalogEntry` — master reference (stored in DB, read-only at runtime)

```json
{
  "ingredient_id": "uuid-v4",
  "name": "chicken breast",
  "display_name": "Chicken Breast",
  "category": "protein",
  "aliases": ["chicken", "poultry breast", "chicken fillet"],
  "common_allergens": [],
  "nutrition_per_100g": {
    "calories_kcal": 165,
    "protein_g": 31.0,
    "carbohydrates_g": 0.0,
    "fat_g": 3.6,
    "fiber_g": 0.0,
    "sugar_g": 0.0,
    "sodium_mg": 74.0
  },
  "nutrition_source": "USDA-FDC",
  "nutrition_source_id": "331960"
}
```

### 2. `SessionIngredient` — one instance per detected/confirmed item in a scan session

```json
{
  "session_ingredient_id": "uuid-v4",
  "session_id": "uuid-v4",
  "catalog_ref": "uuid-v4",
  "name": "chicken breast",
  "display_name": "Chicken Breast",
  "quantity": {
    "amount": 2.0,
    "unit": "piece"
  },
  "input_method": "detected",
  "state": "confirmed",
  "confidence_score": 0.91,
  "detected_at": "2026-04-30T10:15:00Z"
}
```

### Enum definitions

**`category`** (IngredientCatalogEntry)  
`protein` | `dairy` | `produce` | `grain` | `legume` | `spice` | `condiment` | `oil` | `beverage` | `other`

**`unit`** (quantity)  
`piece` | `g` | `kg` | `ml` | `l` | `cup` | `tbsp` | `tsp` | `oz` | `lb` | `pinch` | `bunch` | `slice`

**`input_method`** (SessionIngredient)  
`detected` | `voice` | `keyboard`

**`state`** (SessionIngredient)  
`pending` | `confirmed` | `removed` | `edited`

## Reasoning

Splitting into a **catalog entry** (stable, nutritional truth) and a **session ingredient** (mutable per scan) prevents duplicating nutritional data for every scan and allows the catalog to be updated independently. The `catalog_ref` foreign key links the two.

`confidence_score` is populated only when `input_method == "detected"` (Claude Vision). For voice or keyboard entries it is `null` — consumers must handle this.

Nutrition values are per **100 g** to enable proportional scaling for any quantity. The frontend calculates per-serving nutrition using `quantity.amount`, `quantity.unit`, and a unit-to-gram conversion table (maintained in the frontend utilities layer).

`nutrition_source` and `nutrition_source_id` point to USDA FDC or Open Food Facts so the catalog can be audited and updated without losing provenance.

## Trade-offs

- **Missing catalog entries:** Claude Vision may detect items not in our catalog (e.g. a niche regional ingredient). For v1, these get a `catalog_ref: null` and a `nutrition_per_100g: null` sentinel. The UI shows "Nutrition unavailable" rather than crashing.
- **Quantity estimation:** Quantities are user-editable defaults. Claude Vision does not estimate quantities in v1 — `amount` defaults to `1.0` and `unit` defaults to `piece` unless the user corrects it.
- **Plural/alias matching:** Alias matching for allergen safety is the concern of the safety layer (see ADR-001). The ingredient contract itself makes no safety decisions.

## Revisit if

- We integrate a barcode scanner — add an optional `barcode_upc` field to `IngredientCatalogEntry`.
- Claude Vision is upgraded to estimate quantities — populate `quantity` from the AI response rather than defaulting.
- We add expiry tracking for smart fridge management — add `expires_at` to `SessionIngredient`.
