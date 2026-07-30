import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.storage import get_presigned_url, upload_object
from app.db.session import get_db
from app.models.feedback import Feedback
from app.models.user import User
from app.schemas.prediction import PredictionResponse

router = APIRouter(prefix="/predictions", tags=["predictions"])

MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024


@router.post("", response_model=PredictionResponse, status_code=status.HTTP_201_CREATED)
async def create_prediction(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PredictionResponse:
    # Torch is an optional, heavyweight dependency. Import the classifier only
    # when inference is requested so unrelated API routes can still start.
    from app.ml.disease_classifier import predict_disease

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be an image")

    data = await file.read()
    if len(data) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image too large (max 10MB)")

    extension = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    object_name = f"{current_user.id}/{uuid.uuid4()}.{extension}"
    upload_object(settings.minio_bucket_plant_images, object_name, data, file.content_type)

    predicted_label, confidence = await run_in_threadpool(predict_disease, data)

    image_url = get_presigned_url(settings.minio_bucket_plant_images, object_name)

    db.add(
        Feedback(
            user_id=current_user.id,
            session_id=uuid.uuid4(),
            image=object_name,
            predicted_id=predicted_label,
            predicted_confident=confidence,
        )
    )
    await db.commit()

    return PredictionResponse(image_url=image_url, predicted_label=predicted_label, confidence=confidence)
