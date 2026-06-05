from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from portic_crm.core.views import HomeRedirectView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("portic_crm.api.urls")),
    path("", HomeRedirectView.as_view(), name="home"),
    # Redirecionar utilizadores para o frontend Next.js em desenvolvimento
    path("", include("portic_crm.core.urls")),
    path("empresas/", include("portic_crm.empresas.urls")),
    path("startups/", include("portic_crm.startups.urls")),
    path("projetos/", include("portic_crm.projetos.urls")),
    path("espacos/", include("portic_crm.espacos.urls")),
    path("dashboard/", include("portic_crm.dashboard.urls")),
    path("administrador/", include("portic_crm.administrador.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
