from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.lmstudio import LMStudioError, complete


router = APIRouter(prefix="/chat", tags=["chat"])


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
