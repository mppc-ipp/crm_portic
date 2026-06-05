from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from portic_crm.core.models import HistoricoEntrada
from portic_crm.core.permissions import is_admin_geral
from portic_crm.empresas.models import Empresa
from portic_crm.empresas.serializers import EmpresaSerializer, InteracaoSerializer


class EmpresaViewSet(viewsets.ModelViewSet):
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "put", "head", "options"]

    def _pode_ver(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("empresas.view_empresa")

    def _pode_criar(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("empresas.add_empresa")

    def _pode_editar(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("empresas.change_empresa")

    def get_queryset(self):
        user = self.request.user
        if not self._pode_ver(user):
            return Empresa.objects.none()
        qs = Empresa.objects.prefetch_related("contactos").all()
        q = self.request.query_params.get("q", "").strip()
        tipo = self.request.query_params.get("tipo", "").strip()
        if q:
            qs = qs.filter(
                Q(nome__icontains=q)
                | Q(nif__icontains=q)
                | Q(setor__icontains=q)
                | Q(cae__icontains=q)
            )
        if tipo:
            qs = qs.filter(tipo=tipo)
        estado = self.request.query_params.get("estado", "").strip()
        if estado:
            qs = qs.filter(estado=estado)
        return qs

    def create(self, request, *args, **kwargs):
        if not self._pode_criar(request.user):
            return Response({"error": "Sem permissão para criar empresas"}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not self._pode_editar(request.user):
            return Response({"error": "Sem permissão para editar empresas"}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not self._pode_editar(request.user):
            return Response({"error": "Sem permissão para editar empresas"}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)


class EmpresaInteracaoAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def _pode_ver(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("empresas.view_empresa")

    def _pode_registar(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("empresas.change_empresa")

    def get(self, request, empresa_pk):
        if not self._pode_ver(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        empresa = get_object_or_404(Empresa, pk=empresa_pk)
        interacoes = empresa.historicos.order_by("created_at")
        return Response(InteracaoSerializer(interacoes, many=True).data)

    def post(self, request, empresa_pk):
        if not self._pode_registar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        empresa = get_object_or_404(Empresa, pk=empresa_pk)
        serializer = InteracaoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ct = ContentType.objects.get_for_model(Empresa)
        interacao = HistoricoEntrada.objects.create(
            content_type=ct,
            object_id=empresa.pk,
            registado_por=request.user,
            **serializer.validated_data,
        )
        return Response(InteracaoSerializer(interacao).data, status=status.HTTP_201_CREATED)


class EmpresaInteracaoDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def _pode_registar(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("empresas.change_empresa")

    def _get_interacao(self, empresa_pk, pk):
        empresa = get_object_or_404(Empresa, pk=empresa_pk)
        ct = ContentType.objects.get_for_model(Empresa)
        return get_object_or_404(
            HistoricoEntrada,
            pk=pk,
            content_type=ct,
            object_id=empresa.pk,
        )

    def patch(self, request, empresa_pk, pk):
        if not self._pode_registar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        interacao = self._get_interacao(empresa_pk, pk)
        serializer = InteracaoSerializer(interacao, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, empresa_pk, pk):
        if not self._pode_registar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        interacao = self._get_interacao(empresa_pk, pk)
        interacao.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
