from django.contrib.contenttypes.models import ContentType
from django.db.models import OuterRef, Subquery
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone

from portic_crm.core.models import HistoricoEntrada
from portic_crm.empresas.models import Empresa
from portic_crm.projetos.models import Objetivo


def queryset_com_ultima_interacao(qs):
    ct = ContentType.objects.get_for_model(Empresa)

    ultima_historico = (
        HistoricoEntrada.objects.filter(
            content_type=ct,
            object_id=OuterRef("pk"),
        )
        .annotate(efetiva=Coalesce("data", TruncDate("created_at")))
        .order_by("-efetiva", "-created_at")
        .values("efetiva")[:1]
    )

    ultima_tarefa = (
        Objetivo.objects.filter(empresa_id=OuterRef("pk"))
        .order_by("-updated_at")
        .values("updated_at")[:1]
    )

    return qs.annotate(
        _ultima_historico=Subquery(ultima_historico),
        _ultima_tarefa=Subquery(ultima_tarefa),
    )


def calcular_ultima_interacao(empresa: Empresa):
    datas = [timezone.localtime(empresa.created_at).date()]

    historico = getattr(empresa, "_ultima_historico", None)
    if historico:
        datas.append(historico)

    tarefa = getattr(empresa, "_ultima_tarefa", None)
    if tarefa:
        datas.append(timezone.localtime(tarefa).date())

    return max(datas)
