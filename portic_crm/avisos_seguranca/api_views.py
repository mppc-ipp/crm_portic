from django.db.models import Q
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from portic_crm.avisos_seguranca.models import (
    AvisoSeguranca,
    EventoSeguranca,
    OcorrenciaSeguranca,
    TipoEventoSeguranca,
    TipoOcorrencia,
)
from portic_crm.avisos_seguranca.serializers import (
    AvisoSegurancaSerializer,
    EventoSegurancaSerializer,
    OcorrenciaSegurancaSerializer,
    TipoEventoSegurancaSerializer,
    TipoOcorrenciaSerializer,
)
from portic_crm.avisos_seguranca.services.agenda import agenda_por_dia_payload
from portic_crm.core.audit import AcaoAuditoria, registar_auditoria
from portic_crm.core.permissions import is_admin_geral


def _pode_ver(user) -> bool:
    return is_admin_geral(user) or user.has_perm("avisos_seguranca.view_avisoseguranca")


def _pode_gerir_avisos(user) -> bool:
    return is_admin_geral(user) or user.has_perm("avisos_seguranca.gerir_avisos")


def _pode_gerir_ocorrencias(user) -> bool:
    return is_admin_geral(user) or user.has_perm("avisos_seguranca.gerir_ocorrencias")


def _pode_gerir_eventos(user) -> bool:
    return is_admin_geral(user) or user.has_perm("avisos_seguranca.gerir_eventos")


def _pode_configurar_tipos(user) -> bool:
    return is_admin_geral(user) or user.has_perm("administrador.gerir_utilizadores")


class AgendaSegurancaAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _pode_ver(request.user):
            return Response({"error": "Sem permissão"}, status=403)
        return Response(agenda_por_dia_payload(request))


