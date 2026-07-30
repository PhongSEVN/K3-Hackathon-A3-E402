import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ChatMessageRequest(BaseModel):
    session_id: uuid.UUID
    question: str = Field(min_length=1, max_length=2000)
    diease: str | None = None
    image: str | None = None


class ChatCitation(BaseModel):
    source_file: str
    source_urls: list[str]
    relative_path: str


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    question: str
    answer: str | None
    diease: str | None
    image: str | None
    citations: list[ChatCitation]
    confidence: float | None
    needs_human_review: bool
    created_at: datetime

    model_config = {"from_attributes": True}
