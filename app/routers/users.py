"""routers/users.py — profile ("reel") lookups. Matches profile.js on the frontend."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.schemas.user import UserOut, UserProfile, UserSearchResult
from app.schemas.post import PostOut
from app.models.user import User
from app.crud import user as user_crud
from app.crud import post as post_crud

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/search", response_model=list[UserSearchResult])
def search_users(
    q: str = Query(min_length=1, max_length=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Registered *before* /{username} below — FastAPI matches path routes in
    the order they're defined, and /{username} would otherwise swallow a
    request to /search by treating "search" as someone's username.
    """
    return user_crud.search_users(db, q)


@router.get("/{username}", response_model=UserProfile)
def read_user_profile(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = user_crud.get_by_username(db, username)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    return UserProfile(
        id=user.id,
        username=user.username,
        post_count=user_crud.get_post_count(db, user.id),
        follower_count=user_crud.get_follower_count(db, user.id),
        following_count=user_crud.get_following_count(db, user.id),
        is_following=user_crud.is_following(db, current_user.id, user.id),
    )


@router.get("/{username}/posts", response_model=list[PostOut])
def read_user_posts(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not user_crud.get_by_username(db, username):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    return post_crud.get_posts_by_username(db, current_user.id, username)


@router.post("/{username}/follow", status_code=status.HTTP_204_NO_CONTENT)
def follow_user(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = user_crud.get_by_username(db, username)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if target.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="You can't follow yourself."
        )
    user_crud.follow_user(db, current_user.id, target.id)


@router.delete("/{username}/follow", status_code=status.HTTP_204_NO_CONTENT)
def unfollow_user(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = user_crud.get_by_username(db, username)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    user_crud.unfollow_user(db, current_user.id, target.id)