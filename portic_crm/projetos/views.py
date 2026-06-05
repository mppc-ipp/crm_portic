from django.shortcuts import get_object_or_404
from django.urls import reverse_lazy
from django.views.generic import CreateView, DetailView, ListView

from portic_crm.core.permissions import ModulePermissionMixin
from portic_crm.projetos.models import Objetivo, Projeto, Secao


class ProjetoListView(ModulePermissionMixin, ListView):
    model = Projeto
    permission_required = "projetos.view_projeto"
    template_name = "projetos/projeto_list.html"
    context_object_name = "projetos"


class ProjetoDetailView(ModulePermissionMixin, DetailView):
    model = Projeto
    permission_required = "projetos.view_projeto"
    template_name = "projetos/projeto_detail.html"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["secoes"] = self.object.secoes.prefetch_related("objetivos")
        return ctx


class ProjetoCreateView(ModulePermissionMixin, CreateView):
    model = Projeto
    permission_required = "projetos.add_projeto"
    fields = ["nome", "resumo", "responsavel", "estado"]
    template_name = "projetos/projeto_form.html"
    success_url = reverse_lazy("projetos:list")


class ObjetivoDetailPartialView(ModulePermissionMixin, DetailView):
    """Partial HTMX com descrição do objetivo."""

    model = Objetivo
    permission_required = "projetos.view_projeto"
    template_name = "projetos/partials/objetivo_detail.html"
    context_object_name = "objetivo"
