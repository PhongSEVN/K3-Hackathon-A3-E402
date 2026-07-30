import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ChatMessageRequest(BaseModel):
    session_id: uuid.UUID
    question: str = Field(min_length=1, max_length=2000)
    diease: str | None = None
    image: str | None = None


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    question: str
    answer: str | None
    diease: str | None
    image: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str = Field(min_length=1, max_length=20_000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=10_000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=30)


class ChatResponse(BaseModel):
    answer: str
    model: str
