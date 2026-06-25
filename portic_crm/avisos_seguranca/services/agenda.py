from collections import defaultdict

from django.utils import timezone

from portic_crm.dashboard.models import Evento


def proximos_eventos_por_dia(user=None):
    """Eventos futuros ou em curso do dashboard, agrupados por dia (YYYY-MM-DD).

    Eventos de vários dias que já começaram mas ainda não terminaram (em curso)
    são agrupados sob o dia de hoje, e não sob o dia de início já passado.
    """
    eventos = Evento.proximos_eventos(user)
    hoje = timezone.localdate()
    por_dia: dict[str, list] = defaultdict(list)
    for evento in eventos:
        dia_inicio = timezone.localtime(evento.data_inicio).date()
        dia = max(dia_inicio, hoje)
        por_dia[dia.isoformat()].append(evento)
    return dict(sorted(por_dia.items()))


def serializar_evento_agenda(evento, request=None):
    tipo = evento.tipo
    return {
        "id": evento.pk,
        "titulo": evento.titulo,
        "tipo": tipo.nome if tipo else "",
        "tipoCor": tipo.cor if tipo else "#3B82F6",
        "dataInicio": evento.data_inicio.isoformat(),
        "dataFim": evento.data_fim.isoformat(),
        "descricao": evento.descricao,
        "emCurso": evento.data_inicio <= timezone.now(),
    }


def agenda_por_dia_payload(request):
    user = request.user if request and request.user.is_authenticated else None
    por_dia = proximos_eventos_por_dia(user)
    return {
        dia: [serializar_evento_agenda(e, request) for e in eventos]
        for dia, eventos in por_dia.items()
    }
