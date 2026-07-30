from fastapi import APIRouter, Depends

from app.core.config import settings
from app.core.deps import require_roles
from app.core.storage import count_objects
from app.models.user import User, UserRole
from app.schemas.admin import AdminStatsResponse, RetrainResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStatsResponse)
async def get_stats(current_user: User = Depends(require_roles(UserRole.ADMIN))) -> AdminStatsResponse:
    dataset_size = count_objects(settings.minio_bucket_plant_images)
    return AdminStatsResponse(dataset_size=dataset_size)


@router.post("/retrain", response_model=RetrainResponse)
async def retrain(current_user: User = Depends(require_roles(UserRole.ADMIN))) -> RetrainResponse:
    dataset_size = count_objects(settings.minio_bucket_plant_images)
    return RetrainResponse(status="queued", dataset_size=dataset_size)
