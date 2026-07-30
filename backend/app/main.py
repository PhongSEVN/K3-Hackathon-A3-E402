from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import admin, agronomist, auth, chat, health, users
from app.core.config import settings
from app.core.storage import ensure_buckets

logger = logging.getLogger(__name__)

try:
    from app.api.routes import predictions
except ModuleNotFoundError as exc:
    if exc.name not in {"torch", "torchvision"}:
        raise
    predictions = None
    logger.warning("PyTorch is unavailable; image prediction routes are disabled.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.initialize_storage_on_startup:
        try:
            ensure_buckets()
        except Exception as exc:
            # Chat does not depend on object storage, so local LLM testing
            # should still work when MinIO has not been started.
            logger.warning("MinIO is unavailable; image features are disabled: %s", exc)
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
if predictions is not None:
    app.include_router(predictions.router)
app.include_router(chat.router)
