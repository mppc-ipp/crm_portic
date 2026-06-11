from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from portic_crm.administrador.api_views import (
    AdminAuditoriaAPIView,
    AdminGrupoDetailAPIView,
    AdminGruposListAPIView,
    AdminPermissoesCatalogAPIView,
    AdminSistemaAPIView,
    AdminUtilizadorDetailAPIView,
    AdminUtilizadoresListAPIView,
)
from portic_crm.api.auth_views import LoginAPIView, MeAPIView
from portic_crm.api.users_views import UserLookupAPIView, UsersListAPIView
from portic_crm.core.api_views import (
    NotificacaoDetailAPIView,
    NotificacoesAPIView,
    NotificacoesMarcarTodasAPIView,
)
from portic_crm.dashboard.api_views import DashboardAPIView
from portic_crm.empresas.api_views import (
    EmpresaEstatisticasAPIView,
    EmpresaInteracaoAPIView,
    EmpresaInteracaoDetailAPIView,
    EmpresaViewSet,
    TipoInteracaoViewSet,
)
from portic_crm.espacos.api_urls import urlpatterns as espacos_urls
from portic_crm.projetos.api_views import ObjetivoViewSet, ProjetoViewSet, SecaoViewSet
from portic_crm.projetos.projetos_api_urls import urlpatterns as projetos_extra_urls
from portic_crm.startups.api_views import (
    CandidaturaEstatisticasAPIView,
    CandidaturaHistoricoAPIView,
    CandidaturaHistoricoDetailAPIView,
    CandidaturaPublicaAPIView,
    CandidaturaViewSet,
    EdicaoRelatorioAPIView,
    EdicaoViewSet,
    FormularioViewSet,
    StartupViewSet,
    StatusCandidaturaViewSet,
    TipoHistoricoCandidaturaViewSet,
)

router = DefaultRouter(trailing_slash=False)
router.register(r"empresas/tipos-interacao", TipoInteracaoViewSet, basename="tipo-interacao")
router.register(r"empresas", EmpresaViewSet, basename="empresa")
# Rotas aninhadas antes do recurso pai — senão "edicoes"/"secoes" são tratados como ID
router.register(r"startups/edicoes", EdicaoViewSet, basename="edicao")
router.register(r"startups/candidaturas", CandidaturaViewSet, basename="candidatura")
router.register(r"startups/formularios", FormularioViewSet, basename="formulario")
router.register(
    r"startups/tipos-historico",
    TipoHistoricoCandidaturaViewSet,
    basename="tipo-historico-candidatura",
)
router.register(
    r"startups/estados-candidatura",
    StatusCandidaturaViewSet,
    basename="status-candidatura",
)
router.register(r"startups", StartupViewSet, basename="startup")
router.register(r"projetos/secoes", SecaoViewSet, basename="secao")
router.register(r"projetos/objetivos", ObjetivoViewSet, basename="objetivo")
router.register(r"projetos", ProjetoViewSet, basename="projeto")

urlpatterns = [
    path("dashboard", DashboardAPIView.as_view()),
    path("notificacoes", NotificacoesAPIView.as_view()),
    path("notificacoes/marcar-todas-lidas", NotificacoesMarcarTodasAPIView.as_view()),
    path("notificacoes/<int:pk>", NotificacaoDetailAPIView.as_view()),
    path("empresas/estatisticas", EmpresaEstatisticasAPIView.as_view()),
    path("startups/candidaturas/estatisticas", CandidaturaEstatisticasAPIView.as_view()),
    path("startups/edicoes/relatorio", EdicaoRelatorioAPIView.as_view()),
    path(
        "startups/candidatura-publica/<uuid:token>",
        CandidaturaPublicaAPIView.as_view(),
    ),
    path(
        "startups/candidaturas/<int:candidatura_pk>/historico",
        CandidaturaHistoricoAPIView.as_view(),
    ),
    path(
        "startups/candidaturas/<int:candidatura_pk>/historico/<int:pk>",
        CandidaturaHistoricoDetailAPIView.as_view(),
    ),
    path("empresas/<int:empresa_pk>/interacoes", EmpresaInteracaoAPIView.as_view()),
    path(
        "empresas/<int:empresa_pk>/interacoes/<int:pk>",
        EmpresaInteracaoDetailAPIView.as_view(),
    ),
    path("auth/login", LoginAPIView.as_view()),
    path("auth/me", MeAPIView.as_view()),
    path("users", UsersListAPIView.as_view()),
    path("users/lookup", UserLookupAPIView.as_view()),
    path("admin/utilizadores", AdminUtilizadoresListAPIView.as_view()),
    path("admin/utilizadores/<int:pk>", AdminUtilizadorDetailAPIView.as_view()),
    path("admin/grupos", AdminGruposListAPIView.as_view()),
    path("admin/grupos/<int:pk>", AdminGrupoDetailAPIView.as_view()),
    path("admin/permissoes", AdminPermissoesCatalogAPIView.as_view()),
    path("admin/auditoria", AdminAuditoriaAPIView.as_view()),
    path("admin/sistema", AdminSistemaAPIView.as_view()),
    path("auth/refresh", TokenRefreshView.as_view()),
    path("", include(router.urls)),
] + projetos_extra_urls + espacos_urls
