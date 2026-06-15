import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from portic_crm.espacos.models import (
    AcaoTokenReserva,
    ConfiguracaoModulos,
    HistoricoReserva,
    ModuloEspaco,
    OcorrenciaReserva,
    PedidoReserva,
    Sala,
    StatusOcorrenciaReserva,
    StatusPedidoReserva,
    TokenReserva,
    Viatura,
    VisibilidadeRecurso,
)


def tem_conflito(sala=None, viatura=None, data_inicio=None, data_fim=None, excluir_id=None):
    if not data_inicio or not data_fim:
        return False
    qs = OcorrenciaReserva.objects.filter(
        status=StatusOcorrenciaReserva.APROVADA,
        data_inicio__lt=data_fim,
        data_fim__gt=data_inicio,
    )
    if excluir_id:
        qs = qs.exclude(pk=excluir_id)
    if sala:
        return qs.filter(sala=sala).exists()
    if viatura:
        return qs.filter(viatura=viatura).exists()
    return False


def user_pode_ver_recurso(user, visibilidade: str) -> bool:
    """Utilizadores externos só veem PUBLICO_GERAL (simplificado: não-IPP = comum)."""
    if user.is_superuser or user.groups.filter(name=settings.GRUPO_ADMIN_GERAL).exists():
        return True
    if visibilidade == VisibilidadeRecurso.PUBLICO_GERAL:
        return True
    email = (user.email or "").lower()
    return email.endswith("@ipp.pt") or email.endswith("@portic.local")


def criar_pedido_com_ocorrencias(user, criado_por, titulo, descricao, numero_pessoas, modulo, ocorrencias_data):
    pedido = PedidoReserva.objects.create(
        modulo=modulo,
        utilizador=user,
        criado_por=criado_por,
        titulo=titulo,
        descricao=descricao,
        numero_pessoas=numero_pessoas,
        status=StatusPedidoReserva.PENDENTE,
    )
    for occ in ocorrencias_data:
        sala_id = occ.get("salaId") or occ.get("sala_id")
        viatura_id = occ.get("viaturaId") or occ.get("viatura_id")
        inicio = occ.get("dataInicio") or occ.get("data_inicio")
        fim = occ.get("dataFim") or occ.get("data_fim")
        if isinstance(inicio, str):
            inicio = timezone.datetime.fromisoformat(inicio.replace("Z", "+00:00"))
        if isinstance(fim, str):
            fim = timezone.datetime.fromisoformat(fim.replace("Z", "+00:00"))
        if timezone.is_naive(inicio):
            inicio = timezone.make_aware(inicio)
        if timezone.is_naive(fim):
            fim = timezone.make_aware(fim)

        sala = None
        viatura = None
        if sala_id:
            sala = Sala.objects.get(pk=sala_id)
        if viatura_id:
            viatura = Viatura.objects.get(pk=viatura_id)

        OcorrenciaReserva.objects.create(
            pedido=pedido,
            sala=sala,
            viatura=viatura,
            data_inicio=inicio,
            data_fim=fim,
            status=StatusOcorrenciaReserva.PENDENTE,
        )

    HistoricoReserva.objects.create(
        pedido=pedido,
        utilizador_acao=criado_por,
        acao="CRIADO",
        descricao="Pedido de reserva criado",
    )
    _criar_tokens_email(pedido)
    from portic_crm.core.notifications import notificar_reserva_pendente

    notificar_reserva_pendente(pedido)
    return pedido


def _criar_tokens_email(pedido: PedidoReserva):
    expira = timezone.now() + timedelta(hours=24)
    for acao in (AcaoTokenReserva.APROVAR, AcaoTokenReserva.REJEITAR):
        TokenReserva.objects.create(
            pedido=pedido,
            token=secrets.token_urlsafe(32),
            acao=acao,
            expira_em=expira,
        )
    _enviar_email_pedido(pedido)


