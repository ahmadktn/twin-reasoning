"""
app/services/recommendation.py  — Task B
"""
from typing import Dict, List
import pandas as pd
from app.llm_provider import LLMProvider


def build_item_profiles(df: pd.DataFrame) -> Dict:
    grouped = df.groupby("parent_asin")
    item_df = grouped.agg(avg_rating=("rating", "mean"), num_reviews=("rating", "size"))
    return item_df.to_dict(orient="index")


async def rank_items(
    profile: Dict,
    candidates: List[str],
    item_profiles: Dict,
    llm: LLMProvider,
    top_k: int = 5,
) -> List[Dict]:
    shown = candidates[:10]
    items_text = "\n".join(
        f"{i+1}. {pid} | Avg: {item_profiles.get(pid, {}).get('avg_rating', 3.0):.2f} "
        f"| Reviews: {item_profiles.get(pid, {}).get('num_reviews', 0)}"
        for i, pid in enumerate(shown)
    )
    prompt = f"""User profile:
- Avg rating given: {profile['avg_rating']:.1f}/5
- Total reviews: {profile['num_reviews']}
- Top products liked: {profile.get('products_reviewed', [])[:3]}

Candidate items:
{items_text}

Rank the top 5 for this user. Each line: [Rank]. [Product_ID] - [Nigerian reason]
Top Recommendations:"""

    raw = await llm.generate(prompt, max_tokens=250, temperature=0.6)
    text = raw.split("Top Recommendations:")[-1].strip()
    return _parse(text, shown, top_k)


def _parse(text: str, shown: List[str], top_k: int) -> List[Dict]:
    results = []
    for i, line in enumerate([l.strip() for l in text.splitlines() if l.strip()][:top_k]):
        pid = shown[i] if i < len(shown) else None
        if not pid:
            continue
        results.append({
            "rank": i + 1,
            "product_id": pid,
            "relevance_score": round(max(0.5, 1.0 - i * 0.1), 3),
            "explanation": line[:150],
        })
    return results


def cold_start(df: pd.DataFrame, top_k: int = 5) -> List[Dict]:
    popular = (
        df.groupby("parent_asin")["rating"]
        .agg(["mean", "count"])
        .query("count >= 10")
        .sort_values("mean", ascending=False)
        .head(top_k)
    )
    return [
        {
            "rank": i + 1,
            "product_id": pid,
            "relevance_score": round(row["mean"] / 5.0, 3),
            "explanation": f"Popular — {int(row['count'])} reviews, {row['mean']:.1f}/5",
        }
        for i, (pid, row) in enumerate(popular.iterrows())
    ]


async def multi_turn_recommend(
    profile: Dict,
    messages: List[Dict],
    candidates: List[str],
    item_profiles: Dict,
    llm: LLMProvider,
    top_k: int = 5,
) -> tuple[str, List[Dict]]:
    """Handle multi-turn chat + return recommendations."""
    history = "\n".join(f"{m['role'].title()}: {m['content']}" for m in messages[-6:])
    shown = candidates[:10]
    items_text = "\n".join(
        f"{i+1}. {pid} | Avg: {item_profiles.get(pid, {}).get('avg_rating', 3.0):.2f}"
        for i, pid in enumerate(shown)
    )
    prompt = f"""You are a helpful Nigerian shopping assistant.

Conversation so far:
{history}

User profile — avg rating: {profile['avg_rating']:.1f}/5, {profile['num_reviews']} reviews.

Available products:
{items_text}

Reply naturally to the user's last message, then recommend the top 3-5 products.
Use Nigerian style ("Omo this one na value for money!"). 

Response:"""

    reply = await llm.generate(prompt, max_tokens=300, temperature=0.7)
    recs = _parse(reply, shown, top_k)
    return reply, recs
