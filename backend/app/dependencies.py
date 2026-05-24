"""
app/dependencies.py
All heavy data loading happens here once at startup.
Routes inject what they need via FastAPI Depends — nothing loads twice.
"""
import json
import os
import pandas as pd
from functools import lru_cache
from typing import Dict, List
from app.config import settings
from app.llm_provider import get_llm_provider, LLMProvider


# ── Data loaders ───────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def load_reviews_df() -> pd.DataFrame:
    df = pd.read_json(settings.DATASET_PATH, lines=True)
    df["rating"] = pd.to_numeric(df["rating"], errors="coerce")
    return df


@lru_cache(maxsize=1)
def load_personas() -> List[Dict]:
    path = os.path.join(settings.DATA_DIR, "personas.json")
    if not os.path.exists(path):
        return []
    with open(path) as f:
        return json.load(f)


@lru_cache(maxsize=1)
def load_user_profiles() -> Dict:
    path = os.path.join(settings.DATA_DIR, "user_profiles.json")
    if not os.path.exists(path):
        # Build from raw dataset if pre-export not available
        from app.services.user_modeling import build_profiles
        profiles = build_profiles(load_reviews_df())
    else:
        with open(path) as f:
            profiles = json.load(f)
            
    # Combine with user_rules from second approach
    rules_path = os.path.join(settings.DATA_DIR, "second_approach", "user_rules.pkl")
    if os.path.exists(rules_path):
        import pickle
        try:
            with open(rules_path, "rb") as rf:
                rules = pickle.load(rf)
                for uid, rule in rules.items():
                    if uid in profiles:
                        profiles[uid]["likes"] = rule.get("likes", [])
                        profiles[uid]["dislikes"] = rule.get("dislikes", [])
                        profiles[uid]["rating_drivers"] = rule.get("rating_drivers", {})
        except Exception as e:
            print(f"[WARNING] Could not load user_rules.pkl: {e}")
            
    return profiles


@lru_cache(maxsize=1)
def load_faiss_index():
    """
    Load pre-built FAISS index + metadata from disk.
    Run scripts/build_faiss_index.py first to generate these files.
    Returns (index, meta) or (None, None) if not built yet.
    """
    index_path = os.path.join(settings.DATA_DIR, "items.faiss")
    meta_path = os.path.join(settings.DATA_DIR, "items_meta.json")

    if not os.path.exists(index_path) or not os.path.exists(meta_path):
        print("[WARNING] FAISS index not found. Run: uv run python scripts/build_faiss_index.py")
        return None, None

    import faiss
    index = faiss.read_index(index_path)
    with open(meta_path) as f:
        meta = json.load(f)

    print(f"[FAISS] Loaded index: {index.ntotal} items")
    return index, meta


@lru_cache(maxsize=1)
def load_metrics() -> Dict:
    path = os.path.join(settings.DATA_DIR, "metrics.json")
    if not os.path.exists(path):
        return {}
    with open(path) as f:
        return json.load(f)


# ── FastAPI dependency functions ───────────────────────────────────────────────
# Use these with Depends() in routes.

def get_llm() -> LLMProvider:
    return get_llm_provider()


def get_profiles() -> Dict:
    return load_user_profiles()


def get_item_data():
    return load_faiss_index()  # returns (index, meta)


def get_reviews() -> pd.DataFrame:
    return load_reviews_df()


def get_personas_data() -> List[Dict]:
    return load_personas()


def get_metrics_data() -> Dict:
    return load_metrics()
