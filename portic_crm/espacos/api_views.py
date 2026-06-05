from datetime import datetime

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from portic_crm.core.permissions import is_admin_geral
from portic_crm.espacos.models import (
    AcaoTokenReserva,
    AuditoriaEspacos,
    Localizacao,
    ModuloEspaco,
    PedidoReserva,
    Sala,
    StatusPedidoReserva,
    Unidade,
    Viatura,
)
from portic_crm.espacos.serializers import (
    ConfigModulosSerializer,
    LocalizacaoSerializer,
    PedidoCreateSerializer,
    PedidoReservaSerializer,
    SalaSerializer,
    ViaturaSerializer,
    pedido_frontend,
)
from portic_crm.espacos.services import reservas as svc


class ConfigModulosAPIView(APIView):
    permission_classes = []

    def get(self, request):
        cfg = svc.get_config_modulos()
        return Response(ConfigModulosSerializer(cfg).data)


class SalaListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Sala.objects.filter(ativo=True).select_related("unidade")
        salas = [s for s in qs if svc.user_pode_ver_recurso(request.user, s.visibilidade)]
        return Response(SalaSerializer(salas, many=True, context={"request": request}).data)


class SalaDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        sala = get_object_or_404(Sala, pk=pk, ativo=True)
        if not svc.user_pode_ver_recurso(request.user, sala.visibilidade):
            return Response({"error": "Sem acesso"}, status=403)
        return Response(SalaSerializer(sala, context={"request": request}).data)


class ViaturaListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not svc.get_config_modulos().modulo_viaturas_ativo:
            return Response([])
        qs = Viatura.objects.filter(ativo=True).select_related("unidade")
        items = [v for v in qs if svc.user_pode_ver_recurso(request.user, v.visibilidade)]
        return Response(ViaturaSerializer(items, many=True, context={"request": request}).data)


class ViaturaDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        viatura = get_object_or_404(Viatura, pk=pk, ativo=True)
        if not svc.user_pode_ver_recurso(request.user, viatura.visibilidade):
            return Response({"error": "Sem acesso"}, status=403)
        return Response(ViaturaSerializer(viatura, context={"request": request}).data)


class CalendarioAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sala_id = request.query_params.get("salaId") or request.query_params.get("sala_id")
        viatura_id = request.query_params.get("viaturaId") or request.query_params.get("viatura_id")
        inicio = parse_datetime(request.query_params.get("inicio", ""))
        fim = parse_datetime(request.query_params.get("fim", ""))
        if not inicio or not fim:
            return Response({"error": "inicio e fim obrigatórios"}, status=400)
        sala = Sala.objects.filter(pk=sala_id).first() if sala_id else None
        viatura = Viatura.objects.filter(pk=viatura_id).first() if viatura_id else None
        return Response(
            svc.eventos_calendario(sala=sala, viatura=viatura, inicio=inicio, fim=fim, user=request.user)
        )


class MinhasReservasAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pedidos = (
            PedidoReserva.objects.filter(utilizador=request.user)
            .prefetch_related("ocorrencias__sala")
            .order_by("-created_at")
        )
        return Response([pedido_frontend(p) for p in pedidos])


class ReservaCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payload = dict(request.data)
        if "/viaturas/" in request.path or request.path.rstrip("/").endswith("viaturas/reservas"):
            payload.setdefault("modulo", ModuloEspaco.VIATURA)
        else:
            payload.setdefault("modulo", ModuloEspaco.SALA)
        ser = PedidoCreateSerializer(data=payload)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        try:
            pedido = svc.criar_pedido_com_ocorrencias(
                user=request.user,
                criado_por=request.user,
                titulo=data["titulo"],
                descricao=data["descricao"],
                numero_pessoas=data["numero_pessoas"],
                modulo=data["modulo"],
                ocorrencias_data=data["ocorrencias"],
            )
        except Exception as e:
            return Response({"error": str(e)}, status=400)
        return Response(PedidoReservaSerializer(pedido).data, status=201)


class ReservaDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        pedido = get_object_or_404(PedidoReserva, pk=pk)
        if pedido.utilizador_id != request.user.id and not is_admin_geral(request.user):
            if not request.user.has_perm("espacos.aprovar_reserva"):
                return Response(status=403)
        return Response(PedidoReservaSerializer(pedido).data)


class ReservaCancelarAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        pedido = get_object_or_404(PedidoReserva, pk=pk, utilizador=request.user)
        primeira = pedido.ocorrencias.order_by("data_inicio").first()
        if primeira and primeira.data_inicio - timezone.now() < timezone.timedelta(hours=24):
            return Response({"error": "Cancelamento só até 24h antes"}, status=400)
        svc.cancelar_pedido(pedido, request.user)
        return Response(PedidoReservaSerializer(pedido).data)


class ReservaTokenAPIView(APIView):
    permission_classes = []

    def get(self, request, acao):
        token = request.query_params.get("token", "")
        acao_map = {"aprovar": AcaoTokenReserva.APROVAR, "rejeitar": AcaoTokenReserva.REJEITAR}
        try:
            svc.processar_token(acao_map[acao], token)
            return HttpResponse(f"<h1>Pedido {acao} com sucesso</h1>", content_type="text/html")
        except Exception as e:
            return HttpResponse(f"<h1>Erro: {e}</h1>", status=400, content_type="text/html")


class AdminReservasListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (is_admin_geral(request.user) or request.user.has_perm("espacos.aprovar_reserva")):
            return Response(status=403)
        status_filter = request.query_params.get("status", "PENDENTE")
        qs = PedidoReserva.objects.prefetch_related("ocorrencias__sala", "utilizador")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response([pedido_frontend(p, include_user=True) for p in qs.order_by("-created_at")[:100]])


def _admin_ok(user):
    return is_admin_geral(user) or user.has_perm("espacos.aprovar_reserva")


class AdminUnidadesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _admin_ok(request.user):
            return Response(status=403)
        qs = Unidade.objects.filter(ativo=True).order_by("nome")
        return Response([{"id": str(u.id), "nome": u.nome, "ativo": u.ativo} for u in qs])


class AdminSalasListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _admin_ok(request.user):
            return Response(status=403)
        qs = Sala.objects.filter(ativo=True).select_related("unidade").order_by("nome")
        return Response(SalaSerializer(qs, many=True, context={"request": request}).data)


class AdminSalaDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        if not _admin_ok(request.user):
            return Response(status=403)
        sala = get_object_or_404(Sala, pk=pk)
        sala.ativo = False
        sala.save(update_fields=["ativo"])
        return Response(status=204)


class AdminLocalizacoesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _admin_ok(request.user):
            return Response(status=403)
        unidade_id = request.query_params.get("unidadeId")
        qs = Localizacao.objects.filter(modulo=ModuloEspaco.SALA)
        if unidade_id:
            qs = qs.filter(unidade_id=unidade_id)
        return Response(LocalizacaoSerializer(qs.order_by("-ativo", "nome"), many=True).data)

    def post(self, request):
        if not _admin_ok(request.user):
            return Response(status=403)
        unidade_id = request.data.get("unidadeId")
        nome = request.data.get("nome", "").strip()
        if not unidade_id or not nome:
            return Response({"error": "unidadeId e nome obrigatórios"}, status=400)
        loc = Localizacao.objects.create(
            unidade_id=unidade_id,
            nome=nome,
            modulo=ModuloEspaco.SALA,
            ativo=True,
        )
        return Response(LocalizacaoSerializer(loc).data, status=201)


class AdminLocalizacaoDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        if not _admin_ok(request.user):
            return Response(status=403)
        loc = get_object_or_404(Localizacao, pk=pk)
        loc.ativo = False
        loc.save(update_fields=["ativo"])
        return Response(status=204)

    def patch(self, request, pk):
        if not _admin_ok(request.user):
            return Response(status=403)
        loc = get_object_or_404(Localizacao, pk=pk)
        if "ativo" in request.data:
            loc.ativo = bool(request.data["ativo"])
            loc.save(update_fields=["ativo"])
        return Response(LocalizacaoSerializer(loc).data)


class AdminHistoricoAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _admin_ok(request.user):
            return Response(status=403)
        qs = (
            PedidoReserva.objects.filter(
                status__in=[StatusPedidoReserva.APROVADO, StatusPedidoReserva.REJEITADO]
            )
            .prefetch_related("ocorrencias__sala", "utilizador")
            .order_by("-created_at")[:200]
        )
        return Response([pedido_frontend(p, include_user=True) for p in qs])


class AdminAuditoriaAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _admin_ok(request.user):
            return Response(status=403)
        qs = AuditoriaEspacos.objects.select_related("utilizador", "unidade").order_by("-criado_em")[:200]
        return Response(
            [
                {
                    "id": str(a.id),
                    "acao": a.acao,
                    "entidade": a.entidade,
                    "entidadeId": a.entidade_id,
                    "descricao": a.descricao,
                    "criadoEm": a.criado_em.isoformat(),
                    "utilizador": {
                        "nome": (a.utilizador.get_full_name() or a.utilizador.username) if a.utilizador else "—",
                        "email": a.utilizador.email if a.utilizador else "",
                    },
                    "unidade": {"id": str(a.unidade_id), "nome": a.unidade.nome} if a.unidade else None,
                }
                for a in qs
            ]
        )


class AdminReservaAprovarAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not (is_admin_geral(request.user) or request.user.has_perm("espacos.aprovar_reserva")):
            return Response(status=403)
        pedido = get_object_or_404(PedidoReserva, pk=pk)
        try:
            svc.aprovar_pedido(pedido, request.user)
        except ValueError as e:
            return Response({"error": str(e)}, status=409)
        return Response(PedidoReservaSerializer(pedido).data)


class AdminReservaRejeitarAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not (is_admin_geral(request.user) or request.user.has_perm("espacos.aprovar_reserva")):
            return Response(status=403)
        pedido = get_object_or_404(PedidoReserva, pk=pk)
        svc.rejeitar_pedido(pedido, request.user, request.data.get("observacao", ""))
        return Response(PedidoReservaSerializer(pedido).data)


class AdminEstatisticasAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (is_admin_geral(request.user) or request.user.has_perm("espacos.aprovar_reserva")):
            return Response(status=403)
        from django.db.models import Count

        por_modulo = (
            PedidoReserva.objects.values("modulo")
            .annotate(total=Count("id"))
            .order_by("modulo")
        )
        return Response({"por_modulo": list(por_modulo), "total_pedidos": PedidoReserva.objects.count()})
