from __future__ import annotations

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from portic_crm.marketing.models import ContaSocial, EstadoPublicacao, PlataformaSocial, Publicacao
from portic_crm.marketing.services import meta as meta_svc
from portic_crm.marketing.services.publisher import publicar_publicacao
from portic_crm.marketing.services.tokens import desencriptar_token, encriptar_token

logger = logging.getLogger(__name__)


@shared_task(name="portic_crm.marketing.tasks.publicar_agendados")
def publicar_agendados():
    agora = timezone.now()
    publicacoes = Publicacao.objects.filter(
        estado=EstadoPublicacao.AGENDADO,
        agendado_para__lte=agora,
    ).prefetch_related("destinos", "midias")

    for publicacao in publicacoes:
        try:
            publicar_publicacao(publicacao)
        except Exception:
            logger.exception("Erro ao publicar publicação %s", publicacao.pk)
            publicacao.estado = EstadoPublicacao.FALHOU
            publicacao.save(update_fields=["estado", "updated_at"])


@shared_task(name="portic_crm.marketing.tasks.renovar_tokens_meta")
def renovar_tokens_meta():
    limite = timezone.now() + timedelta(days=7)
    contas = ContaSocial.objects.filter(
        ativa=True,
        plataforma__in=[PlataformaSocial.FACEBOOK, PlataformaSocial.INSTAGRAM],
        token_expira_em__lte=limite,
    )
    for conta in contas:
        token = desencriptar_token(conta.access_token)
        if not token:
            continue
        try:
            data = meta_svc.token_longa_duracao(token)
            conta.access_token = encriptar_token(data["access_token"])
            expires_in = data.get("expires_in")
            if expires_in:
                conta.token_expira_em = timezone.now() + timedelta(seconds=int(expires_in))
            conta.save(update_fields=["access_token", "token_expira_em", "updated_at"])
        except Exception:
            logger.exception("Falha ao renovar token Meta conta %s", conta.pk)


@shared_task(name="portic_crm.marketing.tasks.renovar_tokens_linkedin")
def renovar_tokens_linkedin():
    limite = timezone.now() + timedelta(days=7)
    contas = ContaSocial.objects.filter(
        ativa=True,
        plataforma=PlataformaSocial.LINKEDIN,
        token_expira_em__lte=limite,
    )
    for conta in contas:
        logger.warning(
            "Token LinkedIn da conta %s expira em breve — requer re-autenticação manual",
            conta.pk,
        )
