"""
app/config.py
All settings read from environment variables.
Copy .env.example → .env and fill in your keys.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── LLM ───────────────────────────────────────────────────────────────────
    USE_LOCAL_LLM: bool = False                          # True = local Mistral, False = API

    # API backend (OpenRouter is default — cheap, free tier available)
    LLM_PROVIDER: str = "openrouter"                     # "openrouter" | "anthropic" | "openai"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "mistralai/mistral-7b-instruct"     # OpenRouter model string
    LLM_BASE_URL: str = "https://openrouter.ai/api/v1/chat/completions"

    # Local model (only used when USE_LOCAL_LLM=True)
    LOCAL_MODEL_NAME: str = "mistralai/Mistral-7B-Instruct-v0.1"

    # ── Data ──────────────────────────────────────────────────────────────────
    DATA_DIR: str = "data"
    DATASET_PATH: str = "data/All_Beauty.jsonl"          # raw reviews JSONL

    # ── App ───────────────────────────────────────────────────────────────────
    APP_TITLE: str = "BCT Hackathon – Review Agent API"
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
