from __future__ import annotations

import json
import logging
from urllib.parse import urlencode

import requests

from portic_crm.marketing.services.config import get_marketing_config

logger = logging.getLogger(__name__)

GRAPH_API = "https://graph.facebook.com/v21.0"
META_OAUTH = "https://www.facebook.com/v21.0/dialog/oauth"
META_SCOPES = ",".join(
    [
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_posts",
        "instagram_basic",
        "instagram_content_publish",
        "business_management",
    ]
)


class MetaAPIError(Exception):
    def __init__(self, message: str, payload: dict | None = None):
        super().__init__(message)
        self.payload = payload or {}


def oauth_start_url(state: str) -> str:
    cfg = get_marketing_config()
    params = {
        "client_id": cfg.meta_app_id,
        "redirect_uri": cfg.meta_redirect_uri,
        "state": state,
        "scope": META_SCOPES,
        "response_type": "code",
    }
    return f"{META_OAUTH}?{urlencode(params)}"


def trocar_codigo_por_token(code: str) -> dict:
    cfg = get_marketing_config()
    resp = requests.get(
        f"{GRAPH_API}/oauth/access_token",
        params={
            "client_id": cfg.meta_app_id,
            "client_secret": cfg.meta_app_secret,
            "redirect_uri": cfg.meta_redirect_uri,
            "code": code,
        },
        timeout=30,
    )
    data = resp.json()
    if resp.status_code >= 400 or "access_token" not in data:
        raise MetaAPIError("Falha ao obter token Meta", data)
    return data


def token_longa_duracao(short_token: str) -> dict:
    cfg = get_marketing_config()
    resp = requests.get(
        f"{GRAPH_API}/oauth/access_token",
        params={
            "grant_type": "fb_exchange_token",
            "client_id": cfg.meta_app_id,
            "client_secret": cfg.meta_app_secret,
            "fb_exchange_token": short_token,
        },
        timeout=30,
    )
    data = resp.json()
    if resp.status_code >= 400 or "access_token" not in data:
        raise MetaAPIError("Falha ao obter token de longa duração", data)
    return data


def listar_paginas(user_token: str) -> list[dict]:
    resp = requests.get(
        f"{GRAPH_API}/me/accounts",
        params={
            "access_token": user_token,
            "fields": "id,name,access_token,instagram_business_account{id,username}",
        },
        timeout=30,
    )
    data = resp.json()
    if resp.status_code >= 400:
        raise MetaAPIError("Falha ao listar páginas Facebook", data)
    return data.get("data", [])


def publicar_facebook(
    page_id: str,
    page_token: str,
    texto: str,
    link_url: str = "",
    media_urls: list[str] | None = None,
) -> str:
    if get_marketing_config().dry_run:
        return f"dry_run_fb_{page_id}"

    media_urls = [url for url in (media_urls or []) if url]

    if len(media_urls) > 1:
        attached: list[dict[str, str]] = []
        for media_url in media_urls[:10]:
            photo_resp = requests.post(
                f"{GRAPH_API}/{page_id}/photos",
                data={
                    "url": media_url,
                    "published": "false",
                    "access_token": page_token,
                },
                timeout=60,
            )
            photo_data = photo_resp.json()
            if photo_resp.status_code >= 400 or "id" not in photo_data:
                raise MetaAPIError("Falha ao carregar foto para carrossel Facebook", photo_data)
            attached.append({"media_fbid": str(photo_data["id"])})

        feed_payload: dict = {
            "message": texto,
            "access_token": page_token,
        }
        for index, item in enumerate(attached):
            feed_payload[f"attached_media[{index}]"] = json.dumps(item)

        resp = requests.post(
            f"{GRAPH_API}/{page_id}/feed",
            data=feed_payload,
            timeout=60,
        )
        data = resp.json()
        if resp.status_code >= 400 or "id" not in data:
            raise MetaAPIError("Falha ao publicar carrossel no Facebook", data)
        return str(data["id"])

    if len(media_urls) == 1:
        url = f"{GRAPH_API}/{page_id}/photos"
        payload: dict = {"url": media_urls[0], "access_token": page_token}
        if texto:
            payload["caption"] = texto
    else:
        url = f"{GRAPH_API}/{page_id}/feed"
        payload = {"message": texto, "access_token": page_token}
        if link_url:
            payload["link"] = link_url

    resp = requests.post(url, data=payload, timeout=60)
    data = resp.json()
    if resp.status_code >= 400 or "id" not in data:
        raise MetaAPIError("Falha ao publicar no Facebook", data)
    return str(data["id"])


def publicar_instagram(ig_user_id: str, page_token: str, texto: str, media_urls: list[str]) -> str:
    if get_marketing_config().dry_run:
        return f"dry_run_ig_{ig_user_id}"

    if not media_urls:
        raise MetaAPIError("Instagram exige pelo menos uma imagem")

    if len(media_urls) == 1:
        container_resp = requests.post(
            f"{GRAPH_API}/{ig_user_id}/media",
            data={
                "image_url": media_urls[0],
                "caption": texto,
                "access_token": page_token,
            },
            timeout=60,
        )
        container = container_resp.json()
        if container_resp.status_code >= 400 or "id" not in container:
            raise MetaAPIError("Falha ao criar contentor Instagram", container)
        creation_id = container["id"]
    else:
        children_ids = []
        for media_url in media_urls[:10]:
            child_resp = requests.post(
                f"{GRAPH_API}/{ig_user_id}/media",
                data={
                    "image_url": media_url,
                    "is_carousel_item": "true",
                    "access_token": page_token,
                },
                timeout=60,
            )
            child = child_resp.json()
            if child_resp.status_code >= 400 or "id" not in child:
                raise MetaAPIError("Falha ao criar item de carrossel Instagram", child)
            children_ids.append(child["id"])

        carousel_resp = requests.post(
            f"{GRAPH_API}/{ig_user_id}/media",
            data={
                "media_type": "CAROUSEL",
                "children": ",".join(children_ids),
                "caption": texto,
                "access_token": page_token,
            },
            timeout=60,
        )
        carousel = carousel_resp.json()
        if carousel_resp.status_code >= 400 or "id" not in carousel:
            raise MetaAPIError("Falha ao criar carrossel Instagram", carousel)
        creation_id = carousel["id"]

    publish_resp = requests.post(
        f"{GRAPH_API}/{ig_user_id}/media_publish",
        data={"creation_id": creation_id, "access_token": page_token},
        timeout=60,
    )
    published = publish_resp.json()
    if publish_resp.status_code >= 400 or "id" not in published:
        raise MetaAPIError("Falha ao publicar no Instagram", published)
    return str(published["id"])
