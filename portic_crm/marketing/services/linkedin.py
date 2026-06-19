from __future__ import annotations

import logging
from urllib.parse import urlencode

import requests

from portic_crm.marketing.services.config import get_marketing_config

logger = logging.getLogger(__name__)

LINKEDIN_AUTH = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_API = "https://api.linkedin.com/v2"
LINKEDIN_SCOPES = " ".join(
    [
        "w_organization_social",
        "r_organization_social",
        "rw_organization_admin",
    ]
)


class LinkedInAPIError(Exception):
    def __init__(self, message: str, payload: dict | None = None):
        super().__init__(message)
        self.payload = payload or {}


def oauth_start_url(state: str) -> str:
    cfg = get_marketing_config()
    params = {
        "response_type": "code",
        "client_id": cfg.linkedin_client_id,
        "redirect_uri": cfg.linkedin_redirect_uri,
        "state": state,
        "scope": LINKEDIN_SCOPES,
    }
    return f"{LINKEDIN_AUTH}?{urlencode(params)}"


def trocar_codigo_por_token(code: str) -> dict:
    cfg = get_marketing_config()
    resp = requests.post(
        LINKEDIN_TOKEN,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": cfg.linkedin_redirect_uri,
            "client_id": cfg.linkedin_client_id,
            "client_secret": cfg.linkedin_client_secret,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    data = resp.json()
    if resp.status_code >= 400 or "access_token" not in data:
        raise LinkedInAPIError("Falha ao obter token LinkedIn", data)
    return data


def listar_organizacoes(access_token: str) -> list[dict]:
    resp = requests.get(
        f"{LINKEDIN_API}/organizationAcls",
        params={"q": "roleAssignee", "role": "ADMINISTRATOR", "state": "APPROVED"},
        headers={
            "Authorization": f"Bearer {access_token}",
            "X-Restli-Protocol-Version": "2.0.0",
        },
        timeout=30,
    )
    data = resp.json()
    if resp.status_code >= 400:
        raise LinkedInAPIError("Falha ao listar organizações LinkedIn", data)

    orgs: list[dict] = []
    for element in data.get("elements", []):
        org_urn = element.get("organization", "")
        org_id = org_urn.split(":")[-1] if org_urn else ""
        if not org_id:
            continue
        detail_resp = requests.get(
            f"{LINKEDIN_API}/organizations/{org_id}",
            params={"projection": "(localizedName)"},
            headers={
                "Authorization": f"Bearer {access_token}",
                "X-Restli-Protocol-Version": "2.0.0",
            },
            timeout=30,
        )
        detail = detail_resp.json() if detail_resp.status_code < 400 else {}
        orgs.append(
            {
                "id": org_id,
                "urn": org_urn or f"urn:li:organization:{org_id}",
                "nome": detail.get("localizedName", f"Organização {org_id}"),
            }
        )
    return orgs


def publicar_linkedin(
    org_urn: str,
    access_token: str,
    texto: str,
    media_urls: list[str] | None = None,
) -> str:
    if get_marketing_config().dry_run:
        return f"dry_run_li_{org_urn}"

    author = org_urn if org_urn.startswith("urn:") else f"urn:li:organization:{org_urn}"
    urls = [url for url in (media_urls or []) if url][:9]

    share_content: dict = {
        "shareCommentary": {"text": texto},
        "shareMediaCategory": "NONE",
    }
    if urls:
        share_content = {
            "shareCommentary": {"text": texto},
            "shareMediaCategory": "IMAGE",
            "media": [
                {
                    "status": "READY",
                    "originalUrl": media_url,
                }
                for media_url in urls
            ],
        }

    payload = {
        "author": author,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": share_content,
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
    }

    resp = requests.post(
        f"{LINKEDIN_API}/ugcPosts",
        json=payload,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
        },
        timeout=60,
    )
    if resp.status_code >= 400:
        try:
            data = resp.json()
        except Exception:
            data = {"body": resp.text}
        raise LinkedInAPIError("Falha ao publicar no LinkedIn", data)

    post_id = resp.headers.get("x-restli-id") or resp.headers.get("X-RestLi-Id", "")
    if not post_id and resp.text:
        post_id = resp.text.strip().strip('"')
    return post_id or "linkedin_post"
