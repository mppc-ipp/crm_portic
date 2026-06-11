from datetime import timedelta

from django.db.models import Count
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from portic_crm.core.export import csv_response
from portic_crm.core.permissions import is_admin_geral, user_can_access_module
from portic_crm.dashboard.models import Evento
from portic_crm.empresas.models import Empresa
from portic_crm.espacos.models import ModuloEspaco, PedidoReserva, StatusPedidoReserva
from portic_crm.projetos.models import EstadoObjetivo, Objetivo
from portic_crm.startups.models import Candidatura, ContratoResidencia, Edicao, Startup, StatusCandidatura


class DashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not (is_admin_geral(user) or user_can_access_module(user, "dashboard")):
            return Response({"error": "Sem permissão"}, status=403)

        hoje = timezone.now().date()
        limite = hoje + timedelta(days=90)
        payload: dict = {}

        if is_admin_geral(user) or user_can_access_module(user, "startups"):
            payload["startups_por_ano"] = list(
                Startup.objects.values("edicao__ano", "edicao__nome")
                .annotate(total=Count("id"))
                .order_by("-edicao__ano")
            )
            payload["candidaturas_em_curso"] = Candidatura.objects.exclude(
                estado__in=["APROVADA", "REJEITADA"]
            ).count()
            payload["candidaturas_por_estado"] = list(
                Candidatura.objects.values("estado").annotate(total=Count("id")).order_by("estado")
            )
            payload["contratos_a_expirar"] = [
                {
                    "id": c.pk,
                    "startup": c.startup.nome,
                    "data_fim": c.data_fim.isoformat(),
                }
                for c in ContratoResidencia.objects.filter(
                    ativo=True,
                    data_fim__lte=limite,
                    data_fim__gte=hoje,
                ).select_related("startup")[:10]
            ]
            payload["edicoes_ativas"] = list(
                Edicao.objects.filter(ativa=True).values("id", "ano", "nome")
            )

        if is_admin_geral(user) or user_can_access_module(user, "empresas"):
            payload["empresas_por_tipo"] = list(
                Empresa.objects.values("tipo").annotate(total=Count("id")).order_by("tipo")
            )
            payload["empresas_por_estado"] = list(
                Empresa.objects.values("estado").annotate(total=Count("id")).order_by("estado")
            )
            payload["total_empresas"] = Empresa.objects.count()

        if is_admin_geral(user) or user_can_access_module(user, "projetos"):
            payload["tarefas_atrasadas"] = Objetivo.objects.filter(
                data_limite__lt=hoje,
            ).exclude(estado=EstadoObjetivo.CONCLUIDO).count()

        if is_admin_geral(user) or user.has_perm("espacos.aprovar_reserva"):
            payload["reservas_pendentes"] = {
                "salas": PedidoReserva.objects.filter(
                    modulo=ModuloEspaco.SALA, status=StatusPedidoReserva.PENDENTE
                ).count(),
                "viaturas": PedidoReserva.objects.filter(
                    modulo=ModuloEspaco.VIATURA, status=StatusPedidoReserva.PENDENTE
                ).count(),
            }

        payload["proximos_eventos"] = [
            {
                "id": e.pk,
                "titulo": e.titulo,
                "tipo": e.tipo,
                "data_inicio": e.data_inicio.isoformat(),
                "data_fim": e.data_fim.isoformat(),
            }
            for e in Evento.objects.filter(data_inicio__gte=timezone.now()).order_by("data_inicio")[:10]
        ]

        if request.query_params.get("format") == "csv":
            rows = []
            for key, val in payload.items():
                if isinstance(val, (int, float, str, bool)) or val is None:
                    rows.append({"metrica": key, "valor": val})
                elif isinstance(val, list):
                    rows.append({"metrica": key, "valor": len(val)})
                elif isinstance(val, dict):
                    for k, v in val.items():
                        rows.append({"metrica": f"{key}.{k}", "valor": v})
            return csv_response(
                "dashboard_resumo.csv",
                [("metrica", "Métrica"), ("valor", "Valor")],
                rows,
            )

        return Response(payload)
