import uuid
from dataclasses import asdict

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.core.deps import get_current_user
from app.core.rag_client import ask_question
from app.crud.chat_message import create_chat_message, list_chat_messages, list_recent_messages
from app.db.session import get_db
from app.ml.disease_labels import describe_label, get_crop_disease
from app.models.user import User
from app.schemas.chat import ChatMessageRequest, ChatMessageResponse

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/messages", response_model=ChatMessageResponse, status_code=201)
async def send_message(
    payload: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChatMessageResponse:
    question = payload.question
    known_crop, known_disease = "", ""
    if payload.diease:
        known_crop, known_disease = get_crop_disease(payload.diease)
        question = f"{describe_label(payload.diease)} {question}"

    recent = await list_recent_messages(db, user_id=current_user.id, session_id=payload.session_id, limit=5)
    history = [(item.question, item.answer) for item in recent if item.answer]

    result = await run_in_threadpool(ask_question, question, known_crop, known_disease, history)

    message = await create_chat_message(
        db,
        user_id=current_user.id,
        session_id=payload.session_id,
        question=payload.question,
        answer=result.answer,
        diease=payload.diease,
        image=payload.image,
        citations=[asdict(citation) for citation in result.citations],
        confidence=result.confidence,
        needs_human_review=result.needs_human_review,
    )
    return ChatMessageResponse.model_validate(message)


@router.get("/messages", response_model=list[ChatMessageResponse])
async def get_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ChatMessageResponse]:
    messages = await list_chat_messages(db, user_id=current_user.id, session_id=uuid.UUID(session_id))
    return [ChatMessageResponse.model_validate(message) for message in messages]
