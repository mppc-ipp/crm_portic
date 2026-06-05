from django.urls import path

from portic_crm.startups import views

app_name = "startups"

urlpatterns = [
    path("", views.StartupListView.as_view(), name="list"),
    path("nova/", views.StartupCreateView.as_view(), name="create"),
    path("<int:pk>/", views.StartupDetailView.as_view(), name="detail"),
    path("candidaturas/", views.CandidaturaListView.as_view(), name="candidatura_list"),
    path(
        "candidaturas/<int:pk>/",
        views.CandidaturaDetailView.as_view(),
        name="candidatura_detail",
    ),
    path(
        "candidaturas/<int:pk>/estado/",
        views.CandidaturaEstadoUpdateView.as_view(),
        name="candidatura_estado",
    ),
    path("formularios/", views.FormularioListView.as_view(), name="formulario_list"),
    path(
        "candidatura/<uuid:token>/",
        views.CandidaturaPublicaView.as_view(),
        name="candidatura_publica",
    ),
]
