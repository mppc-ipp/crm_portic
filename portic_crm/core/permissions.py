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
    if is_utilizador_comum(user):
        return "/espacos/"
    if user.has_perm("dashboard.view_dashboard"):
        return "/dashboard/"
    if user.has_perm("espacos.view_sala"):
        return "/espacos/"
    return "/admin/"


MODULE_PERMISSIONS = {
    "empresas": "empresas.view_empresa",
    "startups": "startups.view_startup",
    "projetos": "projetos.view_projeto",
    "espacos": "espacos.view_sala",
    "dashboard": "dashboard.view_dashboard",
    "administrador": "administrador.gerir_utilizadores",
}


def user_can_access_module(user, module: str) -> bool:
    if is_admin_geral(user):
        return True
    perm = MODULE_PERMISSIONS.get(module)
    return bool(perm and user.has_perm(perm))


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
