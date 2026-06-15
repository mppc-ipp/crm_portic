from django.conf import settings
from django.shortcuts import redirect
from django.views import View
from django.views.generic import RedirectView

from portic_crm.core.permissions import get_login_redirect_url


class HomeRedirectView(RedirectView):
    """Redireciona para o frontend Next.js (interface principal)."""

    permanent = False

    def get_redirect_url(self, *args, **kwargs):
        web_url = getattr(settings, "WEB_URL", "http://localhost:3002").rstrip("/")
        return f"{web_url}/login"


class PorticLoginView(RedirectView):
    permanent = False

    def get_redirect_url(self, *args, **kwargs):
        return f"{getattr(settings, 'WEB_URL', 'http://localhost:3002').rstrip('/')}/login"


class PorticLogoutView(RedirectView):
    permanent = False

    def get_redirect_url(self, *args, **kwargs):
        return f"{getattr(settings, 'WEB_URL', 'http://localhost:3002').rstrip('/')}/login"


class PostLoginRedirectView(View):
    """Redireciona utilizadores autenticados conforme o perfil."""

    def get(self, request):
        if request.user.is_authenticated:
            return redirect(get_login_redirect_url(request.user))
        return redirect("login")
