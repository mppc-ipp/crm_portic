from django.urls import path

from portic_crm.avisos_seguranca.api_views import (
    AgendaSegurancaAPIView,
    AvisoSegurancaViewSet,
    OcorrenciaSegurancaViewSet,
    StatusOcorrenciaViewSet,
    TipoOcorrenciaViewSet,
)

urlpatterns = [
    path("avisos-seguranca/agenda", AgendaSegurancaAPIView.as_view()),
    path(
        "avisos-seguranca/avisos",
        AvisoSegurancaViewSet.as_view({"get": "list", "post": "create"}),
    ),
    path(
        "avisos-seguranca/avisos/<int:pk>",
        AvisoSegurancaViewSet.as_view(
            {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}
        ),
    ),
    path(
        "avisos-seguranca/ocorrencias/tipos",
        TipoOcorrenciaViewSet.as_view({"get": "list", "post": "create"}),
    ),
    path(
        "avisos-seguranca/ocorrencias/tipos/<int:pk>",
        TipoOcorrenciaViewSet.as_view(
            {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}
        ),
    ),
    path(
        "avisos-seguranca/ocorrencias/estados",
        StatusOcorrenciaViewSet.as_view({"get": "list", "post": "create"}),
    ),
    path(
        "avisos-seguranca/ocorrencias/estados/<int:pk>",
        StatusOcorrenciaViewSet.as_view(
            {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}
        ),
    ),
    path(
        "avisos-seguranca/ocorrencias",
        OcorrenciaSegurancaViewSet.as_view({"get": "list", "post": "create"}),
    ),
    path(
        "avisos-seguranca/ocorrencias/<int:pk>",
        OcorrenciaSegurancaViewSet.as_view(
            {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}
        ),
    ),
]
