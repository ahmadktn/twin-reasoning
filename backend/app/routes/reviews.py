"""
app/routes/reviews.py
POST /reviews/generate  — streams reasoning + review via SSE.
POST /reviews/generate/sync  — non-streaming fallback.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.dependencies import get_llm, get_profiles, get_reviews
from app.llm_provider import LLMProvider
from app.models import GenerateReviewRequest, ReviewResult
from app.services.user_modeling import (
    predict_rating,
    generate_review,
    stream_review_generation,
)

router = APIRouter(prefix="/reviews", tags=["Reviews – Task A"])


@router.post("/generate")
async def generate_review_stream(
    req: GenerateReviewRequest,
    profiles: dict = Depends(get_profiles),
    llm: LLMProvider = Depends(get_llm),
):
    """
    Stream reasoning steps + review via SSE.
    Connect with EventSource on the frontend.

    SSE event types:
      { "type": "reasoning", "step": N, "text": "..." }
      { "type": "token",     "text": "..." }          ← live token stream
      { "type": "result",    "rating": N, "review": "...", "confidence": 0.9 }
    """
    if req.persona_id not in profiles:
        raise HTTPException(404, f"Persona {req.persona_id} not found")

    profile = profiles[req.persona_id]
    rating = predict_rating(profile, req.target_rating)

    return StreamingResponse(
        stream_review_generation(profile, req.product_id, rating, llm),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/generate/sync", response_model=ReviewResult)
async def generate_review_sync(
    req: GenerateReviewRequest,
    profiles: dict = Depends(get_profiles),
    llm: LLMProvider = Depends(get_llm),
):
    """Non-streaming fallback — returns full result at once."""
    if req.persona_id not in profiles:
        raise HTTPException(404, f"Persona {req.persona_id} not found")

    profile = profiles[req.persona_id]
    rating = predict_rating(profile, req.target_rating)
    review = await generate_review(profile, req.product_id, rating, llm)

    return ReviewResult(
        persona_id=req.persona_id,
        product_id=req.product_id,
        predicted_rating=rating,
        review=review,
        confidence=round(min(0.95, 0.6 + rating / 10), 2),
    )
