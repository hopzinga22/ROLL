"""
models/follow.py — the Follow table: a directed edge from follower -> followed.

Modeled the same way as Like in post.py (its own table with created_at,
rather than a bare association table) so follower/following counts and
"does X follow Y" checks are simple queries instead of joins.
"""

from datetime import datetime, timezone

from sqlalchemy import ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Follow(Base):
    __tablename__ = "follows"
    __table_args__ = (
        # A user can only follow another user once.
        UniqueConstraint("follower_id", "followed_id", name="uq_follower_followed"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    follower_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    followed_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Two relationships to User from the same table need explicit foreign_keys,
    # or SQLAlchemy can't tell which column belongs to which side.
    follower: Mapped["User"] = relationship(foreign_keys=[follower_id])
    followed: Mapped["User"] = relationship(foreign_keys=[followed_id])