"""crud/user.py — database operations for User, kept separate from route handlers."""

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.post import Post
from app.schemas.user import UserCreate
from app.auth.hashing import hash_password


def get_by_username(db: Session, username: str) -> User | None:
    return db.scalar(select(User).where(User.username == username))


def get_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def create_user(db: Session, user_in: UserCreate) -> User:
    user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_post_count(db: Session, user_id: int) -> int:
    return db.scalar(select(func.count(Post.id)).where(Post.author_id == user_id)) or 0
