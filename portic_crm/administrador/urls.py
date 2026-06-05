from django.urls import path

from portic_crm.administrador import views

app_name = "administrador"

urlpatterns = [
    path("", views.AdministradorHomeView.as_view(), name="index"),
    path("utilizadores/", views.UtilizadorListView.as_view(), name="utilizador_list"),
]
