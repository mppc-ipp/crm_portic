from django.urls import path

from portic_crm.teletrabalho.api_views import (
    GestaoRegistosTeletrabalhoAPIView,
    MeusRegistosTeletrabalhoAPIView,
    RegistroTeletrabalhoCreateAPIView,
)

urlpatterns = [
    path("teletrabalho/registos", RegistroTeletrabalhoCreateAPIView.as_view()),
    path("teletrabalho/registos/me", MeusRegistosTeletrabalhoAPIView.as_view()),
    path("teletrabalho/gestao/registos", GestaoRegistosTeletrabalhoAPIView.as_view()),
]
