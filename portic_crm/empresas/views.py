from django.db.models import Q
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse, reverse_lazy
from django.views.generic import CreateView, DeleteView, DetailView, ListView, UpdateView

from portic_crm.core.permissions import ModulePermissionMixin
from portic_crm.empresas.models import Contacto, Empresa


class EmpresaListView(ModulePermissionMixin, ListView):
    model = Empresa
    permission_required = "empresas.view_empresa"
    template_name = "empresas/empresa_list.html"
    context_object_name = "empresas"
    paginate_by = 25

    def get_queryset(self):
        qs = super().get_queryset()
        q = self.request.GET.get("q", "").strip()
        tipo = self.request.GET.get("tipo", "").strip()
        if q:
            qs = qs.filter(
                Q(nome__icontains=q)
                | Q(nif__icontains=q)
                | Q(setor__icontains=q)
                | Q(cae__icontains=q)
            )
        if tipo:
            qs = qs.filter(tipo=tipo)
        return qs

    def get_template_names(self):
        if self.request.htmx:
            return ["empresas/partials/empresa_table.html"]
        return [self.template_name]

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["tipo_choices"] = Empresa._meta.get_field("tipo").choices
        return ctx


class EmpresaDetailView(ModulePermissionMixin, DetailView):
    model = Empresa
    permission_required = "empresas.view_empresa"
    template_name = "empresas/empresa_detail.html"
    context_object_name = "empresa"


class EmpresaCreateView(ModulePermissionMixin, CreateView):
    model = Empresa
    permission_required = "empresas.add_empresa"
    fields = [
        "nome",
        "nif",
        "cae",
        "setor",
        "tipo",
        "tipo_parceria",
        "estado",
        "email",
        "telefone",
        "morada",
        "codigo_postal",
        "localidade",
        "concelho",
        "distrito",
    ]
    template_name = "empresas/empresa_form.html"
    success_url = reverse_lazy("empresas:list")


class EmpresaUpdateView(ModulePermissionMixin, UpdateView):
    model = Empresa
    permission_required = "empresas.change_empresa"
    fields = [
        "nome",
        "nif",
        "cae",
        "setor",
        "tipo",
        "tipo_parceria",
        "estado",
        "email",
        "telefone",
        "morada",
        "codigo_postal",
        "localidade",
        "concelho",
        "distrito",
    ]
    template_name = "empresas/empresa_form.html"

    def get_success_url(self):
        return reverse("empresas:detail", kwargs={"pk": self.object.pk})


class ContactoCreateView(ModulePermissionMixin, CreateView):
    model = Contacto
    permission_required = "empresas.change_empresa"
    fields = ["nome", "cargo", "email", "telefone"]
    template_name = "empresas/contacto_form.html"

    def dispatch(self, request, *args, **kwargs):
        self.empresa = get_object_or_404(Empresa, pk=kwargs["empresa_pk"])
        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        form.instance.empresa = self.empresa
        return super().form_valid(form)

    def get_success_url(self):
        return reverse("empresas:detail", kwargs={"pk": self.empresa.pk})

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["empresa"] = self.empresa
        return ctx


class ContactoDeleteView(ModulePermissionMixin, DeleteView):
    model = Contacto
    permission_required = "empresas.change_empresa"

    def get_success_url(self):
        return reverse("empresas:detail", kwargs={"pk": self.object.empresa_id})
