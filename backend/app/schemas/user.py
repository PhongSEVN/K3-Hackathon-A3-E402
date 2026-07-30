from pydantic import BaseModel, Field


class UpdateProfileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6, max_length=128)
