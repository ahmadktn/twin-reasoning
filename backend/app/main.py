"""
app/main.py — FastAPI entry point.
Run: uvicorn app.main:app --reload
Docs: http://localhost:8000/docs
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.dependencies import load_user_profiles, load_faiss_index
from app.routes import personas, reviews, chat, twins, metrics


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[startup] Pre-loading data caches...")
    load_user_profiles()
    #load_item_profiles()
    print("[startup] Ready.")
    yield


app = FastAPI(
    title=settings.APP_TITLE,
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────
# Must be registered BEFORE routers so it wraps all responses.
# allow_credentials must be False when allow_origins=["*"].
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global error handler ──────────────────────────────────────────
# Starlette's CORSMiddleware only adds Access-Control-Allow-Origin to
# responses that are built normally. When an unhandled exception propagates
# before the response is constructed, CORS headers are never injected.
#
# This handler catches all unhandled 500s and returns a proper JSONResponse
# so the CORS middleware CAN wrap it with Access-Control-Allow-Origin.
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {type(exc).__name__}: {exc}"},
    )


app.include_router(personas.router)
app.include_router(reviews.router)
app.include_router(chat.router)
app.include_router(twins.router)
app.include_router(metrics.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "llm_backend": "local" if settings.USE_LOCAL_LLM else settings.LLM_PROVIDER,
        "model": settings.LOCAL_MODEL_NAME if settings.USE_LOCAL_LLM else settings.LLM_MODEL,
    }
