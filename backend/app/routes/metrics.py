"""
app/routes/metrics.py
GET /metrics  — serves pre-computed metrics exported from Kaggle.
"""
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_metrics_data
from app.models import MetricsResponse

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("", response_model=MetricsResponse)
def get_metrics(metrics: dict = Depends(get_metrics_data)):
    """
    Returns pre-computed Task A + Task B metrics.
    Export from Kaggle: data/metrics.json  (see README for format).
    """
    if not metrics:
        raise HTTPException(404, "metrics.json not found in data/. Export from Kaggle first.")
    return MetricsResponse(
        task_a=metrics.get("task_a", {}),
        task_b=metrics.get("task_b", {}),
        methodology=metrics.get("methodology"),
    )
