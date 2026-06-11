from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from portic_crm.core.audit import AcaoAuditoria, registar_auditoria
from portic_crm.core.models import HistoricoEntrada
from portic_crm.core.permissions import is_admin_geral
from portic_crm.startups.models import (
    Candidatura,
    Edicao,
    FormularioCandidatura,
    RespostaCampo,
    Startup,
    StatusCandidatura,
    TipoHistoricoCandidatura,
)
from portic_crm.startups.serializers import (
    CandidaturaHistoricoSerializer,
    CandidaturaSerializer,
    CandidaturaSubmissaoSerializer,
    EdicaoSerializer,
    FormularioSerializer,
    PublicFormularioSerializer,
    StartupSerializer,
    StatusCandidaturaSerializer,
    TipoHistoricoCandidaturaSerializer,
    formulario_publico_aberto,
)


class StartupViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StartupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not (is_admin_geral(user) or user.has_perm("startups.view_startup")):
            return Startup.objects.none()
        qs = Startup.objects.select_related("edicao").all()
        ano = self.request.query_params.get("ano")
        if ano:
            qs = qs.filter(edicao__ano=ano)
        return qs


class EdicaoViewSet(viewsets.ModelViewSet):
    serializer_class = EdicaoSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]
    queryset = Edicao.objects.all()

    def _pode_ver(self, user) -> bool:
        return (
            is_admin_geral(user)
            or user.has_perm("startups.view_startup")
            or user.has_perm("startups.gerir_formularios_candidatura")
        )

    def _pode_gerir(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("startups.gerir_formularios_candidatura")

    def get_queryset(self):
        if not self._pode_ver(self.request.user):
            return Edicao.objects.none()
        return Edicao.objects.order_by("-ano")

    def create(self, request, *args, **kwargs):
        if not self._pode_gerir(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            edicao = Edicao.objects.get(pk=response.data["id"])
            registar_auditoria(
                AcaoAuditoria.EDICAO_CRIADA,
                f"Criou edição «{edicao.nome}» ({edicao.ano})",
                actor=request.user,
                alvo=edicao,
            )
        return response

    def partial_update(self, request, *args, **kwargs):
        if not self._pode_gerir(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        edicao = self.get_object()
        response = super().partial_update(request, *args, **kwargs)
        registar_auditoria(
            AcaoAuditoria.EDICAO_EDITADA,
            f"Editou edição «{edicao.nome}» ({edicao.ano})",
            actor=request.user,
            alvo=edicao,
        )
        return response


class CandidaturaViewSet(viewsets.ModelViewSet):
    serializer_class = CandidaturaSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def _pode_ver(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("startups.ver_candidaturas")

    def _pode_alterar(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("startups.alterar_estado_candidatura")

    def get_queryset(self):
        user = self.request.user
        if not self._pode_ver(user):
            return Candidatura.objects.none()
        qs = Candidatura.objects.select_related(
            "formulario", "formulario__edicao"
        ).prefetch_related("respostas__campo")
        formulario_id = self.request.query_params.get("formulario")
        if formulario_id:
            qs = qs.filter(formulario_id=formulario_id)
        return qs.order_by("-submetida_em")

    def partial_update(self, request, *args, **kwargs):
        if not self._pode_alterar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        candidatura = self.get_object()
        estado_antes = candidatura.estado
        response = super().partial_update(request, *args, **kwargs)
        candidatura.refresh_from_db()
        if candidatura.estado != estado_antes:
            registar_auditoria(
                AcaoAuditoria.CANDIDATURA_ESTADO,
                f"Candidatura #{candidatura.pk}: «{estado_antes}» → «{candidatura.estado}»",
                actor=request.user,
                alvo=candidatura,
            )
        return response


class FormularioViewSet(viewsets.ModelViewSet):
    serializer_class = FormularioSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "put", "head", "options"]

    def _pode_gerir(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("startups.gerir_formularios_candidatura")

    def get_queryset(self):
        user = self.request.user
        if not self._pode_gerir(user):
            return FormularioCandidatura.objects.none()
        return (
            FormularioCandidatura.objects.select_related("edicao")
            .annotate(num_candidaturas=Count("candidaturas"))
            .order_by("-created_at")
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        from django.conf import settings

        ctx["web_url"] = getattr(settings, "WEB_URL", "http://localhost:3000")
        return ctx

    def create(self, request, *args, **kwargs):
        if not self._pode_gerir(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            form = FormularioCandidatura.objects.get(pk=response.data["id"])
            registar_auditoria(
                AcaoAuditoria.FORMULARIO_CRIADO,
                f"Criou formulário «{form.titulo}»",
                actor=request.user,
                alvo=form,
            )
        return response

    def update(self, request, *args, **kwargs):
        if not self._pode_gerir(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        form = self.get_object()
        response = super().update(request, *args, **kwargs)
        registar_auditoria(
            AcaoAuditoria.FORMULARIO_EDITADO,
            f"Editou formulário «{form.titulo}»",
            actor=request.user,
            alvo=form,
        )
        return response

    def partial_update(self, request, *args, **kwargs):
        if not self._pode_gerir(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        form = self.get_object()
        response = super().partial_update(request, *args, **kwargs)
        registar_auditoria(
            AcaoAuditoria.FORMULARIO_EDITADO,
            f"Editou formulário «{form.titulo}»",
            actor=request.user,
            alvo=form,
        )
        return response


class CandidaturaHistoricoAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def _pode_ver(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("startups.ver_candidaturas")

    def _pode_registar(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("startups.alterar_estado_candidatura")

    def get(self, request, candidatura_pk):
        if not self._pode_ver(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        candidatura = get_object_or_404(Candidatura, pk=candidatura_pk)
        historicos = candidatura.historicos.order_by("created_at")
        return Response(CandidaturaHistoricoSerializer(historicos, many=True).data)

    def post(self, request, candidatura_pk):
        if not self._pode_registar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        candidatura = get_object_or_404(Candidatura, pk=candidatura_pk)
        serializer = CandidaturaHistoricoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ct = ContentType.objects.get_for_model(Candidatura)
        historico = HistoricoEntrada.objects.create(
            content_type=ct,
            object_id=candidatura.pk,
            registado_por=request.user,
            **serializer.validated_data,
        )
        return Response(
            CandidaturaHistoricoSerializer(historico).data,
            status=status.HTTP_201_CREATED,
        )


class CandidaturaHistoricoDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def _pode_registar(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("startups.alterar_estado_candidatura")

    def _get_historico(self, candidatura_pk, pk):
        candidatura = get_object_or_404(Candidatura, pk=candidatura_pk)
        ct = ContentType.objects.get_for_model(Candidatura)
        return get_object_or_404(
            HistoricoEntrada,
            pk=pk,
            content_type=ct,
            object_id=candidatura.pk,
        )

    def patch(self, request, candidatura_pk, pk):
        if not self._pode_registar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        historico = self._get_historico(candidatura_pk, pk)
        serializer = CandidaturaHistoricoSerializer(historico, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        candidatura = get_object_or_404(Candidatura, pk=candidatura_pk)
        registar_auditoria(
            AcaoAuditoria.CAND_HIST_EDITADO,
            f"Editou histórico na candidatura #{candidatura.pk}",
            actor=request.user,
            alvo=candidatura,
        )
        return Response(serializer.data)

    def delete(self, request, candidatura_pk, pk):
        if not self._pode_registar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        historico = self._get_historico(candidatura_pk, pk)
        candidatura = get_object_or_404(Candidatura, pk=candidatura_pk)
        resumo = historico.conteudo[:120]
        historico.delete()
        registar_auditoria(
            AcaoAuditoria.CAND_HIST_REMOVIDO,
            f"Removeu histórico na candidatura #{candidatura.pk}: {resumo}",
            actor=request.user,
            alvo=candidatura,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class CandidaturaPublicaAPIView(APIView):
    """Formulário público por token — sem autenticação."""

    permission_classes = [AllowAny]

    def _get_formulario(self, token):
        return get_object_or_404(FormularioCandidatura, token=token)

    def get(self, request, token):
        formulario = self._get_formulario(token)
        erro = formulario_publico_aberto(formulario)
        if erro:
            return Response({"error": erro}, status=status.HTTP_403_FORBIDDEN)
        return Response(PublicFormularioSerializer(formulario).data)

    @transaction.atomic
    def post(self, request, token):
        formulario = self._get_formulario(token)
        erro = formulario_publico_aberto(formulario)
        if erro:
            return Response({"error": erro}, status=status.HTTP_403_FORBIDDEN)

        serializer = CandidaturaSubmissaoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        respostas_map = data.get("respostas") or {}

        campos = list(formulario.campos.all())
        for campo in campos:
            valor = str(respostas_map.get(str(campo.id), "")).strip()
            if campo.obrigatorio and not valor:
                return Response(
                    {"error": f"O campo «{campo.nome}» é obrigatório."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        candidatura = Candidatura.objects.create(formulario=formulario)
        registar_auditoria(
            AcaoAuditoria.CANDIDATURA_SUBMETIDA,
            f"Nova candidatura no formulário «{formulario.titulo}» (#{candidatura.pk})",
            actor=None,
            alvo=candidatura,
        )
        for campo in campos:
            valor = str(respostas_map.get(str(campo.id), "")).strip()
            RespostaCampo.objects.create(
                candidatura=candidatura,
                campo=campo,
                valor=valor,
            )

        return Response({"ok": True}, status=status.HTTP_201_CREATED)


class _ConfiguracaoStartupsMixin:
    def _pode_ver(self, user) -> bool:
        return (
            is_admin_geral(user)
            or user.has_perm("startups.view_startup")
            or user.has_perm("startups.ver_candidaturas")
        )

    def _pode_configurar(self, user) -> bool:
        return is_admin_geral(user) or user.has_perm("administrador.gerir_utilizadores")


class TipoHistoricoCandidaturaViewSet(_ConfiguracaoStartupsMixin, viewsets.ModelViewSet):
    serializer_class = TipoHistoricoCandidaturaSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        if not self._pode_ver(self.request.user):
            return TipoHistoricoCandidatura.objects.none()
        qs = TipoHistoricoCandidatura.objects.all()
        if not self._pode_configurar(self.request.user):
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
        tipo = TipoHistoricoCandidatura.objects.create(
            codigo=TipoHistoricoCandidatura.gerar_codigo(nome),
            nome=nome,
            ordem=ordem,
            ativo=True,
        )
        registar_auditoria(
            AcaoAuditoria.TIPO_HISTORICO_CRIADO,
            f"Criou tipo de histórico «{tipo.nome}»",
            actor=request.user,
            alvo=tipo,
        )
        return Response(TipoHistoricoCandidaturaSerializer(tipo).data, status=status.HTTP_201_CREATED)

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
            AcaoAuditoria.TIPO_HISTORICO_EDITADO,
            f"Editou tipo de histórico «{instance.nome}» (ativo={instance.ativo})",
            actor=request.user,
            alvo=instance,
        )
        return Response(TipoHistoricoCandidaturaSerializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        if not self._pode_configurar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        instance = self.get_object()
        ct = ContentType.objects.get_for_model(Candidatura)
        em_uso = HistoricoEntrada.objects.filter(content_type=ct, tipo=instance.codigo).exists()
        if em_uso:
            instance.ativo = False
            instance.save(update_fields=["ativo", "updated_at"])
            registar_auditoria(
                AcaoAuditoria.TIPO_HISTORICO_REMOVIDO,
                f"Desactivou tipo de histórico «{instance.nome}» (em uso)",
                actor=request.user,
                alvo=instance,
            )
            return Response(
                {"detail": "Tipo desativado porque já está em uso."},
                status=status.HTTP_200_OK,
            )
        nome = instance.nome
        registar_auditoria(
            AcaoAuditoria.TIPO_HISTORICO_REMOVIDO,
            f"Removeu tipo de histórico «{nome}»",
            actor=request.user,
            alvo=instance,
        )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StatusCandidaturaViewSet(_ConfiguracaoStartupsMixin, viewsets.ModelViewSet):
    serializer_class = StatusCandidaturaSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        if not self._pode_ver(self.request.user):
            return StatusCandidatura.objects.none()
        qs = StatusCandidatura.objects.all()
        if not self._pode_configurar(self.request.user):
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
        cor = (request.data.get("cor") or "#6B7280").strip()
        ordem = request.data.get("ordem", 0)
        try:
            ordem = int(ordem)
        except (TypeError, ValueError):
            ordem = 0
        status_obj = StatusCandidatura.objects.create(
            codigo=StatusCandidatura.gerar_codigo(nome),
            nome=nome,
            cor=cor,
            ordem=ordem,
            ativo=True,
        )
        registar_auditoria(
            AcaoAuditoria.ESTADO_CAND_CRIADO,
            f"Criou estado de candidatura «{status_obj.nome}»",
            actor=request.user,
            alvo=status_obj,
        )
        return Response(StatusCandidaturaSerializer(status_obj).data, status=status.HTTP_201_CREATED)

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
        if "cor" in request.data:
            instance.cor = (request.data["cor"] or "#6B7280").strip()
        if "ordem" in request.data:
            try:
                instance.ordem = int(request.data["ordem"])
            except (TypeError, ValueError):
                pass
        if "ativo" in request.data:
            instance.ativo = bool(request.data["ativo"])
        instance.save()
        registar_auditoria(
            AcaoAuditoria.ESTADO_CAND_EDITADO,
            f"Editou estado de candidatura «{instance.nome}» (ativo={instance.ativo})",
            actor=request.user,
            alvo=instance,
        )
        return Response(StatusCandidaturaSerializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        if not self._pode_configurar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        instance = self.get_object()
        em_uso = Candidatura.objects.filter(estado=instance.codigo).exists()
        if em_uso:
            instance.ativo = False
            instance.save(update_fields=["ativo", "updated_at"])
            registar_auditoria(
                AcaoAuditoria.ESTADO_CAND_REMOVIDO,
                f"Desactivou estado «{instance.nome}» (em uso)",
                actor=request.user,
                alvo=instance,
            )
            return Response(
                {"detail": "Estado desativado porque já está em uso."},
                status=status.HTTP_200_OK,
            )
        nome = instance.nome
        registar_auditoria(
            AcaoAuditoria.ESTADO_CAND_REMOVIDO,
            f"Removeu estado «{nome}»",
            actor=request.user,
            alvo=instance,
        )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
