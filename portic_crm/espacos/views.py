from django.contrib import messages
from django.db.models import Q
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.views.generic import CreateView, ListView, TemplateView

from portic_crm.core.permissions import ModulePermissionMixin
from portic_crm.espacos.models import (
    ConfiguracaoModulos,
    ModuloEspaco,
    PedidoReserva,
    Sala,
    StatusPedidoReserva,
    Viatura,
)


class EspacosHomeView(ModulePermissionMixin, TemplateView):
    permission_required = "espacos.view_sala"
    template_name = "espacos/home.html"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        config = ConfiguracaoModulos.get_solo()
        ctx["config"] = config
        ctx["salas_count"] = Sala.objects.filter(ativo=True).count()
        ctx["viaturas_count"] = Viatura.objects.filter(ativo=True).count()
        return ctx


class SalaListView(ModulePermissionMixin, ListView):
    model = Sala
    permission_required = "espacos.view_sala"
    template_name = "espacos/sala_list.html"
    context_object_name = "salas"

    def get_queryset(self):
        return super().get_queryset().filter(ativo=True).select_related("unidade")


class ViaturaListView(ModulePermissionMixin, ListView):
    model = Viatura
    permission_required = "espacos.view_sala"
    template_name = "espacos/viatura_list.html"
    context_object_name = "viaturas"

    def get_queryset(self):
        return super().get_queryset().filter(ativo=True).select_related("unidade")


class MinhasReservasView(ModulePermissionMixin, ListView):
    model = PedidoReserva
    permission_required = "espacos.view_sala"
    template_name = "espacos/minhas_reservas.html"
    context_object_name = "pedidos"

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(utilizador=self.request.user)
            .prefetch_related("ocorrencias")
            .order_by("-created_at")
        )


class PedidoReservaCreateView(ModulePermissionMixin, CreateView):
    model = PedidoReserva
    permission_required = "espacos.add_pedidoreserva"
    fields = ["modulo", "titulo", "descricao", "numero_pessoas"]
    template_name = "espacos/pedido_form.html"
    success_url = reverse_lazy("espacos:minhas_reservas")

    def form_valid(self, form):
        form.instance.utilizador = self.request.user
        form.instance.criado_por = self.request.user
        form.instance.status = StatusPedidoReserva.PENDENTE
        messages.success(
            self.request,
            "Pedido criado. Um administrador irá validar as ocorrências.",
        )
        return super().form_valid(form)

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        config = ConfiguracaoModulos.get_solo()
        modulos = []
        if config.modulo_salas_ativo:
            modulos.append((ModuloEspaco.SALA, "Salas"))
        if config.modulo_viaturas_ativo:
            modulos.append((ModuloEspaco.VIATURA, "Viaturas"))
        ctx["modulos_disponiveis"] = modulos
        return ctx
