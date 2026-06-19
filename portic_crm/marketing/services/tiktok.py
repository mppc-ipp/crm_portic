from __future__ import annotations

import base64
import hashlib
import logging
import secrets
import time
from urllib.parse import urlencode

import requests

from portic_crm.marketing.services.config import get_marketing_config

logger = logging.getLogger(__name__)

TIKTOK_AUTH = "https://www.tiktok.com/v2/auth/authorize/"
TIKTOK_API = "https://open.tiktokapis.com"
TIKTOK_SCOPES = ",".join(["user.info.basic", "video.publish"])


class TikTokAPIError(Exception):
    def __init__(self, message: str, payload: dict | None = None):
        super().__init__(message)
        self.payload = payload or {}


def gerar_pkce() -> tuple[str, str]:
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode("utf-8").rstrip("=")
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode("utf-8")).digest())
        .decode("utf-8")
        .rstrip("=")
    )
    return verifier, challenge


def oauth_start_url(state: str, code_challenge: str) -> str:
    cfg = get_marketing_config()
    params = {
        "client_key": cfg.tiktok_client_key,
        "redirect_uri": cfg.tiktok_redirect_uri,
        "state": state,
        "scope": TIKTOK_SCOPES,
        "response_type": "code",
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    return f"{TIKTOK_AUTH}?{urlencode(params)}"


def _token_request(data: dict) -> dict:
    cfg = get_marketing_config()
    payload = {
        "client_key": cfg.tiktok_client_key,
        "client_secret": cfg.tiktok_client_secret,
        **data,
    }
    resp = requests.post(
        f"{TIKTOK_API}/v2/oauth/token/",
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    body = resp.json()
    if resp.status_code >= 400 or body.get("error"):
        raise TikTokAPIError("Falha na autenticação TikTok", body)
    return body


def trocar_codigo_por_token(code: str, code_verifier: str) -> dict:
    cfg = get_marketing_config()
    return _token_request(
        {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": cfg.tiktok_redirect_uri,
            "code_verifier": code_verifier,
        }
    )


def renovar_token(refresh_token: str) -> dict:
    return _token_request(
        {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }
    )


def obter_perfil(access_token: str) -> dict:
    resp = requests.get(
        f"{TIKTOK_API}/v2/user/info/",
        params={"fields": "open_id,display_name,avatar_url"},
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30,
    )
    body = resp.json()
    if resp.status_code >= 400 or body.get("error"):
        raise TikTokAPIError("Falha ao obter perfil TikTok", body)
    user = (body.get("data") or {}).get("user") or {}
    return {
        "open_id": user.get("open_id", ""),
        "display_name": user.get("display_name", "TikTok"),
        "avatar_url": user.get("avatar_url", ""),
    }


def _api_post(access_token: str, path: str, payload: dict) -> dict:
    resp = requests.post(
        f"{TIKTOK_API}{path}",
        json=payload,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=UTF-8",
        },
        timeout=60,
    )
    body = resp.json()
    if resp.status_code >= 400 or body.get("error"):
        raise TikTokAPIError(f"Erro TikTok API {path}", body)
    return body.get("data") or {}


def _obter_creator_info(access_token: str) -> dict:
    return _api_post(access_token, "/v2/post/publish/creator_info/query/", {})


def _escolher_privacy_level(creator_info: dict) -> str:
    niveis = creator_info.get("privacy_level_options") or []
    if "PUBLIC_TO_EVERYONE" in niveis:
        return "PUBLIC_TO_EVERYONE"
    if "MUTUAL_FOLLOW_FRIENDS" in niveis:
        return "MUTUAL_FOLLOW_FRIENDS"
    if "FOLLOWER_OF_CREATOR" in niveis:
        return "FOLLOWER_OF_CREATOR"
    if "SELF_ONLY" in niveis:
        return "SELF_ONLY"
    if niveis:
        return niveis[0]
    return "SELF_ONLY"


def _poll_publish_status(access_token: str, publish_id: str, timeout_s: int = 120) -> str:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        data = _api_post(
            access_token,
            "/v2/post/publish/status/fetch/",
            {"publish_id": publish_id},
        )
        status = data.get("status", "")
        if status == "PUBLISH_COMPLETE":
            return publish_id
        if status in ("FAILED", "PUBLISH_FAILED"):
            raise TikTokAPIError("Publicação TikTok falhou", data)
        time.sleep(3)
    raise TikTokAPIError("Timeout à espera da publicação TikTok", {"publish_id": publish_id})


def publicar_video(access_token: str, open_id: str, texto: str, video_url: str) -> str:
    if get_marketing_config().dry_run:
        return f"dry_run_tiktok_{open_id}"

    creator_info = _obter_creator_info(access_token)
    privacy_level = _escolher_privacy_level(creator_info)

    init_data = _api_post(
        access_token,
        "/v2/post/publish/video/init/",
        {
            "post_info": {
                "title": texto[:2200],
                "privacy_level": privacy_level,
                "disable_duet": False,
                "disable_comment": False,
                "disable_stitch": False,
                "video_cover_timestamp_ms": 1000,
            },
            "source_info": {
                "source": "PULL_FROM_URL",
                "video_url": video_url,
            },
        },
    )
    publish_id = init_data.get("publish_id", "")
    if not publish_id:
        raise TikTokAPIError("TikTok não devolveu publish_id", init_data)
    return _poll_publish_status(access_token, publish_id)
