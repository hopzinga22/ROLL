"""
crud/post.py — database operations for posts and likes.

Feed ordering: posts from people you follow come first (newest first within
that group), then everyone else's posts (also newest first). This keeps the
feed useful before you've followed anyone — it just falls back to "everyone" —
while surfacing followed accounts once you have.
"""

from sqlalchemy import select, func, case
from sqlalchemy.orm import Session, selectinload

from app.models.post import Post, Like
from app.models.user import User
from app.models.follow import Follow
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
        comment_count=len(post.comments),
        created_at=post.created_at,
    )


def get_feed(db: Session, viewer_id: int, cursor: int | None = None) -> list[PostOut]:
    following_ids = (
        select(Follow.followed_id).where(Follow.follower_id == viewer_id).scalar_subquery()
    )
    # 0 for posts from someone you follow, 1 for everyone else — sorting
    # ascending on this puts followed accounts' posts first.
    followed_rank = case((Post.author_id.in_(following_ids), 0), else_=1)

    stmt = (
        select(Post)
        .options(selectinload(Post.author), selectinload(Post.likes), selectinload(Post.comments))
        .order_by(followed_rank, Post.id.desc())
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
        .options(selectinload(Post.author), selectinload(Post.likes), selectinload(Post.comments))
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


def delete_post(db: Session, post: Post) -> None:
    db.delete(post)
    db.commit()


def like_post(db: Session, user_id: int, post_id: int) -> None:
    existing = db.scalar(select(Like).where(Like.user_id == user_id, Like.post_id == post_id))
    if existing:
        return
    db.add(Like(user_id=user_id, post_id=post_id))
    db.commit()


def unlike_post(db: Session, user_id: int, post_id: int) -> None:
    existing = db.scalar(select(Like).where(Like.user_id == user_id, Like.post_id == post_id))
    if existing:
        db.delete(existing)
        db.commit()