"""
imagekit_client.py — wraps the ImageKit Python SDK for uploading post images.

Flow: the client sends the raw file to our /api/posts endpoint, we read
its bytes and hand them to ImageKit, and store the URL + file_id it gives
back. file_id is what lets us delete the image from ImageKit later if the
post is deleted.

NOTE: this targets imagekitio >= 5.0 (a rewritten, OpenAI-SDK-style
client). It only needs private_key to authenticate — public_key and
url_endpoint from your .env aren't required by this client itself, but
keep them there since ImageKit's transformation URLs / dashboard still
reference them, and you'll likely want url_endpoint for building
thumbnail URLs later.

Install: pip install imagekitio
"""

from fastapi import HTTPException, status

from imagekitio import ImageKit
from app.config import get_settings

settings = get_settings()

client = ImageKit(private_key=settings.imagekit_private_key)


def upload_image(file_bytes: bytes, filename: str) -> tuple[str, str]:
    """
    Uploads raw image bytes to ImageKit's "posts" folder.
    Returns (url, file_id). Raises HTTPException(502) if the upload fails.
    """
    try:
        result = client.files.upload(
            file=file_bytes,
            file_name=filename,
            folder="/roll/posts",
            use_unique_file_name=True,
        )
    except Exception as exc:  # SDK raises broadly; surface as a clean 502
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Image upload failed: {exc}",
        ) from exc

    if not result or not getattr(result, "url", None):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Image upload failed: no URL returned by ImageKit.",
        )

    return result.url, result.file_id


def delete_image(file_id: str) -> None:
    """Best-effort delete; failures are swallowed so a post can still be removed."""
    try:
        client.files.delete(file_id)
    except Exception:
        pass
