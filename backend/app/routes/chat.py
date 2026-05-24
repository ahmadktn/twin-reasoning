from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import pandas as pd

from app.dependencies import get_llm, get_profiles, get_item_data, get_reviews
from app.llm_provider import LLMProvider
from app.models import ChatRequest, ChatResponse, Recommendation
from app.services.recommendation import (
    multi_turn_recommend,
    cold_start,
    multi_turn_recommend_stream,
    cold_start_stream
)

router = APIRouter(prefix="/chat", tags=["Chat – Task B"])


@router.post("/recommend", response_model=ChatResponse)
async def recommend(
    req: ChatRequest,
    profiles: dict = Depends(get_profiles),
    item_data=Depends(get_item_data),
    llm: LLMProvider = Depends(get_llm),
):
    if req.persona_id not in profiles:
        raise HTTPException(404, f"Persona {req.persona_id} not found")

    faiss_index, meta = item_data
    profile = profiles[req.persona_id]
    user_history = set(profile.get("products_reviewed", []))

    if faiss_index is None or profile["num_reviews"] <= 2:
        from app.dependencies import get_reviews
        df = get_reviews()
        recs = cold_start(df, top_k=req.top_k)
        reply = "Omo! Based on what's popular, here are some great picks for you:"
    else:
        messages = [m.model_dump() for m in req.messages]
        reply, recs = await multi_turn_recommend(
            profile, messages, faiss_index, meta, user_history, llm, req.top_k, req.naija_mode
        )

    return ChatResponse(
        reply=reply,
        recommendations=[Recommendation(**r) for r in recs],
    )


@router.post("/recommend_stream")
async def recommend_stream(
    req: ChatRequest,
    profiles: dict = Depends(get_profiles),
    item_data=Depends(get_item_data),
    llm: LLMProvider = Depends(get_llm),
):
    if req.persona_id not in profiles:
        raise HTTPException(404, f"Persona {req.persona_id} not found")

    faiss_index, meta = item_data
    profile = profiles[req.persona_id]
    user_history = set(profile.get("products_reviewed", []))

    if faiss_index is None or profile["num_reviews"] <= 2:
        from app.dependencies import get_reviews
        df = get_reviews()
        return StreamingResponse(
            cold_start_stream(df, top_k=req.top_k),
            media_type="text/event-stream"
        )
    else:
        messages = [m.model_dump() for m in req.messages]
        return StreamingResponse(
            multi_turn_recommend_stream(profile, messages, faiss_index, meta, user_history, llm, req.top_k, req.naija_mode),
            media_type="text/event-stream"
        )
