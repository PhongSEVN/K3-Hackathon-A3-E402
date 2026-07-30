import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles
from app.core.config import settings
from app.core.storage import get_presigned_url
from app.db.session import get_db
from app.models.chat_message import ChatMessage
from app.models.feedback import Feedback
from app.models.user import User, UserRole
from app.schemas.agronomist import AgronomistCase, AgronomistCaseDetail, AgronomistCaseUpdate
from app.schemas.chat import ChatMessageResponse

router = APIRouter(prefix="/agronomist", tags=["agronomist"])


def _message_matches_feedback() -> object:
    """Match current sessions, with an image-path fallback for legacy records."""
    return and_(
        ChatMessage.user_id == Feedback.user_id,
        or_(
            ChatMessage.session_id == Feedback.session_id,
            and_(
                ChatMessage.image.is_not(None),
                ChatMessage.image.contains(Feedback.image),
            ),
        ),
    )


def _case_response(feedback: Feedback, sender: str) -> AgronomistCase:
    image = feedback.image
    if image and not image.startswith(("http://", "https://")):
        object_name = image.removeprefix(f"{settings.minio_bucket_plant_images}/")
        image = get_presigned_url(settings.minio_bucket_plant_images, object_name)
    return AgronomistCase(
        id=feedback.id,
        session_id=feedback.session_id,
        sender=sender,
        image=image,
        predicted_label=feedback.predicted_id,
        confidence=feedback.predicted_confident,
        confirmed_label=feedback.confirmed_label,
        comment=feedback.comment,
        status=feedback.status,
        priority=feedback.priority,
        created_at=feedback.created_at,
        updated_at=feedback.updated_at,
    )


@router.get("/cases", response_model=list[AgronomistCase])
async def list_cases(
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.AGRONOMIST)),
    db: AsyncSession = Depends(get_db),
) -> list[AgronomistCase]:
    result = await db.execute(
        select(Feedback, User.name)
        .join(User, Feedback.user_id == User.id)
        .where(exists().where(_message_matches_feedback()))
        .order_by(Feedback.created_at.desc())
    )
    return [_case_response(feedback, sender) for feedback, sender in result.all()]


@router.get("/cases/{case_id}", response_model=AgronomistCaseDetail)
async def get_case(
    case_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.AGRONOMIST)),
    db: AsyncSession = Depends(get_db),
) -> AgronomistCaseDetail:
    result = await db.execute(
        select(Feedback, User.name)
        .join(User, Feedback.user_id == User.id)
        .where(Feedback.id == case_id)
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    feedback, sender = row
    messages_result = await db.execute(
        select(ChatMessage)
        .where(
            ChatMessage.user_id == feedback.user_id,
            or_(
                ChatMessage.session_id == feedback.session_id,
                and_(
                    ChatMessage.image.is_not(None),
                    ChatMessage.image.contains(feedback.image),
                ),
            ),
        )
        .order_by(ChatMessage.created_at)
    )
    case = _case_response(feedback, sender)
    return AgronomistCaseDetail(
        **case.model_dump(),
        messages=[
            ChatMessageResponse.model_validate(message)
            for message in messages_result.scalars().all()
        ],
    )


@router.patch("/cases/{case_id}", response_model=AgronomistCase)
async def update_case(
    case_id: uuid.UUID,
    payload: AgronomistCaseUpdate,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.AGRONOMIST)),
    db: AsyncSession = Depends(get_db),
) -> AgronomistCase:
    result = await db.execute(
        select(Feedback, User.name)
        .join(User, Feedback.user_id == User.id)
        .where(Feedback.id == case_id)
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    feedback, sender = row
    feedback.comment = payload.comment
    feedback.confirmed_label = payload.confirmed_label
    feedback.status = payload.status
    feedback.assignee_id = current_user.id
    await db.commit()
    await db.refresh(feedback)
    return _case_response(feedback, sender)
