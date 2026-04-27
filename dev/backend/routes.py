from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
from app.services.anthropic_service import detect_ingredients, generate_recipes

router = APIRouter(prefix="/api", tags=["core"])

ALLOWED_MEDIA_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


# ── Request / Response models ────────────────────────────────────────────────

class IngredientsResponse(BaseModel):
    ingredients: list[str]


class RecipeRequest(BaseModel):
    ingredients: list[str]
    servings: int = 2
    dietary_notes: str = ""


class Recipe(BaseModel):
    title: str
    description: str
    ingredients_used: list[str]
    steps: list[str]
    time_minutes: int
    difficulty: str


class RecipesResponse(BaseModel):
    recipes: list[Recipe]


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/detect-ingredients", response_model=IngredientsResponse)
async def detect_ingredients_endpoint(file: UploadFile = File(...)):
    """
    Upload a fridge/pantry photo → get back a list of detected ingredients.
    Accepts JPEG, PNG, WebP, GIF up to 5 MB.
    """
    if file.content_type not in ALLOWED_MEDIA_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type '{file.content_type}'. Use JPEG, PNG, WebP, or GIF.",
        )

    image_bytes = await file.read()

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be under 5 MB.")

    try:
        ingredients = detect_ingredients(image_bytes, file.content_type)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(exc)}")

    return IngredientsResponse(ingredients=ingredients)


@router.post("/generate-recipes", response_model=RecipesResponse)
async def generate_recipes_endpoint(body: RecipeRequest):
    """
    Send an ingredient list → get back 3 recipe suggestions.
    """
    if not body.ingredients:
        raise HTTPException(status_code=422, detail="ingredients list cannot be empty.")

    try:
        recipes = generate_recipes(body.ingredients, body.servings, body.dietary_notes)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(exc)}")

    return RecipesResponse(recipes=recipes)


@router.get("/health")
def health():
    """Simple liveness probe."""
    return {"status": "ok"}
