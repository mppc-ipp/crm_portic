from django.urls import path

from portic_crm.dashboard import views

app_name = "dashboard"

urlpatterns = [
    path("", views.DashboardView.as_view(), name="index"),
    path("eventos/", views.EventoListView.as_view(), name="evento_list"),
]
