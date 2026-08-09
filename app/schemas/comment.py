"""schemas/comment.py — Pydantic models for comments."""

from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=500)


class CommentOut(BaseModel):
    id: int
    post_id: int
    username: str
    content: str
    created_at: datetime
    can_delete: bool  # true if the requesting user wrote it (or owns the post)

    model_config = ConfigDict(from_attributes=True)
