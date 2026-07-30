from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app import models  # noqa: F401  (registers mapped classes on Base.metadata)
from app.db.base import Base

_ALTER_STATEMENTS = [
    "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS citations JSONB",
    "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION",
    "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS needs_human_review BOOLEAN NOT NULL DEFAULT false",
]


async def run_migrations(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for statement in _ALTER_STATEMENTS:
            await conn.execute(text(statement))
