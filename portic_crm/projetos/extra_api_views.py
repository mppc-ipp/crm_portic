from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from portic_crm.projetos.models import (
    AnexoObjetivo,
    AtividadeProjeto,
    CampoPersonalizado,
    ComentarioObjetivo,
    DependenciaObjetivo,
    Objetivo,
    Projeto,
    Subtarefa,
    ValorCampoPersonalizado,
    VistaGuardada,
)
from portic_crm.projetos.serializers import (
    AnexoObjetivoSerializer,
    AnexoProjetoSerializer,
    AtividadeSerializer,
    CampoPersonalizadoSerializer,
    CampoPersonalizadoWriteSerializer,
    ComentarioSerializer,
    ComentarioWriteSerializer,
    DependenciaSerializer,
    ObjetivoSerializer,
    SubtarefaSerializer,
    SubtarefaWriteSerializer,
    ValorCampoSerializer,
    ValorCampoWriteSerializer,
    VistaGuardadaSerializer,
    VistaGuardadaWriteSerializer,
)

TAMANHO_MAX_ANEXO_BYTES = 25 * 1024 * 1024
from portic_crm.projetos.services import (
    nome_responsavel_objetivo,
    pode_editar_projeto,
    pode_ver_projetos,
    queryset_projetos_visiveis,
    registar_atividade,
    usuario_pode_ver_projeto,
)


def _projeto_perm(user):
    return pode_ver_projetos(user)


def _projeto_editar(user):
    return pode_editar_projeto(user)


def _deny_leitura(user):
    if not _projeto_perm(user):
        return Response(status=403)
    return None


def _deny_mutacao(user):
    denied = _deny_leitura(user)
    if denied:
        return denied
    if not _projeto_editar(user):
        return Response(status=403)
    return None


def _projeto_visivel(user, projeto_id):
    return get_object_or_404(queryset_projetos_visiveis(user), pk=projeto_id)


def _objetivo_visivel(user, objetivo_id):
    return get_object_or_404(
        Objetivo.objects.select_related("secao__projeto"),
        pk=objetivo_id,
        secao__projeto__in=queryset_projetos_visiveis(user),
    )


class ObjetivoDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if not _projeto_perm(request.user):
            return Response(status=403)
        obj = _objetivo_visivel(request.user, pk)
        obj = (
            Objetivo.objects.select_related("responsavel", "empresa", "secao__projeto")
            .prefetch_related(
                "subtarefas",
                "comentarios__autor",
                "dependencias_entrada__predecessora",
                "dependencias_saida__sucessora",
                "valores_campos__campo",
                "anexos__carregado_por",
            )
            .get(pk=obj.pk)
        )
        return Response(ObjetivoSerializer(obj, context={"request": request}).data)


class SubtarefaListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, objetivo_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
        _objetivo_visivel(request.user, objetivo_id)
        qs = Subtarefa.objects.filter(objetivo_id=objetivo_id).order_by("ordem")
        return Response(SubtarefaSerializer(qs, many=True).data)

    def post(self, request, objetivo_id):
        denied = _deny_mutacao(request.user)
        if denied:
            return denied
        objetivo = _objetivo_visivel(request.user, objetivo_id)
        data = {**request.data, "objetivo": objetivo_id}
        ser = SubtarefaWriteSerializer(data=data)
        ser.is_valid(raise_exception=True)
        st = ser.save()
        registar_atividade(
            objetivo.projeto,
            request.user,
            "SUBTAREFA_CRIADA",
            f"Adicionou subtarefa «{st.titulo}» em «{objetivo.titulo}»",
            objetivo=objetivo,
        )
        return Response(SubtarefaSerializer(st).data, status=201)


class SubtarefaDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        denied = _deny_mutacao(request.user)
        if denied:
            return denied
        st = get_object_or_404(Subtarefa.objects.select_related("objetivo__secao__projeto"), pk=pk)
        if not usuario_pode_ver_projeto(request.user, st.objetivo.projeto):
            return Response(status=403)
        concluida_antes = st.concluida
        ser = SubtarefaWriteSerializer(st, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        st = ser.save()
        objetivo = st.objetivo
        if concluida_antes != st.concluida:
            msg = f"Subtarefa «{st.titulo}»: {'marcada como concluída' if st.concluida else 'reaberta'}"
        else:
            msg = f"Actualizou subtarefa «{st.titulo}»"
        registar_atividade(
            objetivo.projeto,
            request.user,
            "SUBTAREFA_ATUALIZADA",
            msg,
            objetivo=objetivo,
        )
        return Response(SubtarefaSerializer(st).data)

    def delete(self, request, pk):
        denied = _deny_mutacao(request.user)
        if denied:
            return denied
        st = get_object_or_404(Subtarefa.objects.select_related("objetivo__secao__projeto"), pk=pk)
        if not usuario_pode_ver_projeto(request.user, st.objetivo.projeto):
            return Response(status=403)
        objetivo = st.objetivo
        titulo = st.titulo
        st.delete()
        registar_atividade(
            objetivo.projeto,
            request.user,
            "SUBTAREFA_ELIMINADA",
            f"Eliminou subtarefa «{titulo}» de «{objetivo.titulo}»",
            objetivo=objetivo,
        )
        return Response(status=204)


class ComentarioListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, objetivo_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
        _objetivo_visivel(request.user, objetivo_id)
        qs = ComentarioObjetivo.objects.filter(objetivo_id=objetivo_id).select_related("autor")
        return Response(ComentarioSerializer(qs, many=True).data)

    def post(self, request, objetivo_id):
        denied = _deny_mutacao(request.user)
        if denied:
            return denied
        objetivo = _objetivo_visivel(request.user, objetivo_id)
        ser = ComentarioWriteSerializer(data={"texto": request.data.get("texto", ""), "objetivo": objetivo_id})
        ser.is_valid(raise_exception=True)
        c = ser.save(autor=request.user)
        registar_atividade(
            objetivo.projeto,
            request.user,
            "COMENTARIO",
            f"Comentou em «{objetivo.titulo}»",
            objetivo=objetivo,
        )
        return Response(ComentarioSerializer(c).data, status=201)


class DependenciaListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, objetivo_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
        _objetivo_visivel(request.user, objetivo_id)
        qs = DependenciaObjetivo.objects.filter(
            Q(predecessora_id=objetivo_id) | Q(sucessora_id=objetivo_id)
        ).select_related("predecessora", "sucessora")
        return Response(DependenciaSerializer(qs, many=True).data)

    def post(self, request, objetivo_id):
        denied = _deny_mutacao(request.user)
        if denied:
            return denied
        _objetivo_visivel(request.user, objetivo_id)
        predecessora_id = request.data.get("predecessora")
        sucessora_id = request.data.get("sucessora", objetivo_id)
        if predecessora_id == sucessora_id:
            return Response({"error": "Uma tarefa não pode depender de si mesma"}, status=400)
        dep = DependenciaObjetivo.objects.create(predecessora_id=predecessora_id, sucessora_id=sucessora_id)
        sucessora = dep.sucessora
        registar_atividade(
            sucessora.projeto,
            request.user,
            "DEPENDENCIA",
            f"«{sucessora.titulo}» depende de «{dep.predecessora.titulo}»",
            objetivo=sucessora,
        )
        return Response(DependenciaSerializer(dep).data, status=201)


class DependenciaDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        denied = _deny_mutacao(request.user)
        if denied:
            return denied
        dep = get_object_or_404(
            DependenciaObjetivo.objects.select_related("predecessora", "sucessora__secao__projeto"),
            pk=pk,
        )
        if not usuario_pode_ver_projeto(request.user, dep.sucessora.projeto):
            return Response(status=403)
        sucessora = dep.sucessora
        registar_atividade(
            sucessora.projeto,
            request.user,
            "DEPENDENCIA_REMOVIDA",
            f"Removeu dependência: «{sucessora.titulo}» já não depende de «{dep.predecessora.titulo}»",
            objetivo=sucessora,
        )
        dep.delete()
        return Response(status=204)


class CampoPersonalizadoListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, projeto_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
        _projeto_visivel(request.user, projeto_id)
        qs = CampoPersonalizado.objects.filter(projeto_id=projeto_id)
        return Response(CampoPersonalizadoSerializer(qs, many=True).data)

    def post(self, request, projeto_id):
        denied = _deny_mutacao(request.user)
        if denied:
            return denied
        projeto = _projeto_visivel(request.user, projeto_id)
        data = {**request.data, "projeto": projeto_id}
        ser = CampoPersonalizadoWriteSerializer(data=data)
        ser.is_valid(raise_exception=True)
        campo = ser.save()
        registar_atividade(projeto, request.user, "CAMPO_CRIADO", f"Criou campo «{campo.nome}»")
        return Response(CampoPersonalizadoSerializer(campo).data, status=201)


class CampoPersonalizadoDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        denied = _deny_mutacao(request.user)
        if denied:
            return denied
        campo = get_object_or_404(CampoPersonalizado.objects.select_related("projeto"), pk=pk)
        if not usuario_pode_ver_projeto(request.user, campo.projeto):
            return Response(status=403)
        projeto = campo.projeto
        nome = campo.nome
        campo.delete()
        registar_atividade(projeto, request.user, "CAMPO_REMOVIDO", f"Removeu campo «{nome}»")
        return Response(status=204)


class ValorCampoAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, objetivo_id):
        denied = _deny_mutacao(request.user)
        if denied:
            return denied
        _objetivo_visivel(request.user, objetivo_id)
        campo_id = request.data.get("campo")
        valor, _ = ValorCampoPersonalizado.objects.update_or_create(
            objetivo_id=objetivo_id,
            campo_id=campo_id,
            defaults={
                "valor_texto": request.data.get("valor_texto", ""),
                "valor_numero": request.data.get("valor_numero"),
                "valor_data": request.data.get("valor_data"),
            },
        )
        return Response(ValorCampoSerializer(valor).data)


class VistaGuardadaListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, projeto_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
        _projeto_visivel(request.user, projeto_id)
        qs = VistaGuardada.objects.filter(projeto_id=projeto_id, utilizador=request.user)
        return Response(VistaGuardadaSerializer(qs, many=True).data)

    def post(self, request, projeto_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
        _projeto_visivel(request.user, projeto_id)
        data = {
            **request.data,
            "projeto": projeto_id,
            "utilizador": request.user.pk,
        }
        ser = VistaGuardadaWriteSerializer(data=data)
        ser.is_valid(raise_exception=True)
        if ser.validated_data.get("padrao"):
            VistaGuardada.objects.filter(projeto_id=projeto_id, utilizador=request.user).update(padrao=False)
        vista = ser.save()
        return Response(VistaGuardadaSerializer(vista).data, status=201)


class VistaGuardadaDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        if not _projeto_perm(request.user):
            return Response(status=403)
        vista = get_object_or_404(VistaGuardada, pk=pk, utilizador=request.user)
        vista.delete()
        return Response(status=204)

    def patch(self, request, pk):
        if not _projeto_perm(request.user):
            return Response(status=403)
        vista = get_object_or_404(VistaGuardada, pk=pk, utilizador=request.user)
        if request.data.get("padrao"):
            VistaGuardada.objects.filter(projeto=vista.projeto, utilizador=request.user).update(padrao=False)
        ser = VistaGuardadaWriteSerializer(vista, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        vista = ser.save()
        return Response(VistaGuardadaSerializer(vista).data)


class AtividadeProjetoAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, projeto_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
        _projeto_visivel(request.user, projeto_id)
        qs = AtividadeProjeto.objects.filter(projeto_id=projeto_id).select_related(
            "utilizador", "objetivo"
        )[:100]
        return Response(AtividadeSerializer(qs, many=True).data)


class TimelineAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, projeto_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
        _projeto_visivel(request.user, projeto_id)
        objetivos = (
            Objetivo.objects.filter(secao__projeto_id=projeto_id)
            .select_related("responsavel", "secao")
            .order_by("data_inicio", "data_limite", "ordem")
        )
        deps = DependenciaObjetivo.objects.filter(
            sucessora__secao__projeto_id=projeto_id
        ).values("id", "predecessora_id", "sucessora_id")
        items = []
        for o in objetivos:
            items.append(
                {
                    "id": o.id,
                    "titulo": o.titulo,
                    "estado": o.estado,
                    "data_inicio": o.data_inicio.isoformat() if o.data_inicio else None,
                    "data_limite": o.data_limite.isoformat() if o.data_limite else None,
                    "responsavel_nome": nome_responsavel_objetivo(o),
                    "secao_nome": o.secao.nome,
                }
            )
        return Response({"tarefas": items, "dependencias": list(deps)})


class ProjetoExportCSVAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, projeto_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
        from portic_crm.core.export import csv_response
        from portic_crm.projetos.services import nome_responsavel_objetivo

        projeto = _projeto_visivel(request.user, projeto_id)
        objetivos = (
            Objetivo.objects.filter(secao__projeto_id=projeto_id)
            .select_related("secao", "responsavel")
            .prefetch_related("subtarefas")
            .order_by("secao__ordem", "ordem")
        )
        rows = []
        for obj in objetivos:
            total_sub = obj.subtarefas.count()
            concluidas = obj.subtarefas.filter(concluida=True).count()
            rows.append(
                {
                    "secao": obj.secao.nome,
                    "titulo": obj.titulo,
                    "estado": obj.get_estado_display(),
                    "responsavel": nome_responsavel_objetivo(obj),
                    "data_inicio": obj.data_inicio.isoformat() if obj.data_inicio else "",
                    "data_limite": obj.data_limite.isoformat() if obj.data_limite else "",
                    "subtarefas": f"{concluidas}/{total_sub}",
                }
            )
        return csv_response(
            f"projeto_{projeto_id}_tarefas.csv",
            [
                ("secao", "Secção"),
                ("titulo", "Título"),
                ("estado", "Estado"),
                ("responsavel", "Responsável"),
                ("data_inicio", "Início"),
                ("data_limite", "Prazo"),
                ("subtarefas", "Subtarefas"),
            ],
            rows,
            actor=request.user,
            modulo="projetos",
        )


class AnexoObjetivoListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, objetivo_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
        _objetivo_visivel(request.user, objetivo_id)
        qs = AnexoObjetivo.objects.filter(objetivo_id=objetivo_id).select_related(
            "carregado_por"
        )
        return Response(
            AnexoObjetivoSerializer(qs, many=True, context={"request": request}).data
        )

    def post(self, request, objetivo_id):
        denied = _deny_mutacao(request.user)
        if denied:
            return denied
        objetivo = _objetivo_visivel(request.user, objetivo_id)
        ficheiro = request.FILES.get("ficheiro")
        if not ficheiro:
            return Response(
                {"error": "Ficheiro obrigatório."}, status=status.HTTP_400_BAD_REQUEST
            )
        if ficheiro.size > TAMANHO_MAX_ANEXO_BYTES:
            return Response(
                {"error": "O ficheiro não pode exceder 25 MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        anexo = AnexoObjetivo.objects.create(
            objetivo=objetivo,
            ficheiro=ficheiro,
            nome_original=ficheiro.name,
            tamanho=ficheiro.size,
            tipo_mime=ficheiro.content_type or "",
            carregado_por=request.user,
        )
        registar_atividade(
            objetivo.projeto,
            request.user,
            "ANEXO_CRIADO",
            f"Adicionou anexo «{anexo.nome_original}» em «{objetivo.titulo}»",
            objetivo=objetivo,
        )
        return Response(
            AnexoObjetivoSerializer(anexo, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AnexoObjetivoDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        denied = _deny_mutacao(request.user)
        if denied:
            return denied
        anexo = get_object_or_404(
            AnexoObjetivo.objects.select_related("objetivo__secao__projeto"), pk=pk
        )
        if not usuario_pode_ver_projeto(request.user, anexo.objetivo.projeto):
            return Response(status=403)
        objetivo = anexo.objetivo
        nome = anexo.nome_original
        if anexo.ficheiro:
            anexo.ficheiro.delete(save=False)
        anexo.delete()
        registar_atividade(
            objetivo.projeto,
            request.user,
            "ANEXO_ELIMINADO",
            f"Eliminou anexo «{nome}» de «{objetivo.titulo}»",
            objetivo=objetivo,
        )
        return Response(status=204)


class ProjetoAnexosAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, projeto_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
        _projeto_visivel(request.user, projeto_id)
        qs = (
            AnexoObjetivo.objects.filter(objetivo__secao__projeto_id=projeto_id)
            .select_related("carregado_por", "objetivo__secao")
            .order_by("-created_at")
        )
        return Response(
            AnexoProjetoSerializer(qs, many=True, context={"request": request}).data
        )
