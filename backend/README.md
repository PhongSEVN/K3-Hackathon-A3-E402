# Backend (FastAPI)

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Set `DATABASE_URL` trong `../.env` (PostgreSQL, dùng `postgresql+asyncpg://...`).

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
