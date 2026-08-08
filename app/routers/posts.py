"""
routers/posts.py — feed, uploading a new "frame", and liking.
Matches feed.js and upload.js on the frontend.
"""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.schemas.post import PostOut
from app.models.user import User
from app.crud import post as post_crud
from app.imagekit_client import upload_image

router = APIRouter(prefix="/api/posts", tags=["posts"])

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10MB, matches the frontend's stated limit
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}


@router.get("", response_model=list[PostOut])
def read_feed(
    cursor: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return post_crud.get_feed(db, current_user.id, cursor)


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
async def create_post(
    image: UploadFile = File(...),
    caption: str = Form(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPG and PNG images are supported.",
        )

    file_bytes = await image.read()
    if len(file_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image must be 10MB or smaller.",
        )

    image_url, image_file_id = upload_image(file_bytes, image.filename or "frame.jpg")

    post = post_crud.create_post(
        db,
        author_id=current_user.id,
        image_url=image_url,
        image_file_id=image_file_id,
        caption=caption,
    )

    return PostOut(
        id=post.id,
        username=current_user.username,
        caption=post.caption,
        image_url=post.image_url,
        like_count=0,
        liked_by_me=False,
        created_at=post.created_at,
    )


@router.post("/{post_id}/like", status_code=status.HTTP_204_NO_CONTENT)
def like_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not post_crud.get_post(db, post_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
    post_crud.like_post(db, current_user.id, post_id)


@router.delete("/{post_id}/like", status_code=status.HTTP_204_NO_CONTENT)
def unlike_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not post_crud.get_post(db, post_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
    post_crud.unlike_post(db, current_user.id, post_id)
