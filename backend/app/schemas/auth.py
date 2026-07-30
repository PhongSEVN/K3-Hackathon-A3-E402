import uuid

from pydantic import BaseModel, EmailStr, Field

from app.core.config import settings
from app.models.user import User, UserRole


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: str
    role: UserRole
    avatar: str | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_user(cls, user: User) -> "UserResponse":
        avatar_url = None
        if user.avatar:
            scheme = "https" if settings.minio_use_ssl else "http"
            avatar_url = f"{scheme}://{settings.minio_endpoint}/{user.avatar}"

        return cls(id=user.id, email=user.email, name=user.name, role=user.role, avatar=avatar_url)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
