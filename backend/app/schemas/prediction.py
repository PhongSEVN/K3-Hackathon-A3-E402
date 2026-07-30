from pydantic import BaseModel


class PredictionResponse(BaseModel):
    image_url: str
    predicted_label: str
    confidence: float
    is_relevant: bool
    reject_reason: str | None = None
