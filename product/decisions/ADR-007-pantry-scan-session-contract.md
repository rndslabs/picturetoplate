# ADR-007: JSON Contract — Pantry Scan Session

**Status:** Accepted  
**Date:** April 2026  
**Author:** Deb (PM Lead / Architect)

---

## Context

A **pantry scan session** is the top-level workflow object that ties together a single user interaction — from the moment they upload a photo, speak ingredients, or type a list, through ingredient confirmation, to a set of generated recipe cards. It is the unit of history ("last Tuesday's scan"), the unit of resumability ("continue where I left off"), and the audit trail for debugging AI detection quality.

The session contract must support three input methods from day one: image upload, voice, and keyboard.

## Decision

### `PantrySession` — full shape

```json
{
  "session_id": "uuid-v4",
  "user_id": "uuid-v4",
  "created_at": "2026-04-30T10:10:00Z",
  "updated_at": "2026-04-30T10:22:00Z",
  "status": "recipes_generated",

  "input": {
    "method": "image",
    "image": {
      "original_filename": "fridge_photo.jpg",
      "stored_key": "sessions/uuid-v4/original.jpg",
      "media_type": "image/jpeg",
      "size_bytes": 2345678,
      "thumbnail_key": "sessions/uuid-v4/thumb.jpg"
    },
    "voice_transcript": null,
    "keyboard_text": null
  },

  "detection": {
    "raw_detected": ["chicken breast", "lemon", "garlic", "butter", "milk", "eggs"],
    "model": "claude-sonnet-4-6",
    "detected_at": "2026-04-30T10:12:00Z",
    "detection_duration_ms": 1840,
    "confidence_scores": {
      "chicken breast": 0.94,
      "lemon": 0.88,
      "garlic": 0.97,
      "butter": 0.72,
      "milk": 0.65,
      "eggs": 0.91
    }
  },

  "ingredients": {
    "detected": ["session-ingredient-uuid-1", "session-ingredient-uuid-2"],
    "confirmed": ["session-ingredient-uuid-1", "session-ingredient-uuid-3"],
    "removed": ["session-ingredient-uuid-2"],
    "added_manually": ["session-ingredient-uuid-4"]
  },

  "recipes": {
    "generated_at": "2026-04-30T10:20:00Z",
    "recipe_ids": ["recipe-uuid-1", "recipe-uuid-2", "recipe-uuid-3"],
    "generation_duration_ms": 3210
  },

  "servings_used": 3,
  "dietary_notes_used": "no dairy",

  "error": null
}
```

### Status lifecycle (ordered)

```
created → ingredients_detecting → ingredients_detected → confirmed → recipes_generating → recipes_generated → completed
                                                                                                             ↓
                                                                                                           error
```

| Status | Meaning |
|---|---|
| `created` | Session row inserted; no AI call made yet |
| `ingredients_detecting` | Image/voice/text submitted to Claude; waiting for response |
| `ingredients_detected` | Raw ingredient list returned; user has not yet confirmed |
| `confirmed` | User has reviewed, edited, and confirmed their ingredient list |
| `recipes_generating` | Recipe generation call in progress |
| `recipes_generated` | Three recipe cards have been returned and stored |
| `completed` | User has interacted with at least one recipe card (viewed/saved/rated) |
| `error` | Any AI call or storage step failed; `error` field contains detail |

### `error` object shape (when status == `"error"`)

```json
{
  "code": "DETECTION_FAILED",
  "message": "Claude Vision returned an unparseable response.",
  "occurred_at": "2026-04-30T10:12:05Z",
  "retriable": true
}
```

**`error.code`** values:  
`DETECTION_FAILED` | `RECIPE_GENERATION_FAILED` | `IMAGE_TOO_LARGE` | `UNSUPPORTED_MEDIA_TYPE` | `RATE_LIMITED` | `UNKNOWN`

## Input method rules

| `input.method` | Required field | Nullable fields |
|---|---|---|
| `image` | `input.image` | `voice_transcript`, `keyboard_text` |
| `voice` | `input.voice_transcript` | `image`, `keyboard_text` |
| `keyboard` | `input.keyboard_text` | `image`, `voice_transcript` |

For `voice` input: `detection.raw_detected` is populated by parsing the transcript (Claude text API, not Vision). `confidence_scores` may be `null` for voice — confidence is implicitly 1.0 for user-spoken items.

For `keyboard` input: `detection.raw_detected` is the parsed token list from the user's typed text. No AI call is required; detection latency is near-zero.

## Reasoning

**Session as the unit of history** — every ingredient list and every recipe card links back to a session. This gives users a browsable "scan history" screen without additional infrastructure. Recipes that were generated together are always retrievable as a group.

**Separating `detected` vs `confirmed` vs `added_manually` ingredient lists** — the product hypothesis is that detection accuracy will be high but not perfect. Separating these lists lets us measure:
- What fraction of detected ingredients are confirmed vs removed (AI accuracy signal)
- How often users add ingredients not detected (coverage gap signal)

These signals inform future model fine-tuning and UI copy.

**`detection_duration_ms` and `generation_duration_ms`** — stored for latency monitoring. Busy-parent persona has low patience for slow feedback; these fields let engineering track p95 latency per model version without external APM tooling.

**Image stored by key, not URL** — `stored_key` is a path in our object storage bucket (Supabase Storage or S3-compatible). The API generates a signed URL at read time rather than storing a long-lived public URL, which degrades security over time.

## Trade-offs

- **Sessions are never deleted automatically.** A session with `status: error` sits in the DB permanently. Add a TTL-based cleanup job (90-day soft delete) before launch.
- **Voice transcript is stored as raw text.** If the voice input contains PII (a user dictates "I have Sarah's allergy-safe chicken"), this is persisted. Add a transcript scrubbing step if PII concerns are raised.
- **Multi-image sessions are not supported in v1.** A single session maps to a single image (or voice/keyboard input). Multiple fridge compartments require multiple sessions. Extend `input.image` to `input.images: []` in v2 if needed.
- **`servings_used` and `dietary_notes_used`** are snapshot fields — they record what was sent to the recipe generator at the time of generation. If the user subsequently changes their preferences, existing recipe cards are not re-generated.

## Revisit if

- We add collaborative household scanning (two parents scan together) — add `collaborators: [user_id]` to the session.
- We build a meal planner that generates a week of recipes in one session — `recipes.recipe_ids` already supports >3 entries; no schema change required.
- We add real-time ingredient confirmation via WebSockets — `status` transitions map directly to WebSocket event types and require no schema change.
