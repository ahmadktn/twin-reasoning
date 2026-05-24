# BCT Hackathon – FastAPI Backend (TwinReasoning)

## Project Structure

```
bct-backend/
├── app/
│   ├── main.py               # FastAPI app + lifespan startup
│   ├── config.py             # All settings via pydantic-settings (.env)
│   ├── models.py             # Pydantic request/response schemas
│   ├── dependencies.py       # Data loading + FastAPI Depends() functions
│   ├── llm_provider.py       # Abstract LLM interface + OpenRouter/Anthropic/Local
│   ├── routes/
│   │   ├── personas.py       # GET /personas, GET /personas/{id}
│   │   ├── reviews.py        # POST /reviews/generate (SSE streaming)
│   │   ├── chat.py           # POST /chat/recommend (multi-turn)
│   │   ├── twins.py          # GET /twins/{id}  (Digital Twin page)
│   │   └── metrics.py        # GET /metrics
│   └── services/
│       ├── user_modeling.py  # Task A: predict rating + generate review + stream
│       └── recommendation.py # Task B: rank items, cold-start, multi-turn chat
├── data/                     # Data and pre-computed indexes
├── scripts/
│   └── build_faiss_index.py  # Utility to build the FAISS index from the dataset
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## Quick Start

### 1. Configure Environment
```bash
cp .env.example .env          # fill in LLM_API_KEY
```

### 2. Build Data Index
If your `data` folder is missing the necessary `items.faiss` and `items_meta.json` files, build them by running:
```bash
python scripts/build_faiss_index.py
```

### 3. Run the Server
**Using Docker:**
```bash
docker-compose up --build     # builds + runs on :8000
```

**Without Docker:**
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Docs → http://localhost:8000/docs

---

## LLM Provider

Edit `.env` to switch:

| Want | Config |
|------|--------|
| **OpenRouter** (default, free tier) | `LLM_PROVIDER=openrouter` `LLM_API_KEY=sk-or-...` |
| Anthropic Claude | `LLM_PROVIDER=anthropic` `LLM_API_KEY=sk-ant-...` |
| Local Mistral-7B (free, needs GPU) | `USE_LOCAL_LLM=true` |

OpenRouter gives you access to Mistral-7B-Instruct for free/cheap. To add a new provider: subclass `LLMProvider` in `llm_provider.py`, implement `generate()` and `stream()`, add to factory.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/personas` | List available personas |
| GET | `/personas/{id}` | Single persona summary |
| POST | `/reviews/generate` | **SSE stream** — reasoning + live tokens + result |
| POST | `/reviews/generate/sync` | Non-streaming fallback |
| POST | `/chat/recommend` | Multi-turn recommendation chat |
| GET | `/twins/{id}` | Full twin profile (Twin page) |
| GET | `/metrics` | Pre-computed evaluation metrics |

---

## Streaming Format (`POST /reviews/generate` & `/chat/recommend_stream`)

Connect with `EventSource` on the frontend:

```javascript
const es = new EventSource("/reviews/generate"); // or /chat/recommend_stream
es.onmessage = (e) => {
  const event = JSON.parse(e.data);
  if (event.type === "reasoning") showStep(event.step, event.text);
  if (event.type === "token")     appendToken(event.text);
  if (event.type === "result")    showFinal(event);
};
```

SSE event sequence:
```
{ "type": "reasoning", "step": 1, "text": "Loading persona..." }
...
{ "type": "token",     "text": "This product..." }
...
{ "type": "result",    "rating": 5, "review": "This product...", "confidence": 0.95 }
```

---

## Deploy to Railway

```bash
# 1. Push to GitHub
# 2. Connect Railway to repo
# 3. Set env vars in Railway dashboard (LLM_API_KEY etc.)
# Done — auto-deploys on push
```
