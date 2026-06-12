from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings as dj_settings

from portic_crm.marketing.services.tokens import desencriptar_token


@dataclass(frozen=True)
class MarketingConfig:
    meta_app_id: str
    meta_app_secret: str
    meta_redirect_uri: str
    linkedin_client_id: str
    linkedin_client_secret: str
    linkedin_redirect_uri: str
    media_public_base_url: str
    dry_run: bool


def _secret_from_db(encrypted: str, env_fallback: str) -> str:
    if encrypted:
        plain = desencriptar_token(encrypted)
        return plain or encrypted
    return env_fallback or ""


def get_marketing_config() -> MarketingConfig:
    from portic_crm.administrador.models import ConfiguracaoSistema

    cfg = ConfiguracaoSistema.get_solo()
    api_base = dj_settings.API_PUBLIC_URL.rstrip("/")

    dry_run = cfg.marketing_dry_run
    if dry_run is None:
        dry_run = dj_settings.MARKETING_DRY_RUN

    return MarketingConfig(
        meta_app_id=cfg.marketing_meta_app_id or dj_settings.META_APP_ID,
        meta_app_secret=_secret_from_db(
            cfg.marketing_meta_app_secret,
            dj_settings.META_APP_SECRET,
        ),
        meta_redirect_uri=(
            cfg.marketing_meta_redirect_uri
            or dj_settings.META_REDIRECT_URI
            or f"{api_base}/api/marketing/oauth/meta/callback"
        ),
        linkedin_client_id=cfg.marketing_linkedin_client_id or dj_settings.LINKEDIN_CLIENT_ID,
        linkedin_client_secret=_secret_from_db(
            cfg.marketing_linkedin_client_secret,
            dj_settings.LINKEDIN_CLIENT_SECRET,
        ),
        linkedin_redirect_uri=(
            cfg.marketing_linkedin_redirect_uri
            or dj_settings.LINKEDIN_REDIRECT_URI
            or f"{api_base}/api/marketing/oauth/linkedin/callback"
        ),
        media_public_base_url=(
            cfg.marketing_media_public_base_url
            or dj_settings.MARKETING_MEDIA_PUBLIC_BASE_URL
            or api_base
        ),
        dry_run=bool(dry_run),
    )
