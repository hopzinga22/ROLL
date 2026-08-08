"""
schemas/post.py — Pydantic models for posts ("frames") and likes.

Note there's no PostCreate model: the create-post endpoint takes the
image as an UploadFile via multipart form data (see routers/posts.py),
which FastAPI handles as separate Form()/File() parameters rather than
a JSON body.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PostOut(BaseModel):
    id: int
    username: str
    caption: str | None
    image_url: str
    like_count: int
    liked_by_me: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
