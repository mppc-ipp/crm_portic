"""Criação e sincronização de notificações por utilizador."""

from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.db.models import Q
from django.utils import timezone

from portic_crm.core.models import Notificacao, TipoNotificacao

User = get_user_model()


def _users_with_perm(perm: str):
    try:
        app_label, codename = perm.split(".", 1)
    except ValueError:
        return User.objects.none()
    perm_obj = Permission.objects.filter(
        content_type__app_label=app_label, codename=codename
    ).first()
    if not perm_obj:
        return User.objects.none()
    return User.objects.filter(
        Q(user_permissions=perm_obj) | Q(groups__permissions=perm_obj),
        is_active=True,
    ).distinct()


def _users_admin_geral():
    from django.conf import settings

    return User.objects.filter(
        Q(groups__name=settings.GRUPO_ADMIN_GERAL) | Q(is_superuser=True),
        is_active=True,
    ).distinct()


def criar_notificacao(
    utilizador,
    tipo: str,
    titulo: str,
    mensagem: str = "",
    url: str = "",
    metadata: dict | None = None,
    dedupe_key: str | None = None,
) -> Notificacao | None:
    if not utilizador or not getattr(utilizador, "is_active", True):
        return None
    if dedupe_key:
        exists = Notificacao.objects.filter(
            utilizador=utilizador,
            tipo=tipo,
            metadata__dedupe_key=dedupe_key,
            lida=False,
        ).exists()
        if exists:
            return None
    meta = dict(metadata or {})
    if dedupe_key:
        meta["dedupe_key"] = dedupe_key
    return Notificacao.objects.create(
        utilizador=utilizador,
        tipo=tipo,
        titulo=titulo[:255],
        mensagem=mensagem,
        url=url[:500],
        metadata=meta,
    )


def notificar_permissao(perm: str, tipo: str, titulo: str, mensagem: str = "", url: str = "", dedupe_key: str | None = None):
    ids = set(_users_with_perm(perm).values_list("pk", flat=True))
    ids.update(_users_admin_geral().values_list("pk", flat=True))
    for user in User.objects.filter(pk__in=ids, is_active=True):
        criar_notificacao(user, tipo, titulo, mensagem, url, dedupe_key=dedupe_key)


def notificar_candidatura_nova(candidatura):
    rotulo = str(candidatura)[:120]
    url = f"/startups/candidaturas/{candidatura.pk}"
    notificar_permissao(
        "startups.ver_candidaturas",
        TipoNotificacao.CANDIDATURA_NOVA,
        "Nova candidatura recebida",
        rotulo,
        url,
        dedupe_key=f"cand_nova_{candidatura.pk}",
    )


def notificar_reserva_pendente(pedido):
    modulo = pedido.get_modulo_display() if hasattr(pedido, "get_modulo_display") else pedido.modulo
    path = "/admin/reservas" if pedido.modulo == "SALA" else "/viaturas/admin/reservas"
    notificar_permissao(
        "espacos.aprovar_reserva",
        TipoNotificacao.RESERVA_PENDENTE,
        f"Reserva pendente ({modulo})",
        pedido.titulo,
        path,
        dedupe_key=f"reserva_pend_{pedido.pk}",
    )


def sincronizar_notificacoes_sistema(user):
    """Gera notificações derivadas de consultas (contratos, tarefas, eventos)."""
    from portic_crm.core.permissions import is_admin_geral, user_can_access_module
    from portic_crm.dashboard.models import Evento
    from portic_crm.projetos.models import EstadoObjetivo, Objetivo
    from portic_crm.startups.models import ContratoResidencia

    hoje = timezone.now().date()
    limite = hoje + timedelta(days=90)

    if is_admin_geral(user) or user.has_perm("startups.view_startup"):
        for contrato in ContratoResidencia.objects.filter(
            ativo=True,
            data_fim__lte=limite,
            data_fim__gte=hoje,
        ).select_related("startup")[:20]:
            criar_notificacao(
                user,
                TipoNotificacao.CONTRATO_EXPIRAR,
                f"Contrato a expirar — {contrato.startup.nome}",
                f"Termina em {contrato.data_fim.strftime('%d/%m/%Y')}",
                "/startups",
                dedupe_key=f"contrato_{contrato.pk}",
            )

    if user_can_access_module(user, "projetos"):
        for obj in Objetivo.objects.filter(
            data_limite__isnull=False,
            data_limite__lte=hoje + timedelta(days=7),
            data_limite__gte=hoje - timedelta(days=1),
        ).exclude(estado=EstadoObjetivo.CONCLUIDO).select_related("secao__projeto")[:30]:
            if obj.responsavel_id == user.id or obj.responsavel_email.lower() == (user.email or "").lower():
                criar_notificacao(
                    user,
                    TipoNotificacao.TAREFA_PRAZO,
                    f"Prazo próximo — {obj.titulo}",
                    obj.secao.projeto.nome,
                    "/projetos",
                    dedupe_key=f"tarefa_{obj.pk}",
                )

    if user_can_access_module(user, "dashboard"):
        for ev in Evento.objects.filter(
            data_inicio__gte=timezone.now(),
            data_inicio__lte=timezone.now() + timedelta(days=14),
        )[:10]:
            criar_notificacao(
                user,
                TipoNotificacao.EVENTO_PROXIMO,
                f"Evento — {ev.titulo}",
                ev.data_inicio.strftime("%d/%m/%Y %H:%M"),
                "/dashboard",
                dedupe_key=f"evento_{ev.pk}",
            )
