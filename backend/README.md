# Backend (FastAPI)

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Set `DATABASE_URL` trong `../.env` (PostgreSQL, dùng `postgresql+asyncpg://...`).

## LM Studio chatbot

Select the provider in the root `.env`.

For LM Studio:

```dotenv
LLM_PROVIDER=lmstudio
LLM_MODEL=smollm2-135m-instruct
LLM_MAX_TOKENS=32
LLM_HISTORY_MESSAGES=2
```

For OpenAI:

```dotenv
LLM_PROVIDER=openai
LLM_MODEL=gpt-4.1-mini
OPENAI_API_KEY=your-key
```

Restart the backend after changing provider. The correct API base URL is
selected automatically.

For another OpenAI-compatible provider, override `LLM_BASE_URL` and optionally
`LLM_API_KEY`.

Test the backend bridge:

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Xin chào","history":[]}'
```

If the backend runs in Docker while LM Studio runs on the host, use
`LLM_BASE_URL=http://host.docker.internal:1234/v1`. In LM Studio, enable
serving on the local network so the container can connect.

The standalone RAG CLI can use the same compatible server with:

```dotenv
RAG_OPENAI_BASE_URL=http://localhost:1234/v1
RAG_OPENAI_MODEL=smollm2-135m-instruct
RAG_API_KEY=lm-studio
```

## Run

```bash
uvicorn app.main:app --reload
```

Health check: `GET /health`
Docs: `/docs`

## Cấu trúc

```
app/
  core/config.py     settings (env)
  db/                engine, session, declarative base
  models/            SQLAlchemy models (user, chat)
  api/routes/         route handlers
  main.py             FastAPI app entrypoint
```
