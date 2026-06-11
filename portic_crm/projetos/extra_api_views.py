from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from portic_crm.core.permissions import is_admin_geral
from portic_crm.projetos.models import (
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
from portic_crm.projetos.services import nome_responsavel_objetivo, registar_atividade


def _projeto_perm(user):
    return is_admin_geral(user) or user.has_perm("projetos.view_projeto")


class ObjetivoDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if not _projeto_perm(request.user):
            return Response(status=403)
        obj = get_object_or_404(
            Objetivo.objects.select_related("responsavel", "secao__projeto")
            .prefetch_related(
                "subtarefas",
                "comentarios__autor",
                "dependencias_entrada__predecessora",
                "dependencias_saida__sucessora",
                "valores_campos__campo",
            ),
            pk=pk,
        )
        return Response(ObjetivoSerializer(obj).data)


class SubtarefaListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, objetivo_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
        qs = Subtarefa.objects.filter(objetivo_id=objetivo_id).order_by("ordem")
        return Response(SubtarefaSerializer(qs, many=True).data)

    def post(self, request, objetivo_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
        objetivo = get_object_or_404(Objetivo.objects.select_related("secao__projeto"), pk=objetivo_id)
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
        if not _projeto_perm(request.user):
            return Response(status=403)
        st = get_object_or_404(Subtarefa.objects.select_related("objetivo__secao__projeto"), pk=pk)
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
        if not _projeto_perm(request.user):
            return Response(status=403)
        st = get_object_or_404(Subtarefa.objects.select_related("objetivo__secao__projeto"), pk=pk)
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
        qs = ComentarioObjetivo.objects.filter(objetivo_id=objetivo_id).select_related("autor")
        return Response(ComentarioSerializer(qs, many=True).data)

    def post(self, request, objetivo_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
        objetivo = get_object_or_404(Objetivo.objects.select_related("secao__projeto"), pk=objetivo_id)
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
        qs = DependenciaObjetivo.objects.filter(
            Q(predecessora_id=objetivo_id) | Q(sucessora_id=objetivo_id)
        ).select_related("predecessora", "sucessora")
        return Response(DependenciaSerializer(qs, many=True).data)

    def post(self, request, objetivo_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
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
        if not _projeto_perm(request.user):
            return Response(status=403)
        dep = get_object_or_404(
            DependenciaObjetivo.objects.select_related("predecessora", "sucessora__secao__projeto"),
            pk=pk,
        )
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
        qs = CampoPersonalizado.objects.filter(projeto_id=projeto_id)
        return Response(CampoPersonalizadoSerializer(qs, many=True).data)

    def post(self, request, projeto_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
        data = {**request.data, "projeto": projeto_id}
        ser = CampoPersonalizadoWriteSerializer(data=data)
        ser.is_valid(raise_exception=True)
        campo = ser.save()
        projeto = get_object_or_404(Projeto, pk=projeto_id)
        registar_atividade(projeto, request.user, "CAMPO_CRIADO", f"Criou campo «{campo.nome}»")
        return Response(CampoPersonalizadoSerializer(campo).data, status=201)


class CampoPersonalizadoDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        if not _projeto_perm(request.user):
            return Response(status=403)
        campo = get_object_or_404(CampoPersonalizado.objects.select_related("projeto"), pk=pk)
        projeto = campo.projeto
        nome = campo.nome
        campo.delete()
        registar_atividade(projeto, request.user, "CAMPO_REMOVIDO", f"Removeu campo «{nome}»")
        return Response(status=204)


class ValorCampoAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, objetivo_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
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
        qs = VistaGuardada.objects.filter(projeto_id=projeto_id, utilizador=request.user)
        return Response(VistaGuardadaSerializer(qs, many=True).data)

    def post(self, request, projeto_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
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
        qs = AtividadeProjeto.objects.filter(projeto_id=projeto_id).select_related(
            "utilizador", "objetivo"
        )[:100]
        return Response(AtividadeSerializer(qs, many=True).data)


class TimelineAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, projeto_id):
        if not _projeto_perm(request.user):
            return Response(status=403)
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

        projeto = get_object_or_404(Projeto, pk=projeto_id)
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
        )
