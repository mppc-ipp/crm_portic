from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Prefetch, Q
from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from portic_crm.projetos.models import EstadoObjetivo, Objetivo, Projeto, Secao
from portic_crm.projetos.serializers import (
    ObjetivoListSerializer,
    ObjetivoWriteSerializer,
    ProjetoSerializer,
    ProjetoWriteSerializer,
    SecaoSerializer,
    SecaoWriteSerializer,
)
from portic_crm.projetos.services import (
    pode_criar_projeto,
    pode_editar_projeto,
    pode_eliminar_projeto,
    pode_ver_projetos,
    preparar_projeto_para_leitura,
    queryset_projetos_visiveis,
    registar_atividade,
    registar_interacao_empresa_tarefa_concluida,
    sincronizar_membros,
    usuario_pode_ver_projeto,
)

class ProjetoPermissionMixin:
    def get_permissions(self):
        return [IsAuthenticated()]

    def check_projeto_perm(self, request):
        return pode_ver_projetos(request.user)

    def _requer_criar(self, request):
        if not pode_criar_projeto(request.user):
            raise PermissionDenied("Sem permissão para criar.")

    def _requer_editar(self, request):
        if not pode_editar_projeto(request.user):
            raise PermissionDenied("Sem permissão para editar.")

    def _requer_eliminar(self, request):
        if not pode_eliminar_projeto(request.user):
            raise PermissionDenied("Sem permissão para eliminar.")


class ProjetoViewSet(ProjetoPermissionMixin, viewsets.ModelViewSet):
    queryset = Projeto.objects.all()
    serializer_class = ProjetoSerializer

    def get_queryset(self):
        if not self.check_projeto_perm(self.request):
            return Projeto.objects.none()
        objetivos_qs = (
            Objetivo.objects.select_related("responsavel", "empresa")
            .annotate(
                _subtarefas_total=Count("subtarefas", distinct=True),
                _subtarefas_concluidas=Count("subtarefas", filter=Q(subtarefas__concluida=True), distinct=True),
                _comentarios_total=Count("comentarios", distinct=True),
            )
            .order_by("ordem", "id")
        )
        return queryset_projetos_visiveis(self.request.user).select_related(
            "responsavel", "criado_por"
        ).prefetch_related(
            "atividades",
            "campos_personalizados",
            "membros__utilizador",
            Prefetch("secoes", queryset=Secao.objects.prefetch_related(
                Prefetch("objetivos", queryset=objetivos_qs)
            ).order_by("ordem")),
        )

    def _projeto_completo(self, pk: int) -> Projeto:
        return self.get_queryset().get(pk=pk)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        for projeto in queryset:
            preparar_projeto_para_leitura(projeto)
        serializer = ProjetoSerializer(queryset, many=True, context=self.get_serializer_context())
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        projeto = self.get_object()
        preparar_projeto_para_leitura(projeto)
        serializer = ProjetoSerializer(projeto, context=self.get_serializer_context())
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        self._requer_criar(request)
        write = self.get_serializer(data=request.data)
        write.is_valid(raise_exception=True)
        self.perform_create(write)
        projeto = self._projeto_completo(write.instance.pk)
        preparar_projeto_para_leitura(projeto)
        serializer = ProjetoSerializer(projeto, context=self.get_serializer_context())
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        self._requer_editar(request)
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        write = self.get_serializer(instance, data=request.data, partial=partial)
        write.is_valid(raise_exception=True)
        self.perform_update(write)
        projeto = self._projeto_completo(write.instance.pk)
        preparar_projeto_para_leitura(projeto)
        serializer = ProjetoSerializer(projeto, context=self.get_serializer_context())
        return Response(serializer.data)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ProjetoWriteSerializer
        return ProjetoSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def _sincronizar_membros_seguro(self, projeto, emails):
        try:
            sincronizar_membros(projeto, emails)
        except DjangoValidationError as exc:
            raise ValidationError({"membros_emails": exc.messages})

    def perform_create(self, serializer):
        projeto = serializer.save(
            responsavel=self.request.user,
            criado_por=self.request.user,
        )
        membros_emails = self.request.data.get("membros_emails")
        if isinstance(membros_emails, list):
            self._sincronizar_membros_seguro(projeto, membros_emails)
        template = self.request.data.get("template_secoes", "vazio")
        secoes_nomes = self.request.data.get("secoes_nomes")
        if isinstance(secoes_nomes, list) and secoes_nomes:
            for i, nome in enumerate(secoes_nomes):
                nome_limpo = str(nome).strip()
                if nome_limpo:
                    Secao.objects.create(projeto=projeto, nome=nome_limpo, ordem=i)
        elif template == "kanban":
            for i, nome in enumerate(["A fazer", "Em curso", "Concluído"]):
                Secao.objects.create(projeto=projeto, nome=nome, ordem=i)
        registar_atividade(projeto, self.request.user, "PROJETO_CRIADO", f"Criou o projeto «{projeto.nome}»")

    def perform_update(self, serializer):
        instance = self.get_object()
        estado_antes = instance.estado
        projeto = serializer.save()
        if "membros_emails" in self.request.data:
            membros_emails = self.request.data.get("membros_emails", [])
            if isinstance(membros_emails, list):
                self._sincronizar_membros_seguro(projeto, membros_emails)
        registar_atividade(projeto, self.request.user, "PROJETO_ATUALIZADO", f"Atualizou o projeto «{projeto.nome}»")
        if estado_antes != projeto.estado:
            registar_atividade(
                projeto,
                self.request.user,
                "PROJETO_ESTADO",
                f"Projeto «{projeto.nome}»: {estado_antes} → {projeto.estado}",
            )

    def destroy(self, request, *args, **kwargs):
        self._requer_eliminar(request)
        return super().destroy(request, *args, **kwargs)


