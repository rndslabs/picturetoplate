"""
Tests for the PictureToPlate API.

Unit tests (no API key needed):
    pytest app/tests/ -v

Integration tests (require ANTHROPIC_API_KEY in dev/.env):
    pytest app/tests/ -v -m integration
"""
import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


def _make_test_image_bytes() -> bytes:
    img = Image.new("RGB", (100, 100), color=(200, 180, 160))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_detect_ingredients_wrong_type():
    response = client.post(
        "/api/detect-ingredients",
        files={"file": ("data.csv", b"col1,col2\n1,2", "text/csv")},
    )
    assert response.status_code == 415


def test_detect_ingredients_too_large():
    big_bytes = b"x" * (5 * 1024 * 1024 + 1)
    response = client.post(
        "/api/detect-ingredients",
        files={"file": ("big.jpg", big_bytes, "image/jpeg")},
    )
    assert response.status_code == 413


def test_generate_recipes_empty_ingredients():
    response = client.post("/api/generate-recipes", json={"ingredients": []})
    assert response.status_code == 422


@pytest.mark.integration
def test_detect_ingredients_live():
    image_bytes = _make_test_image_bytes()
    response = client.post(
        "/api/detect-ingredients",
        files={"file": ("fridge.png", image_bytes, "image/png")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "ingredients" in data
    assert isinstance(data["ingredients"], list)


@pytest.mark.integration
def test_generate_recipes_live():
    response = client.post(
        "/api/generate-recipes",
        json={"ingredients": ["chicken", "lemon", "garlic", "olive oil"], "servings": 2},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["recipes"]) == 3
    assert "title" in data["recipes"][0]
