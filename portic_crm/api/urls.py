from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from portic_crm.api.auth_views import LoginAPIView, MeAPIView
from portic_crm.api.users_views import UserLookupAPIView, UsersListAPIView
from portic_crm.empresas.api_views import (
    EmpresaInteracaoAPIView,
    EmpresaInteracaoDetailAPIView,
    EmpresaViewSet,
)
from portic_crm.espacos.api_urls import urlpatterns as espacos_urls
from portic_crm.projetos.api_views import ObjetivoViewSet, ProjetoViewSet, SecaoViewSet
from portic_crm.projetos.projetos_api_urls import urlpatterns as projetos_extra_urls
from portic_crm.startups.api_views import (
    CandidaturaViewSet,
    EdicaoViewSet,
    FormularioViewSet,
    StartupViewSet,
)

router = DefaultRouter(trailing_slash=False)
router.register(r"empresas", EmpresaViewSet, basename="empresa")
# Rotas aninhadas antes do recurso pai — senão "edicoes"/"secoes" são tratados como ID
router.register(r"startups/edicoes", EdicaoViewSet, basename="edicao")
router.register(r"startups/candidaturas", CandidaturaViewSet, basename="candidatura")
router.register(r"startups/formularios", FormularioViewSet, basename="formulario")
router.register(r"startups", StartupViewSet, basename="startup")
router.register(r"projetos/secoes", SecaoViewSet, basename="secao")
router.register(r"projetos/objetivos", ObjetivoViewSet, basename="objetivo")
router.register(r"projetos", ProjetoViewSet, basename="projeto")

urlpatterns = [
    path("empresas/<int:empresa_pk>/interacoes", EmpresaInteracaoAPIView.as_view()),
    path(
        "empresas/<int:empresa_pk>/interacoes/<int:pk>",
        EmpresaInteracaoDetailAPIView.as_view(),
    ),
    path("auth/login", LoginAPIView.as_view()),
    path("auth/me", MeAPIView.as_view()),
    path("users", UsersListAPIView.as_view()),
    path("users/lookup", UserLookupAPIView.as_view()),
    path("auth/refresh", TokenRefreshView.as_view()),
    path("", include(router.urls)),
] + projetos_extra_urls + espacos_urls
