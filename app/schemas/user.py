"""
schemas/user.py — Pydantic models for request/response validation.

Keeping these separate from the SQLAlchemy models (models/user.py) is
deliberate: it stops us ever accidentally returning hashed_password in an
API response, since UserOut simply doesn't have that field.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_.]+$")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfile(BaseModel):
    """Richer view used on the profile page — includes counts the frontend renders."""

    id: int
    username: str
    post_count: int = 0
    follower_count: int = 0  # placeholder until follows exist; always 0 for now
    following_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
