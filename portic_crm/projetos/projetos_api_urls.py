from django.urls import path

from portic_crm.projetos.extra_api_views import (
    AtividadeProjetoAPIView,
    CampoPersonalizadoDetailAPIView,
    CampoPersonalizadoListCreateAPIView,
    ComentarioListCreateAPIView,
    DependenciaDetailAPIView,
    DependenciaListCreateAPIView,
    ObjetivoDetailAPIView,
    ProjetoExportCSVAPIView,
    SubtarefaDetailAPIView,
    SubtarefaListCreateAPIView,
    TimelineAPIView,
    ValorCampoAPIView,
    VistaGuardadaDetailAPIView,
    VistaGuardadaListCreateAPIView,
)

urlpatterns = [
    path("projetos/objetivos/<int:pk>/detalhe", ObjetivoDetailAPIView.as_view()),
    path("projetos/objetivos/<int:objetivo_id>/subtarefas", SubtarefaListCreateAPIView.as_view()),
    path("projetos/subtarefas/<int:pk>", SubtarefaDetailAPIView.as_view()),
    path("projetos/objetivos/<int:objetivo_id>/comentarios", ComentarioListCreateAPIView.as_view()),
    path("projetos/objetivos/<int:objetivo_id>/dependencias", DependenciaListCreateAPIView.as_view()),
    path("projetos/dependencias/<int:pk>", DependenciaDetailAPIView.as_view()),
    path("projetos/<int:projeto_id>/campos", CampoPersonalizadoListCreateAPIView.as_view()),
    path("projetos/campos/<int:pk>", CampoPersonalizadoDetailAPIView.as_view()),
    path("projetos/objetivos/<int:objetivo_id>/valores-campos", ValorCampoAPIView.as_view()),
    path("projetos/<int:projeto_id>/vistas", VistaGuardadaListCreateAPIView.as_view()),
    path("projetos/vistas/<int:pk>", VistaGuardadaDetailAPIView.as_view()),
    path("projetos/<int:projeto_id>/atividade", AtividadeProjetoAPIView.as_view()),
    path("projetos/<int:projeto_id>/timeline", TimelineAPIView.as_view()),
    path("projetos/<int:projeto_id>/export", ProjetoExportCSVAPIView.as_view()),
]
