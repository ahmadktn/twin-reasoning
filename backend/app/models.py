from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field


# ── Personas ───────────────────────────────────────────────────────────────────

class Persona(BaseModel):
    id: str
    name: str
    avg_rating: float
    num_reviews: int
    rating_distribution: Dict[str, int]
    review_style: str
    products_reviewed: List[str]


# ── Reviews (Task A) ───────────────────────────────────────────────────────────

class GenerateReviewRequest(BaseModel):
    persona_id: str
    product_id: str
    target_rating: Optional[int] = Field(None, ge=1, le=5)


class ReviewResult(BaseModel):
    persona_id: str
    product_id: str
    predicted_rating: int
    review: str
    confidence: float


# Streaming SSE event shapes
class ReasoningStep(BaseModel):
    type: Literal["reasoning"] = "reasoning"
    step: int
    text: str


class ReviewFinalResult(BaseModel):
    type: Literal["result"] = "result"
    rating: int
    review: str
    confidence: float


# ── Chat / Recommendations (Task B) ───────────────────────────────────────────

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    persona_id: str
    messages: List[ChatMessage]
    top_k: int = Field(5, ge=1, le=20)
    naija_mode: bool = False


class Recommendation(BaseModel):
    rank: int
    product_id: str
    relevance_score: float
    explanation: str
    price: Optional[float] = None
    image: Optional[str] = None
    title: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    recommendations: List[Recommendation]


# ── Metrics ────────────────────────────────────────────────────────────────────

class MetricsResponse(BaseModel):
    task_a: Dict
    task_b: Dict
    methodology: Optional[Dict] = None
