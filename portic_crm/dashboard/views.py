from datetime import timedelta

from django.db.models import Count
from django.utils import timezone
from django.views.generic import ListView, TemplateView

from portic_crm.core.permissions import ModulePermissionMixin
from portic_crm.dashboard.models import Evento
from portic_crm.startups.models import Candidatura, ContratoResidencia, Edicao, Startup


class DashboardView(ModulePermissionMixin, TemplateView):
    permission_required = "dashboard.view_dashboard"
    template_name = "dashboard/index.html"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        hoje = timezone.now().date()
        limite = hoje + timedelta(days=90)

        ctx["startups_por_ano"] = (
            Startup.objects.values("edicao__ano", "edicao__nome")
            .annotate(total=Count("id"))
            .order_by("-edicao__ano")
        )
        ctx["contratos_a_expirar"] = ContratoResidencia.objects.filter(
            ativo=True,
            data_fim__lte=limite,
            data_fim__gte=hoje,
        ).select_related("startup")
        ctx["candidaturas_em_curso"] = Candidatura.objects.exclude(
            estado__in=["APROVADA", "REJEITADA"]
        ).count()
        ctx["proximos_eventos"] = Evento.proximos_eventos(self.request.user)[:10]
        ctx["edicoes"] = Edicao.objects.filter(ativa=True)
        return ctx


class EventoListView(ModulePermissionMixin, ListView):
    model = Evento
    permission_required = "dashboard.gerir_eventos"
    template_name = "dashboard/evento_list.html"
    context_object_name = "eventos"

    def get_queryset(self):
        return Evento.filtrar_visiveis_para(super().get_queryset(), self.request.user)
