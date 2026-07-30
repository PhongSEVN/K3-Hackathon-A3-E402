import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_message import ChatMessage


async def create_chat_message(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    question: str,
    answer: str | None,
    diease: str | None = None,
    image: str | None = None,
    citations: list[dict] | None = None,
    confidence: float | None = None,
    needs_human_review: bool = False,
) -> ChatMessage:
    message = ChatMessage(
        user_id=user_id,
        session_id=session_id,
        question=question,
        answer=answer,
        diease=diease,
        image=image,
        citations=citations or [],
        confidence=confidence,
        needs_human_review=needs_human_review,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


async def list_chat_messages(
    db: AsyncSession, *, user_id: uuid.UUID, session_id: uuid.UUID
) -> list[ChatMessage]:
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == user_id, ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    return list(result.scalars().all())
