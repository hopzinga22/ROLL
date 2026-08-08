"""routers/auth.py — registration and login. Matches auth.js on the frontend."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.schemas.user import UserCreate, UserLogin, UserOut, Token
from app.auth.hashing import verify_password
from app.auth.jwt import create_access_token
from app.crud import user as user_crud

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if user_crud.get_by_username(db, user_in.username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That username is taken.")
    if user_crud.get_by_email(db, user_in.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That email is already registered.")

    user = user_crud.create_user(db, user_in)
    return user


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = user_crud.get_by_username(db, credentials.username)

    # Deliberately vague error: don't reveal whether the username exists.
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password.",
    )

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise invalid

    token = create_access_token(user.id)
    return Token(access_token=token, user=user)
