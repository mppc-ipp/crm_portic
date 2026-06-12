from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet
from django.conf import settings


def _fernet() -> Fernet:
    digest = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encriptar_token(valor: str) -> str:
    if not valor:
        return ""
    return _fernet().encrypt(valor.encode()).decode()


def desencriptar_token(valor: str) -> str:
    if not valor:
        return ""
    try:
        return _fernet().decrypt(valor.encode()).decode()
    except Exception:
        return ""