class AvisoSegurancaViewSet(viewsets.ModelViewSet):
    serializer_class = AvisoSegurancaSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    pagination_class = None

    def get_queryset(self):
        if not _pode_ver(self.request.user):
            return AvisoSeguranca.objects.none()
        qs = AvisoSeguranca.objects.select_related("criado_por").all()
        apenas_ativos = self.request.query_params.get("ativos", "1")
        if apenas_ativos == "1":
            qs = AvisoSeguranca.visiveis_agora()
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(titulo__icontains=q) | Q(conteudo__icontains=q))
        return qs

    def list(self, request, *args, **kwargs):
        if request.query_params.get("format") == "csv":
            if not _pode_ver(request.user):
                return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
            from portic_crm.core.export import csv_response

            qs = self.filter_queryset(self.get_queryset())
            return csv_response(
                "avisos_seguranca.csv",
                [
                    ("titulo", "Título"),
                    ("nivel", "Nível"),
                    ("data_inicio", "Data início"),
                    ("data_fim", "Data fim"),
                    ("ativo", "Activo"),
                    ("criado_por", "Criado por"),
                ],
                [
                    {
                        "titulo": a.titulo,
                        "nivel": a.get_nivel_display(),
                        "data_inicio": a.data_inicio.isoformat(),
                        "data_fim": a.data_fim.isoformat() if a.data_fim else "",
                        "ativo": "Sim" if a.ativo else "Não",
                        "criado_por": (
                            a.criado_por.get_full_name() or a.criado_por.email if a.criado_por else ""
                        ),
                    }
                    for a in qs
                ],
                actor=request.user,
                modulo="avisos_seguranca",
            )
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if not _pode_gerir_avisos(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        aviso = serializer.save(criado_por=request.user)
        registar_auditoria(
            AcaoAuditoria.SEG_AVISO_CRIADO,
            f"Criou aviso de segurança «{aviso.titulo}»",
            actor=request.user,
            alvo=aviso,
        )
        return Response(self.get_serializer(aviso).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        if not _pode_gerir_avisos(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        aviso = self.get_object()
        response = super().update(request, *args, **kwargs)
        registar_auditoria(
            AcaoAuditoria.SEG_AVISO_EDITADO,
            f"Editou aviso de segurança «{aviso.titulo}»",
            actor=request.user,
            alvo=aviso,
        )
        return response

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not _pode_gerir_avisos(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        aviso = self.get_object()
        titulo = aviso.titulo
        aviso.ativo = False
        aviso.save(update_fields=["ativo"])
        registar_auditoria(
            AcaoAuditoria.SEG_AVISO_REMOVIDO,
            f"Removeu aviso de segurança «{titulo}»",
            actor=request.user,
            alvo=aviso,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class OcorrenciaSegurancaViewSet(viewsets.ModelViewSet):
    serializer_class = OcorrenciaSegurancaSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    pagination_class = None

    def get_queryset(self):
        if not _pode_ver(self.request.user):
            return OcorrenciaSeguranca.objects.none()
        qs = OcorrenciaSeguranca.objects.select_related("registado_por", "tipo").all()
        dia = self.request.query_params.get("dia", "").strip()
        if dia:
            qs = qs.filter(data_hora__date=parse_date(dia))
        estado = self.request.query_params.get("estado", "").strip()
        if estado:
            qs = qs.filter(estado=estado)
        tipo = self.request.query_params.get("tipo", "").strip()
        if tipo:
            qs = qs.filter(tipo_id=tipo)
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(titulo__icontains=q) | Q(descricao__icontains=q) | Q(local__icontains=q))
        return qs

    def list(self, request, *args, **kwargs):
        if request.query_params.get("format") == "csv":
            if not _pode_ver(request.user):
                return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
            from portic_crm.core.export import csv_response

            qs = self.filter_queryset(self.get_queryset())
            return csv_response(
                "ocorrencias_seguranca.csv",
                [
                    ("data_hora", "Data e hora"),
                    ("titulo", "Título"),
                    ("tipo", "Tipo"),
                    ("local", "Local"),
                    ("estado", "Estado"),
                    ("descricao", "Descrição"),
                    ("registado_por", "Registado por"),
                ],
                [
                    {
                        "data_hora": o.data_hora.strftime("%d/%m/%Y %H:%M"),
                        "titulo": o.titulo,
                        "tipo": o.tipo.nome if o.tipo else "",
                        "local": o.local,
                        "estado": o.get_estado_display(),
                        "descricao": o.descricao,
                        "registado_por": (
                            o.registado_por.get_full_name() or o.registado_por.email
                            if o.registado_por
                            else ""
                        ),
                    }
                    for o in qs
                ],
                actor=request.user,
                modulo="avisos_seguranca",
            )
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if not _pode_gerir_ocorrencias(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ocorrencia = serializer.save(registado_por=request.user)
        registar_auditoria(
            AcaoAuditoria.SEG_OCORRENCIA_CRIADA,
            f"Registou ocorrência de segurança «{ocorrencia.titulo}»",
            actor=request.user,
            alvo=ocorrencia,
        )
        return Response(self.get_serializer(ocorrencia).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        if not _pode_gerir_ocorrencias(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        ocorrencia = self.get_object()
        response = super().update(request, *args, **kwargs)
        registar_auditoria(
            AcaoAuditoria.SEG_OCORRENCIA_EDITADA,
            f"Editou ocorrência de segurança «{ocorrencia.titulo}»",
            actor=request.user,
            alvo=ocorrencia,
        )
        return response

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not _pode_gerir_ocorrencias(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        ocorrencia = self.get_object()
        titulo = ocorrencia.titulo
        ocorrencia.delete()
        registar_auditoria(
            AcaoAuditoria.SEG_OCORRENCIA_REMOVIDA,
            f"Removeu ocorrência de segurança «{titulo}»",
            actor=request.user,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class TipoOcorrenciaViewSet(viewsets.ModelViewSet):
    serializer_class = TipoOcorrenciaSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if not (_pode_ver(user) or _pode_configurar_tipos(user)):
            return TipoOcorrencia.objects.none()
        qs = TipoOcorrencia.objects.all()
        if not _pode_configurar_tipos(user):
            qs = qs.filter(ativo=True)
        elif self.request.query_params.get("ativos") == "1":
            qs = qs.filter(ativo=True)
        return qs

    def create(self, request, *args, **kwargs):
        if not _pode_configurar_tipos(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            tipo = TipoOcorrencia.objects.get(pk=response.data["id"])
            registar_auditoria(
                AcaoAuditoria.SEG_TIPO_OCOR_CRIADO,
                f"Criou tipo de ocorrência «{tipo.nome}»",
                actor=request.user,
                alvo=tipo,
            )
        return response

    def update(self, request, *args, **kwargs):
        if not _pode_configurar_tipos(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        tipo = self.get_object()
        response = super().update(request, *args, **kwargs)
        registar_auditoria(
            AcaoAuditoria.SEG_TIPO_OCOR_EDITADO,
            f"Editou tipo de ocorrência «{tipo.nome}»",
            actor=request.user,
            alvo=tipo,
        )
        return response

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not _pode_configurar_tipos(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        tipo = self.get_object()
        nome = tipo.nome
        tipo.ativo = False
        tipo.save(update_fields=["ativo"])
        registar_auditoria(
            AcaoAuditoria.SEG_TIPO_OCOR_REMOVIDO,
            f"Desactivou tipo de ocorrência «{nome}»",
            actor=request.user,
            alvo=tipo,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class EventoSegurancaViewSet(viewsets.ModelViewSet):
    serializer_class = EventoSegurancaSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    pagination_class = None

    def get_queryset(self):
        if not _pode_ver(self.request.user):
            return EventoSeguranca.objects.none()
        qs = EventoSeguranca.objects.select_related("tipo", "criado_por")
        periodo = self.request.query_params.get("periodo", "todos")
        from django.utils import timezone

        agora = timezone.now()
        if periodo == "futuros":
            qs = qs.filter(data_fim__gte=agora)
        elif periodo == "passados":
            qs = qs.filter(data_fim__lt=agora).order_by("-data_inicio")
            return qs
        inicio = parse_datetime(self.request.query_params.get("inicio", ""))
        fim = parse_datetime(self.request.query_params.get("fim", ""))
        if inicio and fim:
            qs = qs.filter(data_inicio__lt=fim, data_fim__gt=inicio)
        tipo = self.request.query_params.get("tipo")
        if tipo:
            qs = qs.filter(tipo_id=tipo)
        return qs.order_by("data_inicio")

    def create(self, request, *args, **kwargs):
        if not _pode_gerir_eventos(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        evento = serializer.save(criado_por=request.user)
        registar_auditoria(
            AcaoAuditoria.SEG_EVENTO_CRIADO,
            f"Criou evento de segurança «{evento.titulo}»",
            actor=request.user,
            alvo=evento,
        )
        return Response(self.get_serializer(evento).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        if not _pode_gerir_eventos(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        evento = self.get_object()
        response = super().update(request, *args, **kwargs)
        registar_auditoria(
            AcaoAuditoria.SEG_EVENTO_EDITADO,
            f"Editou evento de segurança «{evento.titulo}»",
            actor=request.user,
            alvo=evento,
        )
        return response

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not _pode_gerir_eventos(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        evento = self.get_object()
        titulo = evento.titulo
        evento.delete()
        registar_auditoria(
            AcaoAuditoria.SEG_EVENTO_REMOVIDO,
            f"Removeu evento de segurança «{titulo}»",
            actor=request.user,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class TipoEventoSegurancaViewSet(viewsets.ModelViewSet):
    serializer_class = TipoEventoSegurancaSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if not (_pode_ver(user) or _pode_configurar_tipos(user)):
            return TipoEventoSeguranca.objects.none()
        qs = TipoEventoSeguranca.objects.all()
        if not _pode_configurar_tipos(user):
            qs = qs.filter(ativo=True)
        elif self.request.query_params.get("ativos") == "1":
            qs = qs.filter(ativo=True)
        return qs

    def create(self, request, *args, **kwargs):
        if not _pode_configurar_tipos(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            tipo = TipoEventoSeguranca.objects.get(pk=response.data["id"])
            registar_auditoria(
                AcaoAuditoria.SEG_TIPO_EVENTO_CRIADO,
                f"Criou tipo de evento de segurança «{tipo.nome}»",
                actor=request.user,
                alvo=tipo,
            )
        return response

    def update(self, request, *args, **kwargs):
        if not _pode_configurar_tipos(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        tipo = self.get_object()
        response = super().update(request, *args, **kwargs)
        registar_auditoria(
            AcaoAuditoria.SEG_TIPO_EVENTO_EDITADO,
            f"Editou tipo de evento de segurança «{tipo.nome}»",
            actor=request.user,
            alvo=tipo,
        )
        return response

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not _pode_configurar_tipos(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        tipo = self.get_object()
        nome = tipo.nome
        tipo.ativo = False
        tipo.save(update_fields=["ativo"])
        registar_auditoria(
            AcaoAuditoria.SEG_TIPO_EVENTO_REMOVIDO,
            f"Desactivou tipo de evento de segurança «{nome}»",
            actor=request.user,
            alvo=tipo,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
