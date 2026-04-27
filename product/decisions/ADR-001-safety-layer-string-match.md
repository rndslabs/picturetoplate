# ADR-001: Allergen Safety Layer — String Match in v1

**Status:** Accepted  
**Date:** April 2026  
**Author:** Nikitha (Personalisation & Safety Owner)

---

## Context

The app must never show a recipe containing a user's allergen. We needed to decide how to implement this check for the MVP build week given time constraints and the complexity of allergen alias detection (e.g. "casein" = dairy, "semolina" = gluten).

## Decision

Use a simple **JavaScript string match** against the full recipe JSON in v1. If any allergen string from the user's profile appears anywhere in the meal's text, the meal is flagged.

## Reasoning

A string match is deterministic, requires zero additional API calls, cannot hallucinate, and can be built and tested in under an hour. For MVP, where all allergens are entered by the user as plain strings (e.g. "peanuts"), the failure modes are known and limited.

## Trade-offs

A string match will **miss allergen aliases**. A recipe containing "groundnuts" will not trigger a "peanuts" block. A recipe with "casein" will not trigger a "dairy" block. This is a real safety gap.

Mitigation for v1: We display a visible disclaimer in the UI — _"Safety check is string-based. Always verify recipes if you have severe allergies."_ Users are never given a false sense of complete protection.

## v2 Path

Replace with a Claude API call that understands allergen families and aliases. The `SafetyResult.confidenceLevel` field is already reserved in the data model for this upgrade — no schema change required.

## Revisit if

- Any user reports a near-miss where an alias was not caught
- We move beyond MVP and have time to implement the Claude-powered check
- The disclaimer approach is deemed insufficient by any stakeholder
