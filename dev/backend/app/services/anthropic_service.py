import base64
import json

import anthropic

from app.core.config import get_settings

settings = get_settings()

_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)


def _encode_image(image_bytes: bytes) -> str:
    return base64.standard_b64encode(image_bytes).decode("utf-8")


def detect_ingredients(image_bytes: bytes, media_type: str) -> list[str]:
    b64_image = _encode_image(image_bytes)

    message = _client.messages.create(
        model=settings.anthropic_model,
        max_tokens=512,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": b64_image,
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            "You are a kitchen assistant. Look at this image and list "
                            "every identifiable food ingredient or grocery item you can see. "
                            "Return ONLY a JSON array of strings — ingredient names in plain English, "
                            "singular form, lower-case. Example: [\"chicken breast\", \"lemon\", \"garlic\"]. "
                            "No explanation, no markdown, no extra keys. JSON array only."
                        ),
                    },
                ],
            }
        ],
    )

    raw = message.content[0].text.strip()
    return json.loads(raw)


def generate_recipes(
    ingredients: list[str],
    servings: int = 2,
    dietary_notes: str = "",
) -> list[dict]:
    dietary_clause = f" Dietary requirements: {dietary_notes}." if dietary_notes else ""

    message = _client.messages.create(
        model=settings.anthropic_model,
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": (
                    f"You are a creative chef. I have these ingredients: {', '.join(ingredients)}. "
                    f"Suggest exactly 3 recipes I can make for {servings} people.{dietary_clause} "
                    "Return ONLY a JSON array of recipe objects. Each object must have these keys: "
                    "title (string), description (string, 1 sentence), ingredients_used (array of strings), "
                    "steps (array of strings), time_minutes (integer), difficulty (\"easy\"|\"medium\"|\"hard\"). "
                    "No markdown, no explanation. JSON array only."
                ),
            }
        ],
    )

    raw = message.content[0].text.strip()
    return json.loads(raw)
