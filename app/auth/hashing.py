"""
auth/hashing.py — password hashing using bcrypt directly.

(Not passlib: passlib is unmaintained and its bcrypt backend detection
breaks against recent bcrypt releases — using the bcrypt package directly
avoids that fragility, and the API is small enough not to need a wrapper.)

Never store plaintext passwords. bcrypt automatically salts each hash,
so two users with the same password get different hashed_password values.
bcrypt has a 72-byte input limit, so overly long passwords are truncated
before hashing — 72 bytes is already far beyond any reasonable password.
"""

import bcrypt

_MAX_BCRYPT_BYTES = 72


def hash_password(plain_password: str) -> str:
    truncated = plain_password.encode("utf-8")[:_MAX_BCRYPT_BYTES]
    hashed = bcrypt.hashpw(truncated, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    truncated = plain_password.encode("utf-8")[:_MAX_BCRYPT_BYTES]
    return bcrypt.checkpw(truncated, hashed_password.encode("utf-8"))
