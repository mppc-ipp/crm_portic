from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from portic_crm.core.permissions import is_admin_geral
from portic_crm.startups.models import Candidatura, Edicao, FormularioCandidatura, Startup
from portic_crm.startups.serializers import (
    CandidaturaSerializer,
    EdicaoSerializer,
    FormularioSerializer,
    StartupSerializer,
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


class EdicaoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EdicaoSerializer
    permission_classes = [IsAuthenticated]
    queryset = Edicao.objects.all()


class CandidaturaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CandidaturaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not (
            is_admin_geral(user) or user.has_perm("startups.ver_candidaturas")
        ):
            return Candidatura.objects.none()
        return Candidatura.objects.select_related(
            "formulario", "formulario__edicao"
        ).order_by("-submetida_em")


class FormularioViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FormularioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not (
            is_admin_geral(user)
            or user.has_perm("startups.gerir_formularios_candidatura")
        ):
            return FormularioCandidatura.objects.none()
        return FormularioCandidatura.objects.select_related("edicao")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        from django.conf import settings

        ctx["web_url"] = getattr(settings, "WEB_URL", "http://localhost:3000")
        return ctx
