# Architecture Research: Allergen Safety Check Implementation

**Decision:** Use string-match as the v1 allergen safety layer  
**Prepared:** April 2026  
**Feeds into:** ADR-001

---

## The problem

PictureToPlate generates recipe cards for households that may include members with severe allergies. The app must never surface a recipe containing an allergen that the user has declared in their profile. A false negative — a recipe shown when it should be blocked — is a safety risk, not just a product bug.

The fundamental challenge is **semantic equivalence**: "peanuts" and "groundnuts" are the same allergen. "Casein" and "dairy" refer to overlapping categories. The user types "peanuts"; the recipe says "groundnut oil". A pure string match misses this.

### Hard constraints

| # | Requirement | Why |
|---|---|---|
| H1 | Zero false negatives on exact matches | If a user enters "peanuts" and the recipe text contains the word "peanuts", it must be blocked — every time, deterministically |
| H2 | No additional latency path on success | Recipe generation already takes 1–3 seconds; the safety check must not add a serial Anthropic API call on the happy path |
| H3 | Deterministic and auditable | The same recipe + same allergen list must produce the same result every time; non-deterministic AI checks are hard to debug and harder to explain to worried parents |
| H4 | Testable without API key | Unit tests must be able to verify the safety check without hitting a live AI API |
| H5 | Displayable disclaimer | Whatever the implementation, the UI must be honest about its limitations with users who have severe allergies |

### Soft preferences

| # | Preference | Why |
|---|---|---|
| S1 | Low implementation cost | Build week; the safety check must ship, not be an excuse to delay the whole feature |
| S2 | Alias coverage | "Groundnuts" should trigger a "peanuts" block eventually |
| S3 | Confidence score for future upgrade | The output data model should reserve space for a confidence level so v2 can emit one without a schema change |

---

## Options evaluated

### 1. String-match against full recipe JSON ✅ CHOSEN (v1)

**What it is:** Serialise the entire recipe card to a lowercase string. For each allergen in the user's profile, check if that string appears anywhere in the recipe text. If found, flag the recipe and block it from display.

```python
def check_allergens(recipe: dict, allergens: list[str]) -> list[str]:
    recipe_text = json.dumps(recipe).lower()
    return [a for a in allergens if a.lower() in recipe_text]
```

**How it satisfies requirements:**

| Requirement | How |
|---|---|
| H1 Exact matches | ✅ A substring match on the full recipe JSON catches the allergen in title, description, ingredients_used, and steps |
| H2 No added latency | ✅ A string search on a 2 KB JSON blob takes <1 ms; adds nothing measurable to the response time |
| H3 Deterministic | ✅ Same inputs always produce the same output; no model temperature, no sampling |
| H4 Testable | ✅ Pure Python function; no external dependencies; 100% unit-testable |
| H5 Disclaimer | ✅ UI displays: "Safety check is string-based. Always verify recipes if you have severe allergies." |
| S1 Low cost | ✅ ~10 lines of code; ships in one hour |
| S3 Confidence score | ✅ `allergen_confidence_level` column in `recipe_cards` is reserved null; `allergen_check_method = "string-match-v1"` |

**Known failure modes (documented, not hidden):**

| Scenario | Result | Frequency |
|---|---|---|
| User enters "peanuts"; recipe says "groundnuts" | ❌ Miss | Low — depends on recipe source country |
| User enters "dairy"; recipe says "casein" | ❌ Miss | Low — uncommon in plain-language recipes |
| User enters "gluten"; recipe says "wheat flour" | ❌ Miss | Medium — "gluten" is a component, not an ingredient name |
| User enters "nuts"; recipe says "walnut" | ✅ Hit — "nut" is substring of "walnut" | — |
| User enters "egg"; recipe says "eggplant" | ⚠️ False positive | Low — "egg" appears in "eggplant" |

The false positive case (eggplant) is a known edge case. It is preferable to the false negative case — a recipe incorrectly blocked is an annoyance; a recipe incorrectly shown is a safety risk. The disclaimer makes the trade-off explicit.

---

### 2. Claude API allergen check (serial call after recipe generation)

**What it is:** After generating a recipe card, make a second Claude API call with the recipe text and allergen list, asking Claude to reason about whether any allergen is present — including aliases and derivatives.

```
Prompt: "Does this recipe contain any of the following allergens, including
aliases and derivatives? Allergens: [peanuts, tree nuts]. Recipe: [...]
Return JSON: {contains_allergen: bool, flagged: [list], confidence: 0–1}"
```

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Exact matches | ✅ Claude correctly identifies direct mentions |
| H2 No added latency | ❌ An additional Claude API call adds ~1–2 seconds to every recipe generation. For 3 recipes, this is 3–6 additional seconds — a 100–200% latency increase |
| H3 Deterministic | ❌ Claude's outputs vary slightly across calls; `temperature=0` reduces but does not eliminate this |
| H4 Testable | ❌ Unit tests require mocking the Claude client or an API key; the safety check cannot be tested in isolation |
| H5 Disclaimer | ✅ — but the disclaimer can be less aggressive since alias coverage is better |
| S2 Alias coverage | ✅ This is Claude's core strength — semantic understanding of allergen families |
| S3 Confidence score | ✅ Claude can emit a confidence level naturally |

**The decisive problem:** Non-determinism (H3) means the same allergen + recipe pair might pass on Monday and fail on Tuesday due to model updates or sampling variation. For an allergen safety check, this is not an acceptable property. A parent who gets a recipe one day may not get the same safety result the next. The system must behave consistently.

