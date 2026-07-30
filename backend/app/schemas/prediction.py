import uuid

from pydantic import BaseModel


class PredictionResponse(BaseModel):
    feedback_id: uuid.UUID
    session_id: uuid.UUID
    image_url: str
    predicted_label: str
    confidence: float
