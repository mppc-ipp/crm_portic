from django.contrib.auth.models import Group, User
from django.views.generic import ListView, TemplateView

from portic_crm.core.permissions import ModulePermissionMixin


class AdministradorHomeView(ModulePermissionMixin, TemplateView):
    permission_required = "administrador.gerir_utilizadores"
    template_name = "administrador/index.html"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["utilizadores"] = User.objects.filter(is_active=True).order_by("username")[:50]
        ctx["grupos"] = Group.objects.all()
        return ctx


class UtilizadorListView(ModulePermissionMixin, ListView):
    model = User
    permission_required = "administrador.gerir_utilizadores"
    template_name = "administrador/utilizador_list.html"
    context_object_name = "utilizadores"

    def get_queryset(self):
        return User.objects.filter(is_active=True).prefetch_related("groups").order_by(
            "username"
        )
