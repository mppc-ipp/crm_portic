from django.urls import path

from portic_crm.empresas import views

app_name = "empresas"

urlpatterns = [
    path("", views.EmpresaListView.as_view(), name="list"),
    path("nova/", views.EmpresaCreateView.as_view(), name="create"),
    path("<int:pk>/", views.EmpresaDetailView.as_view(), name="detail"),
    path("<int:pk>/editar/", views.EmpresaUpdateView.as_view(), name="update"),
    path(
        "<int:empresa_pk>/contactos/novo/",
        views.ContactoCreateView.as_view(),
        name="contacto_create",
    ),
    path(
        "contactos/<int:pk>/apagar/",
        views.ContactoDeleteView.as_view(),
        name="contacto_delete",
    ),
]
