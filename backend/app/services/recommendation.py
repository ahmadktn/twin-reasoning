"""
app/services/recommendation.py  — Task B
Uses FAISS for fast item retrieval instead of linear pandas scan.
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from app.llm_provider import LLMProvider


# ── Vector helpers (must match scripts/build_faiss_index.py) ──────────────────

def _user_query_vector(profile: Dict) -> np.ndarray:
    """
    Build a query vector from user profile to find similar items via FAISS.
    Same 7-dim space as item vectors:
      [avg_rating_norm, log_reviews_norm, r1_pct ... r5_pct]
    For users we use their rating distribution as the preference signal.
    """
    avg = profile.get("avg_rating", 3.0)
    n = profile.get("num_reviews", 1)
    dist = profile.get("rating_distribution") or {}
    total = sum(dist.values()) or 1
    r_pcts = [dist.get(float(i), dist.get(str(i), 0)) / total for i in range(1, 6)]
    vec = np.array(
        [avg / 5.0, min(np.log1p(n) / 10.0, 1.0)] + r_pcts,
        dtype=np.float32,
    ).reshape(1, -1)
    import faiss
    faiss.normalize_L2(vec)
    return vec


# ── FAISS-based ranking ────────────────────────────────────────────────────────

def search_similar_items(
    profile: Dict,
    faiss_index,
    meta: Dict,
    user_history: set,
    top_k: int = 10,
) -> List[Tuple[str, float]]:
    """
    Query FAISS for items most similar to the user's preference vector.
    Filters out items already in user_history.
    Returns [(product_id, score), ...].
    """
    if faiss_index is None:
        return []

    query = _user_query_vector(profile)
    # Fetch extra candidates to account for history filtering
    k = min(top_k + len(user_history) + 20, faiss_index.ntotal)
    scores, indices = faiss_index.search(query, k)

    idx_to_pid = meta.get("idx_to_pid", {})
    results = []
    for score, idx in zip(scores[0], indices[0]):
        pid = idx_to_pid.get(str(idx)) or idx_to_pid.get(idx)
        if pid and pid not in user_history:
            results.append((pid, float(score)))
        if len(results) >= top_k:
            break
    return results


async def rank_items(
    profile: Dict,
    faiss_index,
    meta: Dict,
    user_history: set,
    llm: LLMProvider,
    top_k: int = 5,
) -> List[Dict]:
    """
    FAISS retrieval → LLM re-ranking.
    Fast retrieval replaces the linear candidate scan.
    """
    items_meta = meta.get("items", {})
    candidates = search_similar_items(profile, faiss_index, meta, user_history, top_k=10)

    if not candidates:
        return []

    items_text = "\n".join(
        f"{i+1}. [{pid}] {items_meta.get(pid, {}).get('title', 'Unknown')} | Score: {score:.3f} | "
        f"Avg: {items_meta.get(pid, {}).get('avg_rating', 'N/A')} | "
        f"Reviews: {items_meta.get(pid, {}).get('num_reviews', 0)}"
        for i, (pid, score) in enumerate(candidates)
    )

    prompt = f"""User profile:
- Avg rating given: {profile['avg_rating']:.1f}/5
- Total reviews: {profile['num_reviews']}
- Likes: {', '.join(profile.get('likes', [])) if profile.get('likes') else 'N/A'}
- Dislikes: {', '.join(profile.get('dislikes', [])) if profile.get('dislikes') else 'N/A'}

Candidate items (pre-ranked by similarity):
{items_text}