class SecaoViewSet(ProjetoPermissionMixin, viewsets.ModelViewSet):
    queryset = Secao.objects.prefetch_related("objetivos").all()
    serializer_class = SecaoSerializer

    def get_queryset(self):
        if not self.check_projeto_perm(self.request):
            return Secao.objects.none()
        return Secao.objects.filter(
            projeto__in=queryset_projetos_visiveis(self.request.user)
        ).prefetch_related("objetivos")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return SecaoWriteSerializer
        return SecaoSerializer

    def perform_create(self, serializer):
        self._requer_editar(self.request)
        projeto = serializer.validated_data["projeto"]
        if not usuario_pode_ver_projeto(self.request.user, projeto):
            raise ValidationError({"projeto": "Sem permissão para este projeto."})
        nome = serializer.validated_data["nome"].strip()
        if Secao.objects.filter(projeto=projeto, nome__iexact=nome).exists():
            raise ValidationError({"nome": "Já existe uma secção com este nome neste projeto."})
        secao = serializer.save(nome=nome)
        registar_atividade(
            projeto,
            self.request.user,
            "SECAO_CRIADA",
            f"Criou a secção «{secao.nome}»",
        )

    def perform_update(self, serializer):
        self._requer_editar(self.request)
        instance = self.get_object()
        nome = serializer.validated_data.get("nome", instance.nome).strip()
        projeto = instance.projeto
        if (
            Secao.objects.filter(projeto=projeto, nome__iexact=nome)
            .exclude(pk=instance.pk)
            .exists()
        ):
            raise ValidationError({"nome": "Já existe uma secção com este nome neste projeto."})
        secao = serializer.save(nome=nome)
        registar_atividade(projeto, self.request.user, "SECAO_ATUALIZADA", f"Atualizou a secção «{secao.nome}»")

    def destroy(self, request, *args, **kwargs):
        self._requer_editar(request)
        instance = self.get_object()
        if instance.objetivos.exists():
            return Response(
                {
                    "error": "Não é possível apagar uma secção com tarefas. Mova ou elimine as tarefas primeiro."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        projeto = instance.projeto
        nome = instance.nome
        instance.delete()
        registar_atividade(projeto, request.user, "SECAO_ELIMINADA", f"Eliminou a secção «{nome}»")
        return Response(status=status.HTTP_204_NO_CONTENT)


class ObjetivoViewSet(ProjetoPermissionMixin, viewsets.ModelViewSet):
    queryset = Objetivo.objects.select_related("responsavel", "empresa", "secao__projeto").all()

    def get_queryset(self):
        if not self.check_projeto_perm(self.request):
            return Objetivo.objects.none()
        return Objetivo.objects.filter(
            secao__projeto__in=queryset_projetos_visiveis(self.request.user)
        ).select_related("responsavel", "empresa", "secao__projeto")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ObjetivoWriteSerializer
        return ObjetivoListSerializer

    def perform_create(self, serializer):
        self._requer_editar(self.request)
        secao = serializer.validated_data.get("secao")
        if secao and not usuario_pode_ver_projeto(self.request.user, secao.projeto):
            raise ValidationError({"secao": "Sem permissão para este projeto."})
        obj = serializer.save()
        registar_atividade(
            obj.projeto,
            self.request.user,
            "TAREFA_CRIADA",
            f"Criou a tarefa «{obj.titulo}»",
            objetivo=obj,
        )

    def perform_update(self, serializer):
        self._requer_editar(self.request)
        instance = self.get_object()
        secao = serializer.validated_data.get("secao", instance.secao)
        if secao and not usuario_pode_ver_projeto(self.request.user, secao.projeto):
            raise ValidationError({"secao": "Sem permissão para este projeto."})
        estado_antes = instance.estado
        obj = serializer.save()
        registar_atividade(
            obj.projeto,
            self.request.user,
            "TAREFA_ATUALIZADA",
            f"Atualizou «{obj.titulo}»",
            objetivo=obj,
        )
        if estado_antes != obj.estado:
            registar_atividade(
                obj.projeto,
                self.request.user,
                "TAREFA_ESTADO",
                f"«{obj.titulo}»: {estado_antes} → {obj.estado}",
                objetivo=obj,
            )
            if obj.estado == EstadoObjetivo.CONCLUIDO:
                registar_interacao_empresa_tarefa_concluida(obj, self.request.user)

    def perform_destroy(self, instance):
        self._requer_editar(self.request)
        projeto = instance.projeto
        titulo = instance.titulo
        instance.delete()
        registar_atividade(projeto, self.request.user, "TAREFA_ELIMINADA", f"Eliminou «{titulo}»")