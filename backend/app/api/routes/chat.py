import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.rag_client import ask_question
from app.crud.chat_message import create_chat_message, list_chat_messages
from app.db.session import get_db
from app.ml.disease_labels import describe_label
from app.models.feedback import Feedback, FeedbackStatus
from app.models.user import User
from app.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    ChatRequest,
    ChatResponse,
)
from app.services.lmstudio import LMStudioError, complete

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/messages", response_model=ChatMessageResponse, status_code=201)
async def send_message(
    payload: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChatMessageResponse:
    question = payload.question
    if payload.diease:
        question = f"{describe_label(payload.diease)} {question}"

    result = await run_in_threadpool(ask_question, question)

    message = await create_chat_message(
        db,
        user_id=current_user.id,
        session_id=payload.session_id,
        question=payload.question,
        answer=result.answer,
        diease=payload.diease,
        image=payload.image,
    )

    feedback_result = await db.execute(
        select(Feedback).where(
            Feedback.user_id == current_user.id,
            Feedback.session_id == payload.session_id,
        )
    )
    feedback = feedback_result.scalar_one_or_none()
    if feedback is not None and feedback.status != FeedbackStatus.PENDING:
        feedback.status = FeedbackStatus.PENDING
        feedback.assignee_id = None
        await db.commit()

    return ChatMessageResponse.model_validate(message)


@router.get("/messages", response_model=list[ChatMessageResponse])
async def get_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ChatMessageResponse]:
    messages = await list_chat_messages(db, user_id=current_user.id, session_id=uuid.UUID(session_id))
    return [ChatMessageResponse.model_validate(message) for message in messages]


@router.post("", response_model=ChatResponse)
async def create_chat_completion(payload: ChatRequest) -> ChatResponse:
    try:
        answer = await complete(payload.message, payload.history)
    except LMStudioError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    return ChatResponse(answer=answer, model=settings.active_llm_model)
