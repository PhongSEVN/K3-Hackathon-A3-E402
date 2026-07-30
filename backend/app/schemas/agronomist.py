import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.feedback import FeedbackPriority, FeedbackStatus
from app.schemas.chat import ChatMessageResponse


class AgronomistCase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    sender: str
    image: str
    predicted_label: str | None
    confidence: float | None
    confirmed_label: str | None
    comment: str | None
    status: FeedbackStatus
    priority: FeedbackPriority
    created_at: datetime
    updated_at: datetime


class AgronomistCaseDetail(AgronomistCase):
    messages: list[ChatMessageResponse]


class AgronomistCaseUpdate(BaseModel):
    comment: str
    confirmed_label: str | None = None
    status: FeedbackStatus = FeedbackStatus.ANSWERED