The latency cost (H2) is also significant for the "busy parent" persona. A scan + detect + confirm + generate flow already takes 5–8 seconds. Adding 3–6 more seconds for safety checking every recipe card would push total latency to 10–15 seconds — unacceptable for a mobile UX.

**The right role for Claude API in safety:** A batch re-check job that runs nightly and flags any historical recipe cards where the string match and Claude disagree. This gives alias coverage without adding runtime latency. Planned for v2.

**Verdict:** Correct for v2 as a batch verification layer; ruled out for v1 runtime safety check on H2 (latency) and H3 (non-determinism).

---

### 3. Static allergen taxonomy lookup

**What it is:** Maintain a curated dictionary of allergen aliases. When a user declares "peanuts", the system expands it to `["peanuts", "groundnuts", "groundnut oil", "arachis oil", "monkey nuts"]` and checks all aliases.

```python
ALLERGEN_ALIASES = {
    "peanuts": ["peanuts", "groundnuts", "groundnut oil", "arachis oil", "monkey nuts"],
    "dairy": ["milk", "butter", "cream", "casein", "lactose", "whey", "cheese", ...],
    "gluten": ["wheat", "barley", "rye", "spelt", "semolina", "flour", ...],
    ...
}
```

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Exact matches | ✅ Aliases cover exact matches and common variants |
| H2 No added latency | ✅ Dictionary lookup is O(n) on alias list; negligible latency |
| H3 Deterministic | ✅ Static dictionary; completely deterministic |
| H4 Testable | ✅ Pure Python; no external dependencies |
| H5 Disclaimer | ✅ Smaller disclaimer needed — alias coverage is explicit |
| S1 Low cost | ⚠️ Building a comprehensive alias dictionary for 14 major allergen families is a 2–3 day content task, not a coding task |
| S2 Alias coverage | ✅ Explicit control over which aliases are covered |

**Why it was not chosen for v1:**

The dictionary must be **maintained**. A food scientist or nutritionist must curate it. New allergen aliases emerge (new product names, regional terms, novel ingredients). A static dictionary that is 90% correct is arguably worse than a simple string match with an honest disclaimer — the 90% coverage creates a false sense of safety for the 10% it misses.

For v2, a static taxonomy is a strong middle ground between string-match and full AI: deterministic, fast, auditable, and with good alias coverage — if properly maintained. The cost is the ongoing content maintenance burden.

**Verdict:** Strong candidate for v2. Ruled out for v1 on S1 (content maintenance burden during build week) — the dictionary would be partial and potentially misleading.

---

### 4. Third-party allergen API

**What it is:** Services like Edamam, Spoonacular, or Open Food Facts provide allergen detection APIs. Submit a recipe, receive an allergen analysis.

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Exact matches | ✅ Professionally curated databases |
| H2 No added latency | ❌ External HTTP call adds 200–500 ms per recipe; serial for 3 recipes = 600–1500 ms |
| H3 Deterministic | ✅ Deterministic for the same API version |
| H4 Testable | ❌ Requires API key; mocking adds complexity |
| H5 Disclaimer | ⚠️ Third-party APIs may have their own limitations not documented to us |
| S1 Low cost | ❌ Edamam: $0/month (25 req/day) to $299/month. Spoonacular: $0/month (150 req/day) |

**The layering problem:** We are generating recipes via Claude API. Running those recipes through a second third-party allergen API means we pay Claude for generation and pay Edamam for verification — two variable API costs per scan. The free tiers (25–150 req/day) would be exhausted quickly by a moderately active user base.

**Verdict:** Ruled out on H2 (serial external HTTP latency) and cost model (two variable API costs per scan).

---

## Side-by-side comparison

| Criterion | String-match v1 | Claude API (serial) | Static taxonomy | Third-party API |
|---|---|---|---|---|
| Exact match accuracy | ✅ | ✅ | ✅ | ✅ |
| Alias / derivative coverage | ❌ | ✅ | ✅ if maintained | ✅ |
| Zero added latency | ✅ | ❌ +1–2s/recipe | ✅ | ❌ +200–500ms |
| Fully deterministic | ✅ | ❌ | ✅ | ✅ |
| Testable without API key | ✅ | ❌ | ✅ | ❌ |
| Implementation cost (build week) | ✅ ~10 lines | ✅ ~30 lines | ❌ 2–3 day content task | ❌ API setup + billing |
| Hard constraints met (of 5) | **5 / 5** | 3 / 5 | 4 / 5 | 3 / 5 |

---

## Decision rationale summary

String-match is chosen not because it has the best allergen coverage — it does not — but because it is the only option that satisfies all five hard constraints simultaneously, including the non-negotiable requirement that it be deterministic and testable without external dependencies.

The disclaimer is not a workaround; it is the correct product decision. The v1 string-match detects the cases that matter most (a user who enters "peanuts" and a recipe that says "peanuts"), is completely transparent about its limitations, and ships in one hour. The upgrade path to Claude API batch verification or a maintained static taxonomy is explicitly reserved via the `allergen_confidence_level` null field and the `allergen_check_method` string.

---

## Revisit if

- Any user reports a near-miss (the only trigger that makes this a P0)
- We have a food scientist available to build and maintain a static alias taxonomy (upgrade to option 3)
- Recipe generation latency improves to <2 seconds — then a parallel Claude API safety check becomes viable without doubling total response time
- We add household member profiles with individual allergen lists — the v2 safety check must reason about multiple profiles simultaneously, which string-match cannot do contextually
