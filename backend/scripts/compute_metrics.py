import os
import json
import pandas as pd
from datetime import datetime
from rouge_score import rouge_scorer
import numpy as np
from app.config import settings
import matplotlib.pyplot as plt
import seaborn as sns
def compute_metrics():
    predictions_path = os.path.join(settings.DATA_DIR, "predictions.json")
    dataset_path = settings.DATASET_PATH
    metrics_out_path = os.path.join(settings.DATA_DIR, "metrics.json")
    
    if not os.path.exists(predictions_path):
        print(f"Predictions not found at {predictions_path}")
        return
        
    with open(predictions_path, "r") as f:
        predictions = json.load(f)
        
    if not predictions:
        print("No predictions to evaluate.")
        return

    # Build a lookup for ground truth: (user_id, product_id) -> (rating, text)
    # We only care about pairs that are in predictions
    pred_pairs = {(p["user_id"], p["product_id"]) for p in predictions}
    ground_truth = {}
    
    print("Loading ground truth data...")
    # Because the dataset is large, we read line by line
    with open(dataset_path, "r") as f:
        for line in f:
            record = json.loads(line)
            uid = record.get("user_id")
            pid = record.get("parent_asin") # or asin, depending on what we matched
            if not pid:
                pid = record.get("asin")
                
            if (uid, pid) in pred_pairs:
                ground_truth[(uid, pid)] = {
                    "rating": record.get("rating"),
                    "text": record.get("text", "")
                }
                
                # Stop early if we found all of them
                if len(ground_truth) == len(pred_pairs):
                    break

    # Compute Metrics
    y_true_rating = []
    y_pred_rating = []
    
    rouge_scores = []
    review_lengths = []
    word_counts = []
    nigerian_phrases_count = 0
    
    phrases = ["chai", "omo", "i too like am", "this one na original", "very worth it"]
    
    scorer = rouge_scorer.RougeScorer(['rougeL'], use_stemmer=True)
    
    user_profiles_path = os.path.join(settings.DATA_DIR, "user_profiles.json")
    user_profiles = {}
    if os.path.exists(user_profiles_path):
        with open(user_profiles_path, "r") as f:
            user_profiles = json.load(f)

    for p in predictions:
        uid = p["user_id"]
        pid = p["product_id"]
        pred_rating = p["predicted_rating"]
        pred_text = p.get("predicted_review", "")
        
        # Text metrics
        review_lengths.append(len(pred_text))
        word_counts.append(len(pred_text.split()))
        
        lower_text = pred_text.lower()
        if any(phrase in lower_text for phrase in phrases):
            nigerian_phrases_count += 1
            
        gt = ground_truth.get((uid, pid))
        if gt and gt["rating"] is not None:
            y_true_rating.append(gt["rating"])
            y_pred_rating.append(pred_rating)
            
        # Rouge: Prioritize matching the actual true review for the product.
        # If not available, fallback to user's past review style.
        profile = user_profiles.get(uid, {})
        past_reviews = profile.get("review_samples", [])
        
        if gt and gt.get("text"):
            score = scorer.score(str(gt["text"]), pred_text)
            rouge_scores.append(score['rougeL'].fmeasure)
        elif past_reviews:
            best_rouge = 0.0
            for past_review in past_reviews:
                score = scorer.score(past_review, pred_text)
                best_rouge = max(best_rouge, score['rougeL'].fmeasure)
            rouge_scores.append(best_rouge)

    samples_matched = len(y_true_rating)
    
    if samples_matched > 0:
        y_true = np.array(y_true_rating)
        y_pred = np.array(y_pred_rating)
        rmse = float(np.sqrt(np.mean((y_true - y_pred)**2)))
        mae = float(np.mean(np.abs(y_true - y_pred)))
        success_rate = float(np.mean(np.abs(y_true - y_pred) <= 1) * 100)
        
        # --- Visualizations ---
        viz_dir = os.path.join(settings.DATA_DIR, "visualizations")
        os.makedirs(viz_dir, exist_ok=True)
        
        # 1. Scatter Plot (True vs Predicted)
        plt.figure(figsize=(8, 6))
        jittered_y_true = y_true + np.random.normal(0, 0.1, size=len(y_true))
        jittered_y_pred = y_pred + np.random.normal(0, 0.1, size=len(y_pred))
        sns.scatterplot(x=jittered_y_true, y=jittered_y_pred, alpha=0.7)
        plt.plot([1, 5], [1, 5], 'r--')
        plt.title('True vs Predicted Ratings (with jitter)')
        plt.xlabel('True Rating')
        plt.ylabel('Predicted Rating')
        plt.xlim(0.5, 5.5)
        plt.ylim(0.5, 5.5)
        plt.grid(True, linestyle='--', alpha=0.5)
        plt.savefig(os.path.join(viz_dir, 'rating_scatter.png'))
        plt.close()
        
        # 2. Error Distribution
        plt.figure(figsize=(8, 6))
        errors = y_true - y_pred
        sns.histplot(errors, bins=np.arange(-4.5, 5.5, 1), kde=False, color="coral")
        plt.title('Rating Error Distribution (True - Predicted)')
        plt.xlabel('Error')
        plt.ylabel('Count')
        plt.savefig(os.path.join(viz_dir, 'error_distribution.png'))
        plt.close()
        
    else:
        rmse = None
        mae = None
        success_rate = 0.0

    avg_rouge_l = float(np.mean(rouge_scores)) if rouge_scores else 0.0
    
    if rouge_scores:
        viz_dir = os.path.join(settings.DATA_DIR, "visualizations")
        os.makedirs(viz_dir, exist_ok=True)
        plt.figure(figsize=(8, 6))
        sns.histplot(rouge_scores, bins=10, kde=True, color="skyblue")
        plt.title('ROUGE-L Score Distribution')
        plt.xlabel('ROUGE-L Score')
        plt.ylabel('Count')
        plt.savefig(os.path.join(viz_dir, 'rouge_distribution.png'))
        plt.close()

    avg_review_length = float(np.mean(review_lengths)) if review_lengths else 0.0
    avg_word_count = float(np.mean(word_counts)) if word_counts else 0.0
    has_nigerian_phrases = float(nigerian_phrases_count / len(predictions) * 100) if predictions else 0.0

    unique_users = len(set(p["user_id"] for p in predictions))
    unique_products = len(set(p["product_id"] for p in predictions))

    # Recommendation Metrics (Task B)
    ranks = [p.get("rec_rank", 0) for p in predictions]
    hits_at_5 = sum(1 for r in ranks if 0 < r <= 5)
    hr_5 = float((hits_at_5 / len(predictions)) * 100) if predictions else 0.0
    
    mrr_sum = sum(1.0 / r for r in ranks if r > 0)
    mrr_5 = float(mrr_sum / len(predictions)) if predictions else 0.0

    if ranks:
        plt.figure(figsize=(8, 6))
        # Plot counts for ranks 1-5, and >5 (or not found)
        rank_counts = [ranks.count(i) for i in range(1, 6)]
        rank_counts.append(len(ranks) - sum(rank_counts))
        sns.barplot(x=['1', '2', '3', '4', '5', 'Not in Top 5'], y=rank_counts, color="mediumpurple")
        plt.title('Recommendation Rank Distribution (Target Item)')
        plt.xlabel('Rank Position')
        plt.ylabel('Count')
        plt.savefig(os.path.join(viz_dir, 'rank_distribution.png'))
        plt.close()

    metrics_result = {
        "timestamp": datetime.now().isoformat(),
        "methodology": "Offline Evaluation (Leave-One-Out)",
        "task_a": {
            "rating_metrics": {
                "rmse": rmse,
                "mae": mae,
                "samples_matched": samples_matched,
                "success_rate": success_rate
            },
            "review_metrics": {
                "avg_rouge_l": avg_rouge_l,
                "avg_review_length": avg_review_length,
                "avg_word_count": avg_word_count,
                "has_nigerian_phrases": has_nigerian_phrases
            }
        },
        "task_b": {
            "hit_rate_at_5": hr_5,
            "mrr_at_5": mrr_5
        },
        "summary": [
            {
                "Metric": "Total Predictions Generated",
                "Value": str(len(predictions))
            },
            {
                "Metric": "Rating RMSE",
                "Value": f"{rmse:.3f}" if rmse is not None else "N/A (Unseen)"
            },
            {
                "Metric": "Rating MAE",
                "Value": f"{mae:.3f}" if mae is not None else "N/A (Unseen)"
            },
            {
                "Metric": "Success Rate (±1 Star)",
                "Value": f"{success_rate:.1f}%" if samples_matched > 0 else "N/A (Unseen)"
            },
            {
                "Metric": "Avg ROUGE-L Score",
                "Value": f"{avg_rouge_l:.3f}"
            },
            {
                "Metric": "Recommendation Hit Rate @ 5",
                "Value": f"{hr_5:.1f}%"
            },
            {
                "Metric": "Recommendation MRR @ 5",
                "Value": f"{mrr_5:.3f}"
            },
            {
                "Metric": "Reviews with Nigerian Phrases (%)",
                "Value": f"{has_nigerian_phrases:.1f}%"
            },
            {
                "Metric": "Unique Users Tested",
                "Value": str(unique_users)
            },
            {
                "Metric": "Unique Products Predicted",
                "Value": str(unique_products)
            }
        ]
    }

    with open(metrics_out_path, "w") as f:
        json.dump(metrics_result, f, indent=2)
        
    print(f"Metrics successfully computed and saved to {metrics_out_path}")
    print(json.dumps(metrics_result, indent=2))

if __name__ == "__main__":
    compute_metrics()
