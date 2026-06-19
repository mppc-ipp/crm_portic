from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from portic_crm.core.models import HistoricoEntrada
from portic_crm.dashboard.models import Evento
from portic_crm.empresas.models import Empresa, TipoInteracao


def _formatar_data_hora(dt) -> str:
    return timezone.localtime(dt).strftime("%d/%m/%Y %H:%M")


def conteudo_interacao_evento(evento: Evento) -> str:
    linhas = [f"Evento «{evento.titulo}» ({evento.tipo.nome})"]
    linhas.append(f"{_formatar_data_hora(evento.data_inicio)} — {_formatar_data_hora(evento.data_fim)}")
    if evento.descricao.strip():
        linhas.append(evento.descricao.strip())
    return "\n".join(linhas)


def registar_interacao_empresa_evento(evento: Evento, user) -> HistoricoEntrada | None:
    if not evento.empresa_id:
        return None
    if not TipoInteracao.objects.filter(codigo="EVENTO", ativo=True).exists():
        return None
    ct = ContentType.objects.get_for_model(Empresa)
    interacao, _created = HistoricoEntrada.objects.update_or_create(
        evento=evento,
        defaults={
            "content_type": ct,
            "object_id": evento.empresa_id,
            "tipo": "EVENTO",
            "data": timezone.localdate(evento.data_inicio),
            "conteudo": conteudo_interacao_evento(evento),
            "registado_por": user,
        },
    )
    return interacao


def sincronizar_interacao_empresa_evento(evento: Evento, user=None) -> HistoricoEntrada | None:
    if not evento.empresa_id:
        try:
            evento.interacao_empresa.delete()
        except HistoricoEntrada.DoesNotExist:
            pass
        return None
    try:
        interacao = evento.interacao_empresa
    except HistoricoEntrada.DoesNotExist:
        if user is None:
            user = evento.criado_por
        return registar_interacao_empresa_evento(evento, user)
    ct = ContentType.objects.get_for_model(Empresa)
    interacao.content_type = ct
    interacao.object_id = evento.empresa_id
    interacao.tipo = "EVENTO"
    interacao.data = timezone.localdate(evento.data_inicio)
    interacao.conteudo = conteudo_interacao_evento(evento)
    interacao.save()
    return interacao
