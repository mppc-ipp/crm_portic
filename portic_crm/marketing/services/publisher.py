from __future__ import annotations

from django.utils import timezone

from portic_crm.marketing.models import (
    EstadoDestino,
    EstadoPublicacao,
    NivelLog,
    PlataformaSocial,
    Publicacao,
    PublicacaoDestino,
    PublicacaoLog,
)
from portic_crm.marketing.services import linkedin as li_svc
from portic_crm.marketing.services import meta as meta_svc
from portic_crm.marketing.services.config import get_marketing_config
from portic_crm.marketing.services.tokens import desencriptar_token


def _media_urls(publicacao: Publicacao) -> list[str]:
    urls = []
    for midia in publicacao.midias.all():
        if midia.ficheiro:
            base = get_marketing_config().media_public_base_url.rstrip("/")
            urls.append(f"{base}{midia.ficheiro.url}")
    return urls


def _registar_log(publicacao: Publicacao, nivel: str, mensagem: str, detalhes: dict | None = None):
    PublicacaoLog.objects.create(
        publicacao=publicacao,
        nivel=nivel,
        mensagem=mensagem[:500],
        detalhes=detalhes or {},
    )


def publicar_destino(destino: PublicacaoDestino) -> None:
    publicacao = destino.publicacao
    if not destino.conta or not destino.conta.ativa:
        destino.estado = EstadoDestino.FALHOU
        destino.erro = "Conta social inactiva ou não ligada"
        destino.save(update_fields=["estado", "erro", "updated_at"])
        _registar_log(publicacao, NivelLog.ERRO, destino.erro, {"destino_id": destino.id})
        return

    token = desencriptar_token(destino.conta.access_token)
    if not token:
        destino.estado = EstadoDestino.FALHOU
        destino.erro = "Token inválido ou expirado"
        destino.save(update_fields=["estado", "erro", "updated_at"])
        _registar_log(publicacao, NivelLog.ERRO, destino.erro, {"destino_id": destino.id})
        return

    destino.estado = EstadoDestino.A_PUBLICAR
    destino.save(update_fields=["estado", "updated_at"])

    try:
        media_urls = _media_urls(publicacao)
        post_id = ""

        if destino.plataforma == PlataformaSocial.FACEBOOK:
            page_id = destino.conta.external_id
            post_id = meta_svc.publicar_facebook(
                page_id,
                token,
                publicacao.texto,
                publicacao.link_url,
                media_urls=media_urls,
            )

        elif destino.plataforma == PlataformaSocial.INSTAGRAM:
            ig_id = destino.conta.metadata.get("ig_user_id") or destino.conta.external_id
            post_id = meta_svc.publicar_instagram(ig_id, token, publicacao.texto, media_urls)

        elif destino.plataforma == PlataformaSocial.LINKEDIN:
            org_urn = destino.conta.metadata.get("org_urn") or destino.conta.external_id
            media_url = media_urls[0] if media_urls else ""
            post_id = li_svc.publicar_linkedin(org_urn, token, publicacao.texto, media_url)

        destino.estado = EstadoDestino.PUBLICADO
        destino.external_post_id = post_id
        destino.erro = ""
        destino.publicado_em = timezone.now()
        destino.save(
            update_fields=["estado", "external_post_id", "erro", "publicado_em", "updated_at"]
        )
        _registar_log(
            publicacao,
            NivelLog.INFO,
            f"Publicado em {destino.get_plataforma_display()}",
            {"destino_id": destino.id, "external_post_id": post_id},
        )
    except (meta_svc.MetaAPIError, li_svc.LinkedInAPIError) as exc:
        destino.estado = EstadoDestino.FALHOU
        destino.erro = str(exc)[:2000]
        destino.save(update_fields=["estado", "erro", "updated_at"])
        _registar_log(
            publicacao,
            NivelLog.ERRO,
            f"Falha em {destino.get_plataforma_display()}: {exc}",
            {"destino_id": destino.id, "payload": getattr(exc, "payload", {})},
        )


def publicar_publicacao(publicacao: Publicacao) -> None:
    publicacao.estado = EstadoPublicacao.A_PUBLICAR
    publicacao.save(update_fields=["estado", "updated_at"])

    destinos = list(publicacao.destinos.select_related("conta").all())
    if not destinos:
        publicacao.estado = EstadoPublicacao.FALHOU
        publicacao.save(update_fields=["estado", "updated_at"])
        _registar_log(publicacao, NivelLog.ERRO, "Nenhum destino configurado")
        return

    for destino in destinos:
        if destino.estado not in (EstadoDestino.PUBLICADO, EstadoDestino.CANCELADO):
            publicar_destino(destino)

    publicacao.refresh_from_db()
    destinos_atualizados = list(publicacao.destinos.all())
    publicados = sum(1 for d in destinos_atualizados if d.estado == EstadoDestino.PUBLICADO)
    falhados = sum(1 for d in destinos_atualizados if d.estado == EstadoDestino.FALHOU)

    if publicados == len(destinos_atualizados):
        publicacao.estado = EstadoPublicacao.PUBLICADO
        publicacao.publicado_em = timezone.now()
    elif publicados > 0:
        publicacao.estado = EstadoPublicacao.PARCIAL
        publicacao.publicado_em = timezone.now()
    else:
        publicacao.estado = EstadoPublicacao.FALHOU

    publicacao.save(update_fields=["estado", "publicado_em", "updated_at"])
