"""
app/services/user_modeling.py  — Task A
"""
import random
from typing import AsyncIterator, Dict, Tuple
import pandas as pd
from app.llm_provider import LLMProvider


def build_profiles(df: pd.DataFrame) -> Dict:
    grouped = df.groupby("user_id")
    profiles_df = grouped.agg(
        num_reviews=("rating", "size"),
        avg_rating=("rating", "mean"),
        rating_std=("rating", "std"),
    )
    profiles_df["rating_std"] = profiles_df["rating_std"].fillna(0.0)
    profiles_df["review_samples"] = grouped["text"].apply(lambda x: x.dropna().head(3).tolist())
    profiles_df["rating_distribution"] = grouped["rating"].apply(lambda x: x.value_counts().to_dict())
    profiles_df["products_reviewed"] = grouped["parent_asin"].apply(lambda x: x.unique().tolist())
    return profiles_df.to_dict(orient="index")


def predict_rating(profile: Dict, target: int | None = None) -> int:
    if target:
        return target
    avg = profile.get("avg_rating", 3.0)
    std = profile.get("rating_std", 0.5)
    return max(1, min(5, round(avg + random.gauss(0, min(std, 0.7)))))


def _build_prompt(profile: Dict, product_id: str, rating: int) -> str:
    style = " ".join(profile.get("review_samples", [])[:2])[:150] or "casual"
    return f"""You are a Nigerian Amazon reviewer.
Your average rating: {profile.get('avg_rating', 3.0):.1f}/5
Your style: {style}

Write a {rating}-star review for product: {product_id}
Use Nigerian expressions: "Chai!", "Omo!", "This one na original", "Very worth it"
Keep it 80-150 words. Be authentic.

Review:"""


async def generate_review(
    profile: Dict,
    product_id: str,
    rating: int,
    llm: LLMProvider,
) -> str:
    prompt = _build_prompt(profile, product_id, rating)
    return await llm.generate(prompt, max_tokens=180, temperature=0.8)


async def stream_review_generation(
    profile: Dict,
    product_id: str,
    rating: int,
    llm: LLMProvider,
) -> AsyncIterator[str]:
    """
    Yields SSE-formatted JSON strings:
      reasoning steps → then the streamed review tokens.
    """
    import json

    steps = [
        f"Loading persona (avg rating {profile.get('avg_rating', 3.0):.1f}/5)...",
        f"Analysing product {product_id}...",
        f"Calibrating {rating}-star Nigerian review style...",
    ]
    for i, text in enumerate(steps, 1):
        yield f"data: {json.dumps({'type': 'reasoning', 'step': i, 'text': text})}\n\n"

    # Stream the actual LLM output token-by-token
    prompt = _build_prompt(profile, product_id, rating)
    collected = []
    async for token in llm.stream(prompt, max_tokens=180, temperature=0.8):
        collected.append(token)
        yield f"data: {json.dumps({'type': 'token', 'text': token})}\n\n"

    full_review = "".join(collected).strip()
    confidence = round(min(0.95, 0.6 + (rating / 10)), 2)
    yield f"data: {json.dumps({'type': 'result', 'rating': rating, 'review': full_review, 'confidence': confidence})}\n\n"
    yield "data: [DONE]\n\n"
