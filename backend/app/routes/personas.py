import math
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict
from pydantic import BaseModel
from app.dependencies import get_personas_data, get_profiles

router = APIRouter(prefix="/personas", tags=["Personas"])

class CreatePersonaRequest(BaseModel):
    review_style: str
    avg_rating: float = 4.0

def _safe(obj):
    """Replace NaN/Inf floats with None for JSON compliance."""
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: _safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_safe(v) for v in obj]
    return obj


@router.get("", response_model=List[Dict])
def list_personas(personas: List[Dict] = Depends(get_personas_data)):
    """List all available personas (pre-exported from Kaggle)."""
    return personas


@router.post("")
def create_persona(
    req: CreatePersonaRequest,
    personas: List[Dict] = Depends(get_personas_data),
    profiles: Dict = Depends(get_profiles),
):
    """Create a new fresh persona from onboarding chat."""
    new_id = f"NEW_USER_{len(profiles) + 1}"
    new_profile = {
        "id": new_id,
        "avg_rating": req.avg_rating,
        "num_reviews": 1,
        "rating_std": 0.5,
        "rating_distribution": {"1.0": 0, "2.0": 0, "3.0": 0, "4.0": 1, "5.0": 0},
        "review_samples": [req.review_style],
        "products_reviewed": [],
        "products_reviewed_count": 0,
    }
    # Add to in-memory store
    profiles[new_id] = new_profile
    personas.insert(0, new_profile)  # Add to the beginning so it shows up first
    
    return _safe({
        "id": new_id,
        "avg_rating": new_profile["avg_rating"],
        "num_reviews": new_profile["num_reviews"],
        "rating_distribution": new_profile["rating_distribution"],
        "review_style": req.review_style,
        "products_reviewed_count": 0,
    })


@router.get("/{persona_id}")
def get_persona(persona_id: str, profiles: Dict = Depends(get_profiles)):
    """Get persona details. Also used by the Twin page."""
    if persona_id not in profiles:
        raise HTTPException(404, f"Persona {persona_id} not found")
    p = profiles[persona_id]
    dist = p.get("rating_distribution", {})
    if not isinstance(dist, dict):
        dist = {}
    raw = {
        "id": persona_id,
        "avg_rating": round(float(p.get("avg_rating", 0)), 2),
        "num_reviews": int(p.get("num_reviews", 0)),
        "rating_distribution": dist,
        "review_style": " ".join(p.get("review_samples", [])[:1])[:200],
        "products_reviewed_count": len(p.get("products_reviewed", [])),
    }
    return _safe(raw)
