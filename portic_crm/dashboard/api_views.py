from datetime import timedelta

from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from portic_crm.core.audit import AcaoAuditoria, registar_auditoria
from portic_crm.core.export import csv_response
from portic_crm.core.permissions import is_admin_geral, user_can_access_module
from portic_crm.dashboard.models import AnexoEvento, Evento, TipoEvento
from portic_crm.dashboard.serializers import (
    AnexoEventoSerializer,
    EventoSerializer,
    TipoEventoSerializer,
    evento_para_calendario,
    validar_ficheiro_anexo,
)
from portic_crm.dashboard.services.empresa_interacao import (
    registar_interacao_empresa_evento,
    sincronizar_interacao_empresa_evento,
)
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
            from portic_crm.projetos.services import queryset_projetos_visiveis

            payload["tarefas_atrasadas"] = (
                Objetivo.objects.filter(
                    secao__projeto__in=queryset_projetos_visiveis(user),
                    data_limite__lt=hoje,
                )
                .exclude(estado=EstadoObjetivo.CONCLUIDO)
                .count()
            )

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
                "tipo": e.tipo.nome,
                "data_inicio": e.data_inicio.isoformat(),
                "data_fim": e.data_fim.isoformat(),
            }
            for e in Evento.proximos_eventos(user)[:10]
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
                actor=request.user,
                modulo="dashboard",
            )

        return Response(payload)


def _pode_ver_eventos(user) -> bool:
    return is_admin_geral(user) or user.has_perm("dashboard.view_dashboard")


def _pode_gerir_eventos(user) -> bool:
    return is_admin_geral(user) or user.has_perm("dashboard.gerir_eventos")


def _evento_passado(evento: Evento) -> bool:
    return evento.data_fim < timezone.now()


