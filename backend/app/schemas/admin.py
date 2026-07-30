from pydantic import BaseModel


class AdminStatsResponse(BaseModel):
    dataset_size: int


class RetrainResponse(BaseModel):
    status: str
    dataset_size: int
