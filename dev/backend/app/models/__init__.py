# Import all ORM model modules so SQLAlchemy's MetaData is fully populated.
# Required by Alembic's autogenerate and by the async engine at startup.
from app.models.user import User, UserPreferences
from app.models.ingredient import IngredientCatalog, NutritionCatalog
from app.models.session import PantrySession, SessionIngredient
from app.models.recipe import RecipeCard, SavedRecipe

__all__ = [
    "User",
    "UserPreferences",
    "IngredientCatalog",
    "NutritionCatalog",
    "PantrySession",
    "SessionIngredient",
    "RecipeCard",
    "SavedRecipe",
]
