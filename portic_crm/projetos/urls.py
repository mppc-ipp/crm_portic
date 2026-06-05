from django.urls import path

from portic_crm.projetos import views

app_name = "projetos"

urlpatterns = [
    path("", views.ProjetoListView.as_view(), name="list"),
    path("novo/", views.ProjetoCreateView.as_view(), name="create"),
    path("<int:pk>/", views.ProjetoDetailView.as_view(), name="detail"),
    path(
        "objetivos/<int:pk>/",
        views.ObjetivoDetailPartialView.as_view(),
        name="objetivo_detail",
    ),
]
