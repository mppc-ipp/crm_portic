import datetime as dt
from zoneinfo import ZoneInfo

from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from portic_crm.core.audit import AcaoAuditoria, registar_auditoria
from portic_crm.core.permissions import is_admin_geral, is_gestor_teletrabalho, user_can_access_module
from portic_crm.teletrabalho.models import (
    TIPOS_PERIODO_MANHA,
    TIPOS_PERIODO_TARDE,
    RegistroTeletrabalho,
)
from portic_crm.teletrabalho.serializers import (
    RegistroTeletrabalhoCreateSerializer,
    serializar_registro,
)

LISBON = ZoneInfo("Europe/Lisbon")


def _pode_usar_teletrabalho(user) -> bool:
    return is_admin_geral(user) or user_can_access_module(user, "teletrabalho")


def _intervalo_dia_lisboa(dia: dt.date) -> tuple[dt.datetime, dt.datetime]:
    inicio = dt.datetime.combine(dia, dt.time.min, tzinfo=LISBON)
    fim = dt.datetime.combine(dia, dt.time.max, tzinfo=LISBON)
    return inicio, fim


def _aplicar_filtros_gestao(qs, request):
    dia_param = (request.query_params.get("dia") or "").strip()
    if dia_param:
        try:
            dia = dt.date.fromisoformat(dia_param)
        except ValueError:
            return qs.none()
        inicio, fim = _intervalo_dia_lisboa(dia)
        qs = qs.filter(created_at__gte=inicio, created_at__lte=fim)

    nome = (request.query_params.get("nome") or "").strip()
    if nome:
        qs = qs.filter(
            Q(utilizador__first_name__icontains=nome)
            | Q(utilizador__last_name__icontains=nome)
            | Q(utilizador__email__icontains=nome)
            | Q(utilizador__username__icontains=nome)
        )

    periodo = (request.query_params.get("periodo") or "").strip().lower()
    if periodo == "manha":
        qs = qs.filter(tipo__in=TIPOS_PERIODO_MANHA)
    elif periodo == "tarde":
        qs = qs.filter(tipo__in=TIPOS_PERIODO_TARDE)

    return qs


class RegistroTeletrabalhoCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not _pode_usar_teletrabalho(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)

        ser = RegistroTeletrabalhoCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        registro = RegistroTeletrabalho.objects.create(
            utilizador=request.user,
            tipo=data["tipo"],
            observacao=data.get("observacao", ""),
        )
        registar_auditoria(
            AcaoAuditoria.TELETRABALHO_REGISTO,
            f"Registou teletrabalho ({data['tipo']})",
            actor=request.user,
            alvo=registro,
        )
        return Response(serializar_registro(registro), status=status.HTTP_201_CREATED)


class MeusRegistosTeletrabalhoAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _pode_usar_teletrabalho(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)

        qs = RegistroTeletrabalho.objects.filter(utilizador=request.user).order_by("-created_at")
        return Response([serializar_registro(r) for r in qs[:200]])


class GestaoRegistosTeletrabalhoAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_gestor_teletrabalho(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)

        qs = (
            RegistroTeletrabalho.objects.select_related("utilizador")
            .order_by("-created_at")
        )
        qs = _aplicar_filtros_gestao(qs, request)
        return Response([serializar_registro(r, include_user=True) for r in qs[:500]])
