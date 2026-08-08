"""
crud/post.py — database operations for posts and likes.

v1 feed is intentionally simple: everyone's posts, newest first, paginated
with a cursor on id. Swap this for a "posts from people I follow" query
once follows exist — the router won't need to change, just this function.
"""

from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload

from app.models.post import Post, Like
from app.models.user import User
from app.schemas.post import PostOut

FEED_PAGE_SIZE = 20


def _like_count_subquery():
    return (
        select(func.count(Like.id))
        .where(Like.post_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )


def _to_post_out(post: Post, viewer_id: int, like_count: int) -> PostOut:
    liked = any(like.user_id == viewer_id for like in post.likes)
    return PostOut(
        id=post.id,
        username=post.author.username,
        caption=post.caption,
        image_url=post.image_url,
        like_count=like_count,
        liked_by_me=liked,
        created_at=post.created_at,
    )


def get_feed(db: Session, viewer_id: int, cursor: int | None = None) -> list[PostOut]:
    stmt = (
        select(Post)
        .options(selectinload(Post.author), selectinload(Post.likes))
        .order_by(Post.id.desc())
        .limit(FEED_PAGE_SIZE)
    )
    if cursor is not None:
        stmt = stmt.where(Post.id < cursor)

    posts = db.scalars(stmt).all()
    return [_to_post_out(p, viewer_id, len(p.likes)) for p in posts]


def get_posts_by_username(db: Session, viewer_id: int, username: str) -> list[PostOut]:
    stmt = (
        select(Post)
        .join(Post.author)
        .where(User.username == username)
        .options(selectinload(Post.author), selectinload(Post.likes))
        .order_by(Post.id.desc())
    )
    posts = db.scalars(stmt).all()
    return [_to_post_out(p, viewer_id, len(p.likes)) for p in posts]


def create_post(db: Session, author_id: int, image_url: str, image_file_id: str, caption: str | None) -> Post:
    post = Post(
        author_id=author_id,
        image_url=image_url,
        image_file_id=image_file_id,
        caption=caption or None,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


def get_post(db: Session, post_id: int) -> Post | None:
    return db.get(Post, post_id)


def like_post(db: Session, user_id: int, post_id: int) -> None:
    existing = db.scalar(
        select(Like).where(Like.user_id == user_id, Like.post_id == post_id)
    )
    if existing:
        return  # already liked — idempotent
    db.add(Like(user_id=user_id, post_id=post_id))
    db.commit()


def unlike_post(db: Session, user_id: int, post_id: int) -> None:
    existing = db.scalar(
        select(Like).where(Like.user_id == user_id, Like.post_id == post_id)
    )
    if existing:
        db.delete(existing)
        db.commit()