def _enviar_email_pedido(pedido: PedidoReserva):
    tokens = {t.acao: t.token for t in pedido.tokens.filter(usado=False)}
    api_base = getattr(settings, "API_PUBLIC_URL", "http://localhost:8002")
    web_base = getattr(settings, "WEB_URL", "http://localhost:3002")
    prefix = "/api/viaturas" if pedido.modulo == ModuloEspaco.VIATURA else "/api"
    horarios = "".join(
        f"<li>{o.data_inicio} — {o.data_fim}</li>" for o in pedido.ocorrencias.all()
    )
    html = (
        f"<h2>Novo pedido de reserva</h2>"
        f"<p>{pedido.utilizador.username}</p>"
        f"<p>{pedido.titulo}</p><ul>{horarios}</ul>"
        f"<p><a href='{api_base}{prefix}/reservas/aprovar?token={tokens.get('APROVAR','')}'>Aprovar</a> | "
        f"<a href='{api_base}{prefix}/reservas/rejeitar?token={tokens.get('REJEITAR','')}'>Rejeitar</a></p>"
        f"<p><a href='{web_base}/admin/reservas/{pedido.id}'>Painel</a></p>"
    )
    send_mail(
        subject=f"[Portic] Novo pedido: {pedido.titulo}",
        message=pedido.descricao,
        from_email=None,
        recipient_list=[getattr(settings, "RESERVA_ADMIN_EMAIL", "admin@portic.local")],
        html_message=html,
        fail_silently=True,
    )


def aprovar_pedido(pedido: PedidoReserva, user):
    for o in pedido.ocorrencias.all():
        if tem_conflito(
            sala=o.sala,
            viatura=o.viatura,
            data_inicio=o.data_inicio,
            data_fim=o.data_fim,
            excluir_id=o.pk,
        ):
            raise ValueError("Conflito de horário detectado")
        o.status = StatusOcorrenciaReserva.APROVADA
        o.save()
    pedido.status = StatusPedidoReserva.APROVADO
    pedido.save()
    HistoricoReserva.objects.create(
        pedido=pedido,
        utilizador_acao=user,
        acao="APROVADO",
        descricao="Pedido aprovado",
    )


def rejeitar_pedido(pedido: PedidoReserva, user, observacao=""):
    pedido.status = StatusPedidoReserva.REJEITADO
    if observacao:
        pedido.observacao_admin = observacao
    pedido.save()
    pedido.ocorrencias.update(status=StatusOcorrenciaReserva.REJEITADA)
    HistoricoReserva.objects.create(
        pedido=pedido,
        utilizador_acao=user,
        acao="REJEITADO",
        descricao=observacao or "Pedido rejeitado",
    )


def cancelar_pedido(pedido: PedidoReserva, user):
    pedido.status = StatusPedidoReserva.CANCELADO
    pedido.save()
    pedido.ocorrencias.update(status=StatusOcorrenciaReserva.CANCELADA)
    HistoricoReserva.objects.create(
        pedido=pedido,
        utilizador_acao=user,
        acao="CANCELADO",
        descricao="Pedido cancelado",
    )


def processar_token(acao: str, token_str: str):
    token = TokenReserva.objects.select_related("pedido").get(
        token=token_str, acao=acao, usado=False, expira_em__gte=timezone.now()
    )
    pedido = token.pedido
    if acao == AcaoTokenReserva.APROVAR:
        aprovar_pedido(pedido, pedido.criado_por)
    else:
        rejeitar_pedido(pedido, pedido.criado_por)
    token.usado = True
    token.save()
    TokenReserva.objects.filter(pedido=pedido, acao=acao).update(usado=True)
    return pedido


def eventos_calendario(sala=None, viatura=None, inicio=None, fim=None, user=None):
    qs = OcorrenciaReserva.objects.filter(
        data_inicio__lt=fim,
        data_fim__gt=inicio,
    ).select_related("pedido", "sala", "viatura")
    if sala:
        qs = qs.filter(sala=sala)
    if viatura:
        qs = qs.filter(viatura=viatura)

    eventos = []
    for o in qs:
        if o.status == StatusOcorrenciaReserva.APROVADA:
            titulo = o.pedido.titulo
        elif user and o.pedido.utilizador_id == user.id:
            titulo = o.pedido.titulo + " (pendente)"
        else:
            titulo = "Ocupado"
        sid = str(o.sala_id) if o.sala_id else str(o.viatura_id)
        eventos.append(
            {
                "id": str(o.id),
                "salaId": sid,
                "dataInicio": o.data_inicio.isoformat(),
                "dataFim": o.data_fim.isoformat(),
                "status": o.status,
                "title": titulo,
                "editable": False,
                "pedidoReservaId": str(o.pedido_id),
            }
        )
    return eventos


def get_config_modulos():
    return ConfiguracaoModulos.get_solo()
