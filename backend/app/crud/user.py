from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email, User.deleted_at.is_(None)))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, *, email: str, password_hash: str, name: str) -> User:
    user = User(email=email, password=password_hash, name=name)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
