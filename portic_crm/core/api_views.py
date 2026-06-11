from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from portic_crm.core.export import csv_response
from portic_crm.core.models import Notificacao
from portic_crm.core.notifications import sincronizar_notificacoes_sistema
from portic_crm.core.permissions import is_admin_geral, user_can_access_module


class NotificacoesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (is_admin_geral(request.user) or user_can_access_module(request.user, "dashboard")):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        sincronizar_notificacoes_sistema(request.user)
        apenas_nao_lidas = request.query_params.get("nao_lidas") == "1"
        qs = Notificacao.objects.filter(utilizador=request.user).order_by("-created_at")
        if apenas_nao_lidas:
            qs = qs.filter(lida=False)
        limit = min(100, max(1, int(request.query_params.get("limit", 50))))
        items = qs[:limit]
        if request.query_params.get("format") == "csv":
            return csv_response(
                "notificacoes.csv",
                [
                    ("tipo", "Tipo"),
                    ("titulo", "Título"),
                    ("mensagem", "Mensagem"),
                    ("lida", "Lida"),
                    ("criado_em", "Criado em"),
                ],
                [
                    {
                        "tipo": n.get_tipo_display(),
                        "titulo": n.titulo,
                        "mensagem": n.mensagem,
                        "lida": "Sim" if n.lida else "Não",
                        "criado_em": n.created_at.isoformat(),
                    }
                    for n in items
                ],
            )
        return Response(
            {
                "nao_lidas": Notificacao.objects.filter(utilizador=request.user, lida=False).count(),
                "items": [
                    {
                        "id": n.pk,
                        "tipo": n.tipo,
                        "tipo_display": n.get_tipo_display(),
                        "titulo": n.titulo,
                        "mensagem": n.mensagem,
                        "url": n.url,
                        "lida": n.lida,
                        "criado_em": n.created_at.isoformat(),
                    }
                    for n in items
                ],
            }
        )


class NotificacaoDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        notif = Notificacao.objects.filter(pk=pk, utilizador=request.user).first()
        if not notif:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if "lida" in request.data:
            notif.lida = bool(request.data["lida"])
            notif.save(update_fields=["lida", "updated_at"])
        return Response({"id": notif.pk, "lida": notif.lida})


class NotificacoesMarcarTodasAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notificacao.objects.filter(utilizador=request.user, lida=False).update(lida=True)
        return Response({"ok": True})
