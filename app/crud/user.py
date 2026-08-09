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


def search_users(db: Session, query: str, limit: int = 10) -> list[User]:
    """Case-insensitive "starts with or contains" username search, most relevant first.

    ilike works the same on SQLite and Postgres, so this didn't need to change
    when the project moved from SQLite to Supabase.
    """
    pattern = f"%{query}%"
    stmt = (
        select(User)
        .where(User.username.ilike(pattern))
        .order_by(
            # Prefix matches ("jz" matches "jzuser") rank above matches in the
            # middle of the name; ilike(...) returns a boolean, and ordering
            # it desc puts True (prefix match) first on both SQLite and Postgres.
            User.username.ilike(f"{query}%").desc(),
            User.username,
        )
        .limit(limit)
    )
    return list(db.scalars(stmt).all())
