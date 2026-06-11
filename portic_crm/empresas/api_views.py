from django.contrib.contenttypes.models import ContentType
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from portic_crm.core.audit import AcaoAuditoria, registar_auditoria
from portic_crm.core.models import HistoricoEntrada
from portic_crm.core.permissions import is_admin_geral
from portic_crm.empresas.models import Empresa, TipoInteracao
from portic_crm.empresas.serializers import (
    EmpresaSerializer,
    InteracaoSerializer,
    TipoInteracaoSerializer,
)


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

    def list(self, request, *args, **kwargs):
        if request.query_params.get("format") == "csv":
            if not self._pode_ver(request.user):
                return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
            from portic_crm.core.export import csv_response

            qs = self.filter_queryset(self.get_queryset())
            return csv_response(
                "empresas.csv",
                [
                    ("nome", "Nome"),
                    ("nif", "NIF"),
                    ("cae", "CAE"),
                    ("setor", "Setor"),
                    ("tipo", "Tipo"),
                    ("estado", "Estado"),
                    ("email", "Email"),
                    ("localidade", "Localidade"),
                ],
                [
                    {
                        "nome": e.nome,
                        "nif": e.nif,
                        "cae": e.cae,
                        "setor": e.setor,
                        "tipo": e.get_tipo_display(),
                        "estado": e.get_estado_display(),
                        "email": e.email,
                        "localidade": e.localidade,
                    }
                    for e in qs
                ],
            )
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if not self._pode_criar(request.user):
            return Response({"error": "Sem permissão para criar empresas"}, status=status.HTTP_403_FORBIDDEN)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            empresa = Empresa.objects.get(pk=response.data["id"])
            registar_auditoria(
                AcaoAuditoria.EMPRESA_CRIADA,
                f"Criou a empresa «{empresa.nome}» (NIF: {empresa.nif or '—'})",
                actor=request.user,
                alvo=empresa,
            )
        return response

    def update(self, request, *args, **kwargs):
        if not self._pode_editar(request.user):
            return Response({"error": "Sem permissão para editar empresas"}, status=status.HTTP_403_FORBIDDEN)
        empresa = self.get_object()
        response = super().update(request, *args, **kwargs)
        registar_auditoria(
            AcaoAuditoria.EMPRESA_EDITADA,
            f"Editou a empresa «{empresa.nome}»",
            actor=request.user,
            alvo=empresa,
        )
        return response

    def partial_update(self, request, *args, **kwargs):
        if not self._pode_editar(request.user):
            return Response({"error": "Sem permissão para editar empresas"}, status=status.HTTP_403_FORBIDDEN)
        empresa = self.get_object()
        response = super().partial_update(request, *args, **kwargs)
        registar_auditoria(
            AcaoAuditoria.EMPRESA_EDITADA,
            f"Editou a empresa «{empresa.nome}»",
            actor=request.user,
            alvo=empresa,
        )
        return response


class EmpresaEstatisticasAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (is_admin_geral(request.user) or request.user.has_perm("empresas.view_empresa")):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        return Response(
            {
                "total": Empresa.objects.count(),
                "por_tipo": list(
                    Empresa.objects.values("tipo").annotate(total=Count("id")).order_by("tipo")
                ),
                "por_estado": list(
                    Empresa.objects.values("estado").annotate(total=Count("id")).order_by("estado")
                ),
            }
        )


class EmpresaInteracaoAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def _pode_ver(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("empresas.view_empresa")

    def _pode_registar(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("empresas.change_empresa")

    def get(self, request, empresa_pk):
        if not self._pode_ver(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        from portic_crm.core.export import csv_response

        empresa = get_object_or_404(Empresa, pk=empresa_pk)
        interacoes = empresa.historicos.order_by("created_at")
        if request.query_params.get("format") == "csv":
            data = InteracaoSerializer(interacoes, many=True).data
            return csv_response(
                f"empresa_{empresa_pk}_interacoes.csv",
                [
                    ("data", "Data"),
                    ("tipo_display", "Tipo"),
                    ("conteudo", "Conteúdo"),
                    ("registado_por_nome", "Registado por"),
                ],
                data,
            )
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
        empresa = get_object_or_404(Empresa, pk=empresa_pk)
        registar_auditoria(
            AcaoAuditoria.EMPRESA_INTER_EDITADA,
            f"Editou interação na empresa «{empresa.nome}»",
            actor=request.user,
            alvo=empresa,
        )
        return Response(serializer.data)

    def delete(self, request, empresa_pk, pk):
        if not self._pode_registar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        interacao = self._get_interacao(empresa_pk, pk)
        empresa = get_object_or_404(Empresa, pk=empresa_pk)
        resumo = interacao.conteudo[:120]
        interacao.delete()
        registar_auditoria(
            AcaoAuditoria.EMPRESA_INTER_REMOVIDA,
            f"Removeu interação na empresa «{empresa.nome}»: {resumo}",
            actor=request.user,
            alvo=empresa,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class TipoInteracaoViewSet(viewsets.ModelViewSet):
    serializer_class = TipoInteracaoSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def _pode_ver(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("empresas.view_empresa")

    def _pode_configurar(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("administrador.gerir_utilizadores")

    def get_queryset(self):
        user = self.request.user
        if not self._pode_ver(user):
            return TipoInteracao.objects.none()
        qs = TipoInteracao.objects.all()
        if not self._pode_configurar(user):
            qs = qs.filter(ativo=True)
        elif self.request.query_params.get("ativos") == "1":
            qs = qs.filter(ativo=True)
        return qs

    def create(self, request, *args, **kwargs):
        if not self._pode_configurar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        nome = (request.data.get("nome") or "").strip()
        if not nome:
            return Response({"error": "Nome obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
        ordem = request.data.get("ordem", 0)
        try:
            ordem = int(ordem)
        except (TypeError, ValueError):
            ordem = 0
        tipo = TipoInteracao.objects.create(
            codigo=TipoInteracao.gerar_codigo(nome),
            nome=nome,
            ordem=ordem,
            ativo=True,
        )
        registar_auditoria(
            AcaoAuditoria.TIPO_INTERACAO_CRIADO,
            f"Criou tipo de interação «{tipo.nome}»",
            actor=request.user,
            alvo=tipo,
        )
        return Response(TipoInteracaoSerializer(tipo).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        if not self._pode_configurar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        instance = self.get_object()
        nome = request.data.get("nome")
        if nome is not None:
            nome = nome.strip()
            if not nome:
                return Response({"error": "Nome obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
            instance.nome = nome
        if "ordem" in request.data:
            try:
                instance.ordem = int(request.data["ordem"])
            except (TypeError, ValueError):
                pass
        if "ativo" in request.data:
            instance.ativo = bool(request.data["ativo"])
        instance.save()
        registar_auditoria(
            AcaoAuditoria.TIPO_INTERACAO_EDITADO,
            f"Editou tipo de interação «{instance.nome}» (ativo={instance.ativo})",
            actor=request.user,
            alvo=instance,
        )
        return Response(TipoInteracaoSerializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        if not self._pode_configurar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        instance = self.get_object()
        ct = ContentType.objects.get_for_model(Empresa)
        em_uso = HistoricoEntrada.objects.filter(content_type=ct, tipo=instance.codigo).exists()
        if em_uso:
            instance.ativo = False
            instance.save(update_fields=["ativo", "updated_at"])
            registar_auditoria(
                AcaoAuditoria.TIPO_INTERACAO_REMOVIDO,
                f"Desactivou tipo de interação «{instance.nome}» (em uso)",
                actor=request.user,
                alvo=instance,
            )
            return Response(
                {"detail": "Tipo desativado porque já está em uso no histórico."},
                status=status.HTTP_200_OK,
            )
        nome = instance.nome
        registar_auditoria(
            AcaoAuditoria.TIPO_INTERACAO_REMOVIDO,
            f"Removeu tipo de interação «{nome}»",
            actor=request.user,
            alvo=instance,
        )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
