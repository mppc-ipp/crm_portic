from functools import wraps

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin, PermissionRequiredMixin
from django.core.exceptions import PermissionDenied
from django.shortcuts import redirect


def user_in_group(user, group_name: str) -> bool:
    if not user.is_authenticated:
        return False
    return user.groups.filter(name=group_name).exists()


def is_admin_geral(user) -> bool:
    return user.is_superuser or user_in_group(user, settings.GRUPO_ADMIN_GERAL)


def is_utilizador_comum(user) -> bool:
    return user_in_group(user, settings.GRUPO_UTILIZADOR_COMUM) and not is_admin_geral(user)


def get_login_redirect_url(user) -> str:
    if user.has_perm("dashboard.view_dashboard") or is_admin_geral(user):
        return "/dashboard/"
    if user.has_perm("empresas.view_empresa"):
        return "/empresas/"
    if user.has_perm("startups.view_startup"):
        return "/startups/"
    if user.has_perm("projetos.view_projeto"):
        return "/projetos/"
    if user.has_perm("marketing.view_publicacao"):
        return "/marketing/"
    if user.has_perm("administrador.gerir_utilizadores"):
        return "/administrador/"
    return "/dashboard/"


MODULE_PERMISSIONS = {
    "empresas": "empresas.view_empresa",
    "startups": "startups.view_startup",
    "projetos": "projetos.view_projeto",
    "dashboard": "dashboard.view_dashboard",
    "administrador": "administrador.gerir_utilizadores",
    "marketing": "marketing.view_publicacao",
}

# Permissões granulares expostas na UI de administração
PERMISSION_CATALOG = {
    "dashboard": {
        "label": "Dashboard",
        "permissions": [
            ("dashboard.view_dashboard", "Ver dashboard"),
            ("dashboard.gerir_eventos", "Gerir eventos"),
        ],
    },
    "empresas": {
        "label": "Empresas",
        "permissions": [
            ("empresas.view_empresa", "Ver empresas"),
            ("empresas.add_empresa", "Criar empresas"),
            ("empresas.change_empresa", "Editar empresas"),
            ("empresas.delete_empresa", "Eliminar empresas"),
        ],
    },
    "startups": {
        "label": "Startups",
        "permissions": [
            ("startups.view_startup", "Ver startups"),
            ("startups.gerir_formularios_candidatura", "Gerir formulários de candidatura"),
            ("startups.ver_candidaturas", "Ver candidaturas"),
            ("startups.alterar_estado_candidatura", "Alterar estado de candidatura"),
            ("startups.classificar_candidatura", "Classificar candidatura"),
        ],
    },
    "projetos": {
        "label": "Projetos",
        "permissions": [
            ("projetos.view_projeto", "Ver projetos"),
            ("projetos.add_projeto", "Criar projetos"),
            ("projetos.change_projeto", "Editar projetos"),
            ("projetos.delete_projeto", "Eliminar projetos"),
        ],
    },
    "administrador": {
        "label": "Administração",
        "permissions": [
            ("administrador.gerir_utilizadores", "Gerir utilizadores e permissões"),
        ],
    },
    "marketing": {
        "label": "Marketing",
        "permissions": [
            ("marketing.view_publicacao", "Ver publicações"),
            ("marketing.add_publicacao", "Criar publicações"),
            ("marketing.change_publicacao", "Editar publicações"),
            ("marketing.delete_publicacao", "Eliminar publicações"),
            ("marketing.publicar", "Publicar e agendar"),
            ("marketing.gerir_contas", "Ligar contas sociais"),
        ],
    },
}


def user_can_access_module(user, module: str) -> bool:
    if is_admin_geral(user):
        return True
    perm = MODULE_PERMISSIONS.get(module)
    return bool(perm and user.has_perm(perm))


def pode_gerir_utilizadores(user) -> bool:
    return is_admin_geral(user) or user.has_perm("administrador.gerir_utilizadores")


class ModulePermissionMixin(LoginRequiredMixin, PermissionRequiredMixin):
    """Mixin base com login obrigatório."""

    raise_exception = True

    def has_permission(self):
        if is_admin_geral(self.request.user):
            return True
        return super().has_permission()


def permission_required_or_403(perm):
    def decorator(view_func):
        @wraps(view_func)
        @login_required
        def _wrapped(request, *args, **kwargs):
            if not request.user.has_perm(perm) and not is_admin_geral(request.user):
                raise PermissionDenied
            return view_func(request, *args, **kwargs)

        return _wrapped

    return decorator


def redirect_by_role(view_func):
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        if request.user.is_authenticated:
            return redirect(get_login_redirect_url(request.user))
        return view_func(request, *args, **kwargs)

    return _wrapped
