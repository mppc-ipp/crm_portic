"""Limitação de taxa baseada em cache."""

from __future__ import annotations

from django.conf import settings
from django.core.cache import cache


def _incrementar(key: str, limite: int, janela_seg: int) -> bool:
    """Incrementa contador; devolve True se ainda dentro do limite."""
    count = cache.get(key, 0)
    if count >= limite:
        return False
    if count == 0:
        cache.set(key, 1, timeout=janela_seg)
    else:
        cache.incr(key)
    return True


def rate_limit_login(identifier: str) -> bool:
    limite = int(getattr(settings, "LOGIN_RATE_LIMIT", 10))
    janela = int(getattr(settings, "LOGIN_RATE_WINDOW_SEC", 900))
    return _incrementar(f"login_rate:{identifier}", limite, janela)
