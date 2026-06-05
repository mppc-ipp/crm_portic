from django.urls import path

from portic_crm.espacos import views

app_name = "espacos"

urlpatterns = [
    path("", views.EspacosHomeView.as_view(), name="home"),
    path("salas/", views.SalaListView.as_view(), name="sala_list"),
    path("viaturas/", views.ViaturaListView.as_view(), name="viatura_list"),
    path("minhas-reservas/", views.MinhasReservasView.as_view(), name="minhas_reservas"),
    path("reservar/", views.PedidoReservaCreateView.as_view(), name="pedido_create"),
]