class EventoViewSet(viewsets.ModelViewSet):
    serializer_class = EventoSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    pagination_class = None

    def get_queryset(self):
        if not _pode_ver_eventos(self.request.user):
            return Evento.objects.none()

        qs = Evento.filtrar_visiveis_para(
            Evento.objects.select_related("tipo").prefetch_related("anexos"),
            self.request.user,
        )
        periodo = self.request.query_params.get("periodo", "todos")
        agora = timezone.now()

        if periodo == "futuros":
            qs = qs.filter(data_fim__gte=agora)
        elif periodo == "passados":
            qs = qs.filter(data_fim__lt=agora).order_by("-data_inicio")
            return qs

        inicio = parse_datetime(self.request.query_params.get("inicio", ""))
        fim = parse_datetime(self.request.query_params.get("fim", ""))
        if inicio and fim:
            qs = qs.filter(data_inicio__lt=fim, data_fim__gt=inicio)

        tipo = self.request.query_params.get("tipo")
        if tipo:
            qs = qs.filter(tipo_id=tipo)

        formato = self.request.query_params.get("formato")
        if formato == "calendario":
            return qs.order_by("data_inicio")

        return qs.order_by("data_inicio")

    def list(self, request, *args, **kwargs):
        if not _pode_ver_eventos(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)

        if request.query_params.get("formato") == "calendario":
            qs = self.filter_queryset(self.get_queryset())
            return Response([evento_para_calendario(e, request.user) for e in qs])

        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if not _pode_gerir_eventos(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            evento = Evento.objects.select_related("tipo", "empresa").get(pk=response.data["id"])
            registar_interacao_empresa_evento(evento, request.user)
            registar_auditoria(
                AcaoAuditoria.EVENTO_CRIADO,
                f"Criou evento «{evento.titulo}»",
                actor=request.user,
                alvo=evento,
            )
        return response

    def update(self, request, *args, **kwargs):
        if not _pode_gerir_eventos(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        evento = self.get_object()
        if _evento_passado(evento) and not is_admin_geral(request.user):
            return Response(
                {"error": "Eventos passados não podem ser editados."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        response = super().update(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            evento = Evento.objects.select_related("tipo", "empresa").get(pk=evento.pk)
            sincronizar_interacao_empresa_evento(evento, request.user)
            registar_auditoria(
                AcaoAuditoria.EVENTO_EDITADO,
                f"Editou evento «{evento.titulo}»",
                actor=request.user,
                alvo=evento,
            )
        return response

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not _pode_gerir_eventos(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        evento = self.get_object()
        if _evento_passado(evento) and not is_admin_geral(request.user):
            return Response(
                {"error": "Eventos passados não podem ser eliminados."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        titulo = evento.titulo
        for anexo in evento.anexos.all():
            anexo.ficheiro.delete(save=False)
        registar_auditoria(
            AcaoAuditoria.EVENTO_REMOVIDO,
            f"Removeu evento «{titulo}»",
            actor=request.user,
            alvo=evento,
        )
        return super().destroy(request, *args, **kwargs)


class AnexoEventoAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, evento_pk):
        evento = get_object_or_404(
            Evento.filtrar_visiveis_para(Evento.objects.all(), request.user),
            pk=evento_pk,
        )
        if not _pode_gerir_eventos(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        if _evento_passado(evento) and not is_admin_geral(request.user):
            return Response(
                {"error": "Não é possível anexar ficheiros a eventos passados."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ficheiro = request.FILES.get("ficheiro")
        if not ficheiro:
            return Response({"error": "Ficheiro obrigatório."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validar_ficheiro_anexo(ficheiro)
        except ValidationError as exc:
            detail = exc.detail
            if isinstance(detail, list):
                detail = detail[0]
            return Response({"error": str(detail)}, status=status.HTTP_400_BAD_REQUEST)

        anexo = AnexoEvento.objects.create(
            evento=evento,
            ficheiro=ficheiro,
            nome_original=ficheiro.name,
            tamanho=ficheiro.size,
            tipo_mime=ficheiro.content_type or "",
            carregado_por=request.user,
        )
        registar_auditoria(
            AcaoAuditoria.EVENTO_ANEXO_ADICIONADO,
            f"Anexou «{anexo.nome_original}» ao evento «{evento.titulo}»",
            actor=request.user,
            alvo=evento,
        )
        return Response(
            AnexoEventoSerializer(anexo, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, evento_pk, pk):
        evento = get_object_or_404(
            Evento.filtrar_visiveis_para(Evento.objects.all(), request.user),
            pk=evento_pk,
        )
        if not _pode_gerir_eventos(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        if _evento_passado(evento) and not is_admin_geral(request.user):
            return Response(
                {"error": "Não é possível remover anexos de eventos passados."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        anexo = get_object_or_404(AnexoEvento, pk=pk, evento=evento)
        nome = anexo.nome_original
        anexo.ficheiro.delete(save=False)
        anexo.delete()
        registar_auditoria(
            AcaoAuditoria.EVENTO_ANEXO_REMOVIDO,
            f"Removeu anexo «{nome}» do evento «{evento.titulo}»",
            actor=request.user,
            alvo=evento,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


def _pode_configurar_tipos_evento(user) -> bool:
    return is_admin_geral(user) or user.has_perm("administrador.gerir_utilizadores")


class TipoEventoViewSet(viewsets.ModelViewSet):
    serializer_class = TipoEventoSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if not (_pode_ver_eventos(user) or _pode_configurar_tipos_evento(user)):
            return TipoEvento.objects.none()
        qs = TipoEvento.objects.all()
        if not _pode_configurar_tipos_evento(user):
            qs = qs.filter(ativo=True)
        elif self.request.query_params.get("ativos") == "1":
            qs = qs.filter(ativo=True)
        return qs

    def create(self, request, *args, **kwargs):
        if not _pode_configurar_tipos_evento(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        nome = (request.data.get("nome") or "").strip()
        if not nome:
            return Response({"error": "Nome obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
        cor = (request.data.get("cor") or "#3B82F6").strip()
        ordem = request.data.get("ordem", 0)
        try:
            ordem = int(ordem)
        except (TypeError, ValueError):
            ordem = 0
        tipo = TipoEvento.objects.create(
            codigo=TipoEvento.gerar_codigo(nome),
            nome=nome,
            cor=cor,
            ordem=ordem,
            ativo=True,
        )
        registar_auditoria(
            AcaoAuditoria.TIPO_EVENTO_CRIADO,
            f"Criou tipo de evento «{tipo.nome}»",
            actor=request.user,
            alvo=tipo,
        )
        return Response(TipoEventoSerializer(tipo).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        if not _pode_configurar_tipos_evento(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        instance = self.get_object()
        nome = request.data.get("nome")
        if nome is not None:
            nome = nome.strip()
            if not nome:
                return Response({"error": "Nome obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
            instance.nome = nome
        if "cor" in request.data:
            instance.cor = (request.data["cor"] or "#3B82F6").strip()
        if "ordem" in request.data:
            try:
                instance.ordem = int(request.data["ordem"])
            except (TypeError, ValueError):
                pass
        if "ativo" in request.data:
            instance.ativo = bool(request.data["ativo"])
        instance.save()
        registar_auditoria(
            AcaoAuditoria.TIPO_EVENTO_EDITADO,
            f"Editou tipo de evento «{instance.nome}» (ativo={instance.ativo})",
            actor=request.user,
            alvo=instance,
        )
        return Response(TipoEventoSerializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        if not _pode_configurar_tipos_evento(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        instance = self.get_object()
        if Evento.objects.filter(tipo=instance).exists():
            instance.ativo = False
            instance.save(update_fields=["ativo", "updated_at"])
            registar_auditoria(
                AcaoAuditoria.TIPO_EVENTO_REMOVIDO,
                f"Desactivou tipo de evento «{instance.nome}» (em uso)",
                actor=request.user,
                alvo=instance,
            )
            return Response(
                {"detail": "Tipo desativado porque já está associado a eventos."},
                status=status.HTTP_200_OK,
            )
        nome = instance.nome
        registar_auditoria(
            AcaoAuditoria.TIPO_EVENTO_REMOVIDO,
            f"Removeu tipo de evento «{nome}»",
            actor=request.user,
            alvo=instance,
        )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
