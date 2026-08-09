"""crud/comment.py — database operations for comments."""

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.comment import Comment
from app.models.post import Post
from app.schemas.comment import CommentOut


def _to_comment_out(comment: Comment, viewer_id: int, post_author_id: int) -> CommentOut:
    can_delete = comment.author_id == viewer_id or post_author_id == viewer_id
    return CommentOut(
        id=comment.id,
        post_id=comment.post_id,
        username=comment.author.username,
        content=comment.content,
        created_at=comment.created_at,
        can_delete=can_delete,
    )


def get_comments_for_post(db: Session, post_id: int, viewer_id: int, post_author_id: int) -> list[CommentOut]:
    stmt = (
        select(Comment)
        .where(Comment.post_id == post_id)
        .options(selectinload(Comment.author))
        .order_by(Comment.created_at)
    )
    comments = db.scalars(stmt).all()
    return [_to_comment_out(c, viewer_id, post_author_id) for c in comments]


def create_comment(db: Session, post_id: int, author_id: int, content: str) -> Comment:
    comment = Comment(post_id=post_id, author_id=author_id, content=content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def get_comment(db: Session, comment_id: int) -> Comment | None:
    return db.get(Comment, comment_id)


def delete_comment(db: Session, comment: Comment) -> None:
    db.delete(comment)
    db.commit()


def count_comments(db: Session, post_id: int) -> int:
    return len(db.scalars(select(Comment.id).where(Comment.post_id == post_id)).all())
