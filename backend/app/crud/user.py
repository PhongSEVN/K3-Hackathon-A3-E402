import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email, User.deleted_at.is_(None)))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, *, email: str, password_hash: str, name: str) -> User:
    user = User(email=email, password=password_hash, name=name)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_name(db: AsyncSession, user: User, name: str) -> User:
    user.name = name
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_avatar(db: AsyncSession, user: User, avatar_path: str) -> User:
    user.avatar = avatar_path
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_password(db: AsyncSession, user: User, password_hash: str) -> User:
    user.password = password_hash
    await db.commit()
    await db.refresh(user)
    return user
