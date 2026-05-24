"""
app/routes/twins.py
GET /twins/{persona_id}  — full twin profile for the "Digital Twin" page.
"""
import math
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_profiles, get_item_data
from app.services.recommendation import search_similar_items

router = APIRouter(prefix="/twins", tags=["Digital Twins"])


def sanitize_floats(obj):
    """
    Recursively replace NaN / Inf floats with None so the response
    can be serialized to JSON without crashing.

    This is needed because user_profiles.json is generated from a pandas
    DataFrame which may contain NaN values in fields like rating_distribution.
    """
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: sanitize_floats(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_floats(v) for v in obj]
    return obj


@router.get("/items/{item_id}")
def get_item(item_id: str, item_data: tuple = Depends(get_item_data)):
    """Get metadata for a specific product."""
    _, meta = item_data
    items_meta = meta.get("items", {})
    if item_id not in items_meta:
        raise HTTPException(404, f"Item {item_id} not found")
    
    item_info = items_meta[item_id]
    return sanitize_floats({
        "product_id": item_id,
        "title": item_info.get("title", "Unknown Product"),
        "price": item_info.get("price"),
        "image": item_info.get("image"),
        "avg_rating": item_info.get("avg_rating"),
        "num_reviews": item_info.get("num_reviews"),
        "category": item_info.get("main_category", "Product")
    })

@router.get("/{persona_id}")
def get_twin(persona_id: str, profiles: dict = Depends(get_profiles)):
    """
    Full twin profile — used by the frontend Dashboard page.
    Returns enough data to render review history stats and style samples.
    """
    if persona_id not in profiles:
        raise HTTPException(404, f"Twin {persona_id} not found")

    p = profiles[persona_id]

    # rating_distribution may be a scalar NaN (not a dict) when pandas
    # couldn't compute a distribution (e.g. user has only 1 review).
    dist = p.get("rating_distribution", {})
    if not isinstance(dist, dict):
        dist = {}

    raw = {
        "id": persona_id,
        "avg_rating": round(float(p.get("avg_rating", 0)), 2),
        "num_reviews": int(p.get("num_reviews", 0)),
        "rating_std": round(float(p.get("rating_std", 0.0)), 2),
        "rating_distribution": dist,
        "review_samples": p.get("review_samples", [])[:3],
        "products_reviewed_count": len(p.get("products_reviewed", [])),
        "top_products": p.get("products_reviewed", [])[:5],
    }

    # Sanitize before returning — rating_distribution may contain NaN from pandas
    return sanitize_floats(raw)


@router.get("/{persona_id}/recommendations")
def get_twin_recommendations(
    persona_id: str,
    top_k: int = 10,
    profiles: dict = Depends(get_profiles),
    item_data: tuple = Depends(get_item_data)
):
    """
    Get base FAISS recommendations for the twin without LLM ranking.
    Used by the Dashboard to show raw similarity matches.
    """
    if persona_id not in profiles:
        raise HTTPException(404, f"Twin {persona_id} not found")
        
    faiss_index, meta = item_data
    if faiss_index is None:
        raise HTTPException(503, "FAISS index not loaded")
        
    p = profiles[persona_id]
    user_history = set(p.get("products_reviewed", []))
    
    candidates = search_similar_items(
        profile=p,
        faiss_index=faiss_index,
        meta=meta,
        user_history=user_history,
        top_k=top_k
    )
    
    items_meta = meta.get("items", {})
    results = []
    for rank, (pid, score) in enumerate(candidates):
        item_info = items_meta.get(pid, {})
        results.append({
            "rank": rank + 1,
            "product_id": pid,
            "similarity_score": round(score, 4),
            "avg_rating": item_info.get("avg_rating"),
            "num_reviews": item_info.get("num_reviews"),
            "title": item_info.get("title", "Unknown Product"),
            "price": item_info.get("price"),
            "image": item_info.get("image")
        })
        
    return sanitize_floats({"persona_id": persona_id, "recommendations": results})


