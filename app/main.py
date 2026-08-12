"""
main.py — FastAPI app entrypoint.

Run with:  uvicorn app.main:app --reload
Then open: http://127.0.0.1:8000/  (serves frontend/index.html)
API docs:  http://127.0.0.1:8000/docs
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.database import init_db
from app.routers import auth, users, posts, comments

app = FastAPI(title="Roll API")
# --- API routers -----------------------------------------------------------
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(comments.router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


# --- Serve the static frontend ---------------------------------------------
# Mounted last so it doesn't shadow the /api routes above.
# html=True makes StaticFiles serve index.html for "/" automatically.
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
