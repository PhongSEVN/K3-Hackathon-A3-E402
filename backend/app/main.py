from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import admin, agronomist, auth, chat, health, predictions, users
from app.core.config import settings
from app.core.storage import ensure_buckets
from app.db.migrate import run_migrations
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    await run_migrations(engine)
    ensure_buckets()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(agronomist.router)
app.include_router(predictions.router)
app.include_router(chat.router)
