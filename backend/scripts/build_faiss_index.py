"""
scripts/build_faiss_index.py
Run ONCE after dataset changes:
uv run python scripts/build_faiss_index.py
"""
import os
import json
import sys
import numpy as np
import pandas as pd

DATA_DIR = os.getenv("DATA_DIR", "data")
DATASET_PATH = os.getenv("DATASET_PATH", "data/meta_All_Beauty.jsonl")

def build_item_vector(avg_rating: float, num_reviews: int, rating_dist: dict = None) -> np.ndarray:
    """
    Build a 7-dim feature vector for FAISS indexing:
    [normalized_avg_rating, log_normalized_review_count, rating_dist_1★, ..., rating_dist_5★]
    
    If rating_dist is None, use a placeholder distribution based on avg_rating.
    """
    # Component 1: Normalized average rating (0.0 - 1.0)
    norm_rating = min(max(avg_rating / 5.0, 0.0), 1.0)
    
    # Component 2: Log-scaled review count (0.0 - 1.0)
    norm_reviews = min(np.log1p(num_reviews) / 10.0, 1.0)
    
    # Components 3-7: Rating distribution (1-5 stars)
    if rating_dist and sum(rating_dist.values()) > 0:
        total = sum(rating_dist.values())
        r_pcts = [rating_dist.get(float(i), rating_dist.get(i, 0)) / total for i in range(1, 6)]
    else:
        # Fallback: approximate distribution using a narrow Gaussian around avg_rating
        # This preserves some signal when detailed distribution is unavailable
        r_pcts = []
        for star in range(1, 6):
            # Higher weight for stars closer to avg_rating
            weight = np.exp(-0.5 * ((star - avg_rating) / 0.8) ** 2)
            r_pcts.append(weight)
        total = sum(r_pcts)
        r_pcts = [p / total for p in r_pcts]
    
    return np.array([norm_rating, norm_reviews] + r_pcts, dtype=np.float32)


def main():
    print(f"Dataset path: {os.path.abspath(DATASET_PATH)}")
    print(f"Data dir:     {os.path.abspath(DATA_DIR)}")
    print(f"File exists:  {os.path.exists(DATASET_PATH)}\n")
    
    if not os.path.exists(DATASET_PATH):
        print(f"ERROR: dataset not found at {DATASET_PATH}")
        sys.exit(1)

    # Step 1/5 — Load dataset (pre-aggregated items)
    print("Step 1/5 — Loading dataset...")
    try:
    # Robust JSONL loader that skips bad lines
        records = []
        with open(DATASET_PATH, "r", encoding="utf-8") as f:
            for i, line in enumerate(f, 1):
                if i > 10000:  # Limit for testing; remove for full load
                    break
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError as e:
                    print(f"  ⚠ Skipping line {i}: {e}")
                continue
    
        df = pd.DataFrame(records)
        print(f"  ✓ {len(df):,} items loaded | columns: {list(df.columns)}")
    
    except Exception as e:
        print(f"  ERROR: {e}")
        raise 
    # Step 2/5 — Validate & cast required fields
    print("Step 2/5 — Validating fields...")
    required = ["parent_asin", "average_rating", "rating_number"]
    missing = [col for col in required if col not in df.columns]
    if missing:
        print(f"  ERROR: Missing required columns: {missing}")
        sys.exit(1)
    
    try:
        df["average_rating"] = pd.to_numeric(df["average_rating"], errors="coerce")
        df["rating_number"] = pd.to_numeric(df["rating_number"], errors="coerce").fillna(0).astype(int)
        # Drop items with invalid ratings
        df = df.dropna(subset=["average_rating"])
        print(f"  ✓ Valid items: {len(df):,} | rating range: {df['average_rating'].min():.2f}–{df['average_rating'].max():.2f}")
    except Exception as e:
        print(f"  ERROR: {e}")
        raise

    # Step 3/5 — Build vectors
    print("Step 3/5 — Building vectors...")
    try:
        product_ids = df["parent_asin"].tolist()
        vectors = np.stack([
            build_item_vector(
                row["average_rating"], 
                row["rating_number"], 
                row.get("rating_dist")  # Optional: include if your data has per-star counts
            )
            for _, row in df.iterrows()
        ])
        print(f"  ✓ shape: {vectors.shape} | dtype: {vectors.dtype} | dim={vectors.shape[1]}")
    except Exception as e:
        print(f"  ERROR: {e}")
        raise

    # Step 4/5 — Build FAISS index (Inner Product = cosine similarity after L2 norm)
    print("Step 4/5 — Building FAISS index...")
    try:
        import faiss
        faiss.normalize_L2(vectors)  # Enables cosine similarity via dot product
        dim = vectors.shape[1]
        index = faiss.IndexFlatIP(dim)  # Inner Product index
        index.add(vectors)
        print(f"  ✓ {index.ntotal:,} items indexed | dim={dim}")
    except ImportError:
        print("  ERROR: faiss not installed. Run: pip install faiss-cpu")
        sys.exit(1)
    except Exception as e:
        print(f"  ERROR: {e}")
        raise

    # Step 5/5 — Save artifacts
    print("Step 5/5 — Saving to disk...")
    try:
        os.makedirs(DATA_DIR, exist_ok=True)

        # Save FAISS index
        index_path = os.path.join(DATA_DIR, "items.faiss")
        faiss.write_index(index, index_path)
        print(f"  ✓ {index_path} ({os.path.getsize(index_path)/1024:.1f} KB)")

        def get_image(images):
            if isinstance(images, list) and len(images) > 0:
                return images[0].get("large") or images[0].get("thumb") or ""
            return ""

        def get_price(val):
            import pandas as pd
            if pd.isna(val):
                return None
            return val

        # Save metadata mapping
        items_meta = {
            pid: {
                "idx": i,
                "avg_rating": float(df.iloc[i]["average_rating"]),
                "num_reviews": int(df.iloc[i]["rating_number"]),
                "title": df.iloc[i].get("title", ""),
                "main_category": df.iloc[i].get("main_category", ""),
                "price": get_price(df.iloc[i].get("price")),
                "image": get_image(df.iloc[i].get("images"))
            }
            for i, pid in enumerate(product_ids)
        }
        idx_to_pid = {str(i): pid for i, pid in enumerate(product_ids)}
        
        meta_path = os.path.join(DATA_DIR, "items_meta.json")
        with open(meta_path, "w") as f:
            json.dump({"items": items_meta, "idx_to_pid": idx_to_pid}, f, indent=2)
        print(f"  ✓ {meta_path} ({os.path.getsize(meta_path)/1024:.1f} KB)")
        
    except Exception as e:
        print(f"  ERROR: {e}")
        raise

    print("\n✅ All done. Re-run whenever you update the dataset.")


if __name__ == "__main__":
    main()
