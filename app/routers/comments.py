"""
routers/comments.py — add/list/delete comments on a post.

Two different URL shapes on purpose: comments are always listed/created in
the context of a post (/api/posts/{post_id}/comments), but deleted by their
own id (/api/comments/{comment_id}) since at delete time the client only
needs to know which comment, not which post it's on.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.schemas.comment import CommentCreate, CommentOut
from app.models.user import User
from app.crud import post as post_crud
from app.crud import comment as comment_crud

router = APIRouter(prefix="/api", tags=["comments"])


@router.get("/posts/{post_id}/comments", response_model=list[CommentOut])
def read_comments(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = post_crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")

    return comment_crud.get_comments_for_post(db, post_id, current_user.id, post.author_id)


@router.post("/posts/{post_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def create_comment(
    post_id: int,
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = post_crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")

    comment = comment_crud.create_comment(db, post_id, current_user.id, comment_in.content)
    return CommentOut(
        id=comment.id,
        post_id=post_id,
        username=current_user.username,
        content=comment.content,
        created_at=comment.created_at,
        can_delete=True,  # you can always delete your own just-created comment
    )


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = comment_crud.get_comment(db, comment_id)
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found.")

    post = post_crud.get_post(db, comment.post_id)
    is_comment_author = comment.author_id == current_user.id
    is_post_owner = post is not None and post.author_id == current_user.id

    if not (is_comment_author or is_post_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own comments, or comments on your own posts.",
        )

    comment_crud.delete_comment(db, comment)
