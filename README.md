# Roll — a lighter Instagram, built to learn FastAPI

## Stack
- **Backend:** FastAPI + SQLAlchemy (SQLite)
- **Auth:** JWT bearer tokens (no refresh token yet)
- **Image storage:** ImageKit (uploaded server-side via their Python SDK)
- **Frontend:** plain HTML/CSS/JS, served as static files by FastAPI

## Setup

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in `JWT_SECRET_KEY` plus your existing
ImageKit keys:

```bash
cp .env.example .env
```

Generate a real JWT secret with:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## Run

```bash
uvicorn app.main:app --reload
```

- App: http://127.0.0.1:8000/
- Interactive API docs: http://127.0.0.1:8000/docs

The SQLite database file (`roll.db`) and its tables are created automatically
on first startup — no migration step needed yet.

## Run with Docker

```bash
cp .env.example .env   # then fill in your real keys, same as the non-Docker setup
docker compose up --build
```

Open http://127.0.0.1:8000/ — same as running it locally. `docker compose down` stops
it; your SQLite data survives because it's stored in a named Docker volume
(`roll_data`), not inside the container itself. To wipe the database and start
fresh: `docker compose down -v`.

**Important:** for the volume to actually be used, `DATABASE_URL` in your `.env`
must point at an absolute path inside it: `sqlite:////app/data/roll.db` (four
slashes — three for the `sqlite://` scheme, one for the absolute path). See the
comment in `.env.example`. If you leave it as the relative `sqlite:///./roll.db`,
the database will live inside the container's own filesystem and reset every
time you rebuild the image.

To build and run without Compose:

```bash
docker build -t roll-api .
docker run -p 8000:8000 --env-file .env -v roll_data:/app/data roll-api
```

## Deploying

Before picking a host, know this about the current app: it uses **SQLite**, a
single file on disk. That's fine anywhere with a persistent filesystem or
volume (a VPS, Railway, Render, Fly.io — all of which run your Dockerfile
directly). It is *not* fine on purely serverless/stateless compute, where the
filesystem can reset between invocations and your data would vanish
unpredictably.

## Deploying to Vercel

The database now lives in Supabase (not SQLite), which removes the one real
blocker to hosting on Vercel's container support — the app is stateless from
Vercel's point of view.

1. Push this repo to GitHub (make sure `.env` stays out of it — `.gitignore`
   already excludes it).
2. On vercel.com, "Add New" → "Project" → import the repo. Vercel detects
   `Dockerfile.vercel` (a separate file from `Dockerfile`, which is only used
   by local `docker compose`) and shows a container icon confirming it.
3. Before deploying, add these under "Environment Variables": `DATABASE_URL`
   (your Supabase **Transaction pooler** string), `JWT_SECRET_KEY`,
   `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`.
4. Deploy. You'll get a `*.vercel.app` URL once the image builds.

Two Vercel-specific details already handled in `Dockerfile.vercel`, in case
you're comparing it against the local `Dockerfile`:
- Vercel routes traffic to the port named in the `PORT` env var (default 80),
  so the CMD reads `${PORT:-80}` instead of a hardcoded `8000`.
- Vercel Functions scale to zero after 5 minutes idle (production) or 30
  seconds (preview), and send `SIGTERM` on scale-down — `exec` in the CMD
  makes uvicorn PID 1 so it actually receives that signal.

If you'd rather not touch any of this and just want the exact Dockerfile you
already tested locally to run somewhere, Railway or Render will do that with
no `Dockerfile.vercel`/`$PORT` adjustments needed.


```
app/
├── main.py            # FastAPI app, mounts routers + static frontend
├── config.py          # loads .env via pydantic-settings
├── database.py         # SQLAlchemy engine/session/Base
├── dependencies.py     # get_db, get_current_user
├── imagekit_client.py  # upload/delete helpers for ImageKit
├── models/             # SQLAlchemy ORM models (User, Post, Like)
├── schemas/            # Pydantic request/response models
├── crud/                # DB query functions, separate from route handlers
├── auth/                # password hashing + JWT encode/decode
└── routers/             # /api/auth, /api/users, /api/posts
frontend/                # static HTML/CSS/JS (unchanged from earlier)
```

## What's implemented (v1)
- Register / login (JWT)
- Global feed of posts, newest first, paginated with a `cursor` query param
- Upload a post (image → ImageKit, URL stored in SQLite)
- Like / unlike (idempotent)
- Profile page with post count and a grid of that user's posts

## Not implemented yet (natural next steps)
- Comments
- Follow/unfollow — the feed currently shows everyone's posts, not just
  people you follow (`follower_count`/`following_count` are hardcoded to 0)
- Refresh tokens / logout-everywhere
- Pagination on the frontend (the API supports `?cursor=`, the JS doesn't use it yet)
- Database migrations (Alembic) — right now tables are just created with
  `create_all()`, which won't handle schema changes to existing data
