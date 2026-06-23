from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from portic_crm.core.audit import AcaoAuditoria, registar_auditoria
from portic_crm.core.permissions import is_admin_geral
from portic_crm.viaturas.models import Viatura
from portic_crm.viaturas.serializers import ViaturaSerializer


class ViaturaViewSet(viewsets.ModelViewSet):
    serializer_class = ViaturaSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "patch", "put", "delete", "head", "options"]

    def _pode_ver(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("viaturas.view_viatura")

    def _pode_criar(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("viaturas.add_viatura")

    def _pode_editar(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("viaturas.change_viatura")

    def _pode_eliminar(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("viaturas.delete_viatura")

    def get_queryset(self):
        user = self.request.user
        if not self._pode_ver(user):
            return Viatura.objects.none()
        qs = Viatura.objects.filter(ativo=True)
        q = self.request.query_params.get("q", "").strip()
        estado = self.request.query_params.get("estado", "").strip()
        if q:
            qs = qs.filter(
                Q(matricula__icontains=q)
                | Q(marca__icontains=q)
                | Q(modelo__icontains=q)
                | Q(cor__icontains=q)
                | Q(dono__icontains=q)
                | Q(telemovel__icontains=q)
                | Q(sala__icontains=q)
            )
        if estado:
            qs = qs.filter(estado=estado)
        return qs

    def list(self, request, *args, **kwargs):
        if request.query_params.get("format") == "csv":
            if not self._pode_ver(request.user):
                return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
            from portic_crm.core.export import csv_response

            qs = self.filter_queryset(self.get_queryset())
            return csv_response(
                "viaturas.csv",
                [
                    ("matricula", "Matrícula"),
                    ("marca", "Marca"),
                    ("modelo", "Modelo"),
                    ("cor", "Cor"),
                    ("ano", "Ano"),
                    ("dono", "Dono"),
                    ("telemovel", "Telemóvel"),
                    ("sala", "Sala"),
                    ("estado", "Estado"),
                    ("descricao", "Descrição"),
                ],
                [
                    {
                        "matricula": v.matricula,
                        "marca": v.marca,
                        "modelo": v.modelo,
                        "cor": v.cor,
                        "ano": v.ano or "",
                        "dono": v.dono,
                        "telemovel": v.telemovel,
                        "sala": v.sala,
                        "estado": v.get_estado_display(),
                        "descricao": v.descricao,
                    }
                    for v in qs
                ],
                actor=request.user,
                modulo="viaturas",
            )
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if not self._pode_criar(request.user):
            return Response({"error": "Sem permissão para criar viaturas"}, status=status.HTTP_403_FORBIDDEN)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            viatura = Viatura.objects.get(pk=response.data["id"])
            registar_auditoria(
                AcaoAuditoria.VIATURA_CRIADA,
                f"Criou a viatura «{viatura.matricula}»",
                actor=request.user,
                alvo=viatura,
            )
        return response

    def update(self, request, *args, **kwargs):
        if not self._pode_editar(request.user):
            return Response({"error": "Sem permissão para editar viaturas"}, status=status.HTTP_403_FORBIDDEN)
        viatura = self.get_object()
        if "foto" in request.FILES and viatura.foto:
            viatura.foto.delete(save=False)
        response = super().update(request, *args, **kwargs)
        registar_auditoria(
            AcaoAuditoria.VIATURA_EDITADA,
            f"Editou a viatura «{viatura.matricula}»",
            actor=request.user,
            alvo=viatura,
        )
        return response

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not self._pode_eliminar(request.user):
            return Response({"error": "Sem permissão para eliminar viaturas"}, status=status.HTTP_403_FORBIDDEN)
        viatura = self.get_object()
        matricula = viatura.matricula
        viatura.ativo = False
        viatura.save(update_fields=["ativo"])
        registar_auditoria(
            AcaoAuditoria.VIATURA_ELIMINADA,
            f"Desactivou a viatura «{matricula}»",
            actor=request.user,
            alvo=viatura,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