Pick the top {top_k} for this user. Each line: [Rank]. [Product_Title] - [Nigerian reason]
Top Recommendations:"""

    raw = await llm.generate(prompt, max_tokens=250, temperature=0.6)
    text = raw.split("Top Recommendations:")[-1].strip()
    return _parse(text, [pid for pid, _ in candidates], top_k, meta)


def _parse(text: str, ordered_pids: List[str], top_k: int, meta: Dict = None) -> List[Dict]:
    results = []
    items_meta = meta.get("items", {}) if meta else {}
    import re
    rec_lines = [l.strip() for l in text.splitlines() if re.match(r"^\d+\.", l.strip())]
    
    for i, line in enumerate(rec_lines[:top_k]):
        pid = ordered_pids[i] if i < len(ordered_pids) else None
        if not pid:
            continue
        item_info = items_meta.get(pid, {})
        results.append({
            "rank": i + 1,
            "product_id": pid,
            "relevance_score": round(max(0.5, 1.0 - i * 0.1), 3),
            "explanation": line[:150],
            "price": item_info.get("price"),
            "image": item_info.get("image"),
            "title": item_info.get("title", "Unknown Product")
        })

    if not results:
        for i, pid in enumerate(ordered_pids[:top_k]):
            item_info = items_meta.get(pid, {})
            results.append({
                "rank": i + 1,
                "product_id": pid,
                "relevance_score": round(max(0.5, 1.0 - i * 0.1), 3),
                "explanation": f"Recommended for you: {item_info.get('title', 'Unknown Product')}",
                "price": item_info.get("price"),
                "image": item_info.get("image"),
                "title": item_info.get("title", "Unknown Product")
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
    results = []
    for i, (pid, row) in enumerate(popular.iterrows()):
        item_rows = df[df["parent_asin"] == pid]
        price = None
        image = None
        title = "Unknown Product"
        if not item_rows.empty:
            first_row = item_rows.iloc[0]
            val = first_row.get("price")
            if pd.notna(val) and isinstance(val, (int, float)):
                price = float(val)
            imgs = first_row.get("images")
            if isinstance(imgs, list) and len(imgs) > 0:
                image = imgs[0].get("large") or imgs[0].get("thumb") or ""
            title = first_row.get("title", "Unknown Product")

        results.append({
            "rank": i + 1,
            "product_id": pid,
            "relevance_score": round(row["mean"] / 5.0, 3),
            "explanation": f"Popular — {int(row['count'])} reviews, {row['mean']:.1f}/5",
            "price": price,
            "image": image,
            "title": title
        })
    return results


async def multi_turn_recommend(
    profile: Dict,
    messages: List[Dict],
    faiss_index,
    meta: Dict,
    user_history: set,
    llm: LLMProvider,
    top_k: int = 5,
    naija_mode: bool = False,
) -> tuple[str, List[Dict]]:
    history_text = "\n".join(f"{m['role'].title()}: {m['content']}" for m in messages[-6:])
    candidates = search_similar_items(profile, faiss_index, meta, user_history, top_k=10)
    items_meta = meta.get("items", {})

    items_text = "\n".join(
        f"{i+1}. [{pid}] {items_meta.get(pid, {}).get('title', 'Unknown')} | Avg: {items_meta.get(pid, {}).get('avg_rating', 3.0):.2f}"
        for i, (pid, _) in enumerate(candidates)
    )

    style_instruction = "Reply naturally and conversationally like a normal helpful chatbot (e.g. ChatGPT). Do NOT start with 'Welcome to customer service'. Make your tone friendly, human-like, and concise."
    if naija_mode:
        style_instruction += " Use a friendly Nigerian style and slang where appropriate."

    prompt = f"""You are a helpful shopping assistant.
{style_instruction}

User profile — avg rating: {profile['avg_rating']:.1f}/5, {profile['num_reviews']} reviews.
Likes: {', '.join(profile.get('likes', [])) if profile.get('likes') else 'N/A'}
Dislikes: {', '.join(profile.get('dislikes', [])) if profile.get('dislikes') else 'N/A'}

Candidate products to recommend from:
{items_text}

Conversation History:
{history_text}

Analyze the user's last message.
If they ask for recommendations, recommend 3 to {top_k} products from the Candidate products list above.
Provide your recommendations as a numbered list starting with "1. ", "2. ", etc. Refer to products by their Title. Mention why they fit the user's likes or avoid their dislikes.

Assistant:"""

    reply = await llm.generate(prompt, max_tokens=300, temperature=0.7)
    recs = _parse(reply, [pid for pid, _ in candidates], top_k, meta)
    return reply, recs


async def cold_start_stream(df: pd.DataFrame, top_k: int = 5):
    recs = cold_start(df, top_k=top_k)
    reply = "Omo! Based on what's popular, here are some great picks for you:"
    import json
    yield f"data: {json.dumps({'type': 'chunk', 'text': reply})}\n\n"
    yield f"data: {json.dumps({'type': 'recs', 'recommendations': recs})}\n\n"


async def multi_turn_recommend_stream(
    profile: Dict,
    messages: List[Dict],
    faiss_index,
    meta: Dict,
    user_history: set,
    llm: LLMProvider,
    top_k: int = 5,
    naija_mode: bool = False,
):
    history_text = "\n".join(f"{m['role'].title()}: {m['content']}" for m in messages[-6:])
    candidates = search_similar_items(profile, faiss_index, meta, user_history, top_k=10)
    items_meta = meta.get("items", {})

    items_text = "\n".join(
        f"{i+1}. [{pid}] {items_meta.get(pid, {}).get('title', 'Unknown')} | Avg: {items_meta.get(pid, {}).get('avg_rating', 3.0):.2f}"
        for i, (pid, _) in enumerate(candidates)
    )

    style_instruction = "Reply naturally and conversationally like a normal helpful chatbot (e.g. ChatGPT). Do NOT start with 'Welcome to customer service'. Make your tone friendly, human-like, and concise."
    if naija_mode:
        style_instruction += " Use a friendly Nigerian style and slang where appropriate."

    prompt = f"""You are a helpful shopping assistant.
{style_instruction}

User profile — avg rating: {profile['avg_rating']:.1f}/5, {profile['num_reviews']} reviews.
Likes: {', '.join(profile.get('likes', [])) if profile.get('likes') else 'N/A'}
Dislikes: {', '.join(profile.get('dislikes', [])) if profile.get('dislikes') else 'N/A'}

Candidate products to recommend from:
{items_text}

Conversation History:
{history_text}

Analyze the user's last message.
If they ask for recommendations, recommend 3 to {top_k} products from the Candidate products list above.
Provide your recommendations as a numbered list starting with "1. ", "2. ", etc. Refer to products by their Title. Mention why they fit the user's likes or avoid their dislikes.

Assistant:"""

    import json
    accumulated_reply = ""
    async for chunk in llm.stream(prompt, max_tokens=300, temperature=0.7):
        accumulated_reply += chunk
        yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"

    recs = _parse(accumulated_reply, [pid for pid, _ in candidates], top_k, meta)
    yield f"data: {json.dumps({'type': 'recs', 'recommendations': recs})}\n\n"
