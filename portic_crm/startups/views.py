from django.contrib import messages
from django.db import transaction
from django.db.models import Count
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.views import View
from django.views.generic import CreateView, DetailView, ListView, UpdateView

from portic_crm.core.permissions import ModulePermissionMixin
from portic_crm.startups.models import (
    Candidatura,
    CampoFormulario,
    Edicao,
    FormularioCandidatura,
    RespostaCampo,
    Startup,
)


class StartupListView(ModulePermissionMixin, ListView):
    model = Startup
    permission_required = "startups.view_startup"
    template_name = "startups/startup_list.html"
    context_object_name = "startups"

    def get_queryset(self):
        qs = super().get_queryset().select_related("edicao", "empresa")
        ano = self.request.GET.get("ano")
        if ano:
            qs = qs.filter(edicao__ano=ano)
        return qs

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["edicoes"] = Edicao.objects.order_by("-ano")
        ctx["ano_atual"] = self.request.GET.get("ano", "")
        return ctx


class StartupDetailView(ModulePermissionMixin, DetailView):
    model = Startup
    permission_required = "startups.view_startup"
    template_name = "startups/startup_detail.html"


class StartupCreateView(ModulePermissionMixin, CreateView):
    model = Startup
    permission_required = "startups.add_startup"
    fields = ["nome", "edicao", "estado_residencia", "empresa", "email_contacto", "telefone_contacto"]
    template_name = "startups/startup_form.html"
    success_url = reverse_lazy("startups:list")


class CandidaturaListView(ModulePermissionMixin, ListView):
    model = Candidatura
    permission_required = "startups.ver_candidaturas"
    template_name = "startups/candidatura_list.html"
    context_object_name = "candidaturas"

    def get_queryset(self):
        return super().get_queryset().select_related("formulario", "formulario__edicao")


class CandidaturaDetailView(ModulePermissionMixin, DetailView):
    model = Candidatura
    permission_required = "startups.ver_candidaturas"
    template_name = "startups/candidatura_detail.html"


class FormularioListView(ModulePermissionMixin, ListView):
    model = FormularioCandidatura
    permission_required = "startups.gerir_formularios_candidatura"
    template_name = "startups/formulario_list.html"
    context_object_name = "formularios"


class CandidaturaPublicaView(View):
    """Formulário público por token — sem login."""

    template_name = "startups/candidatura_publica.html"

    def get_formulario(self, token):
        return get_object_or_404(
            FormularioCandidatura,
            token=token,
            ativo=True,
        )

    def get(self, request, token):
        formulario = self.get_formulario(token)
        now = timezone.now()
        if formulario.fechado_em and now > formulario.fechado_em:
            return render(
                request,
                "startups/candidatura_fechada.html",
                {"formulario": formulario},
            )
        if formulario.aberto_em and now < formulario.aberto_em:
            return render(
                request,
                "startups/candidatura_fechada.html",
                {"formulario": formulario, "ainda_nao_aberto": True},
            )
        campos = formulario.campos.all()
        return render(
            request,
            self.template_name,
            {"formulario": formulario, "campos": campos},
        )

    @transaction.atomic
    def post(self, request, token):
        formulario = self.get_formulario(token)
        nome_startup = request.POST.get("nome_startup", "").strip()
        email_contacto = request.POST.get("email_contacto", "").strip()
        if not nome_startup or not email_contacto:
            messages.error(request, "Nome da startup e email são obrigatórios.")
            return redirect("startups:candidatura_publica", token=token)

        candidatura = Candidatura.objects.create(
            formulario=formulario,
            nome_startup=nome_startup,
            email_contacto=email_contacto,
        )
        for campo in formulario.campos.all():
            valor = request.POST.get(f"campo_{campo.id}", "")
            if campo.obrigatorio and not valor.strip():
                messages.error(request, f"O campo «{campo.nome}» é obrigatório.")
                candidatura.delete()
                return redirect("startups:candidatura_publica", token=token)
            RespostaCampo.objects.create(
                candidatura=candidatura,
                campo=campo,
                valor=valor,
            )
        messages.success(request, "Candidatura submetida com sucesso.")
        return render(
            request,
            "startups/candidatura_submetida.html",
            {"formulario": formulario},
        )


class CandidaturaEstadoUpdateView(ModulePermissionMixin, UpdateView):
    model = Candidatura
    permission_required = "startups.alterar_estado_candidatura"
    fields = ["estado"]
    template_name = "startups/candidatura_estado_form.html"

    def get_success_url(self):
        return reverse("startups:candidatura_detail", kwargs={"pk": self.object.pk})
