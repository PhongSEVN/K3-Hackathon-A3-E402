from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import hash_password, verify_password
from app.core.storage import upload_object
from app.crud.user import update_user_avatar, update_user_name, update_user_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import UserResponse
from app.schemas.user import ChangePasswordRequest, UpdateProfileRequest

router = APIRouter(prefix="/users", tags=["users"])

MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.from_user(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    user = await update_user_name(db, current_user, payload.name)
    return UserResponse.from_user(user)


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be an image")

    data = await file.read()
    if len(data) > MAX_AVATAR_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image too large (max 5MB)")

    extension = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    object_name = f"{current_user.id}.{extension}"
    avatar_path = upload_object(settings.minio_bucket_avatars, object_name, data, file.content_type)

    user = await update_user_avatar(db, current_user, avatar_path)
    return UserResponse.from_user(user)


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    if not verify_password(payload.old_password, current_user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Old password is incorrect")

    await update_user_password(db, current_user, hash_password(payload.new_password))
