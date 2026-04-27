# ADR-002: Python Backend — FastAPI over Flask

**Status:** Accepted  
**Date:** April 2026  
**Author:** Deb (PM Lead / Architect)

---

## Context

The backend needed to handle multipart image uploads, make async calls to the Anthropic API, and expose typed JSON endpoints that the React frontend could consume reliably. We evaluated Flask and FastAPI.

## Decision

Use **FastAPI** as the Python web framework.

## Reasoning

FastAPI provides automatic request/response validation via Pydantic, async support out of the box (important for non-blocking Anthropic API calls), and auto-generated API documentation at `/docs` — which is immediately useful for the whole team to inspect and test endpoints without writing any frontend code first. Flask requires additional libraries to achieve the same.

## Trade-offs

FastAPI has a steeper initial learning curve than Flask for Python beginners. The Pydantic model layer adds boilerplate. For a simple CRUD app this overhead would not be worth it — but for an AI pipeline with strict JSON contracts between modules, the type safety pays for itself within the first day.

## Revisit if

- The team finds Pydantic's validation errors confusing during development
- We need to move to a serverless/Lambda deployment where a lighter framework would be preferable
