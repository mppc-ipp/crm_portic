from django.urls import path

from portic_crm.marketing.api_views import (
    ContaSocialDeleteAPIView,
    ContaSocialViewSet,
    LinkedInOAuthCallbackAPIView,
    LinkedInOAuthDisponiveisAPIView,
    LinkedInOAuthLigarAPIView,
    LinkedInOAuthStartAPIView,
    MarketingCalendarioAPIView,
    MarketingEstatisticasAPIView,
    MarketingMediaAPIView,
    MetaOAuthCallbackAPIView,
    MetaOAuthDisponiveisAPIView,
    MetaOAuthLigarAPIView,
    MetaOAuthStartAPIView,
    PublicacaoAgendarAPIView,
    PublicacaoCancelarAPIView,
    PublicacaoPublicarAPIView,
    PublicacaoRepublicarAPIView,
    PublicacaoViewSet,
)

publicacao_list = PublicacaoViewSet.as_view({"get": "list", "post": "create"})
publicacao_detail = PublicacaoViewSet.as_view(
    {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}
)
conta_list = ContaSocialViewSet.as_view({"get": "list"})

urlpatterns = [
    path("marketing/publicacoes", publicacao_list),
    path("marketing/publicacoes/<int:pk>", publicacao_detail),
    path("marketing/publicacoes/<int:pk>/publicar", PublicacaoPublicarAPIView.as_view()),
    path("marketing/publicacoes/<int:pk>/agendar", PublicacaoAgendarAPIView.as_view()),
    path("marketing/publicacoes/<int:pk>/cancelar", PublicacaoCancelarAPIView.as_view()),
    path("marketing/publicacoes/<int:pk>/republicar", PublicacaoRepublicarAPIView.as_view()),
    path("marketing/contas", conta_list),
    path("marketing/contas/<int:pk>", ContaSocialDeleteAPIView.as_view()),
    path("marketing/contas/disponiveis/meta", MetaOAuthDisponiveisAPIView.as_view()),
    path("marketing/contas/disponiveis/linkedin", LinkedInOAuthDisponiveisAPIView.as_view()),
    path("marketing/media", MarketingMediaAPIView.as_view()),
    path("marketing/calendario", MarketingCalendarioAPIView.as_view()),
    path("marketing/estatisticas", MarketingEstatisticasAPIView.as_view()),
    path("marketing/oauth/meta/start", MetaOAuthStartAPIView.as_view()),
    path("marketing/oauth/meta/callback", MetaOAuthCallbackAPIView.as_view()),
    path("marketing/oauth/meta/ligar", MetaOAuthLigarAPIView.as_view()),
    path("marketing/oauth/linkedin/start", LinkedInOAuthStartAPIView.as_view()),
    path("marketing/oauth/linkedin/callback", LinkedInOAuthCallbackAPIView.as_view()),
    path("marketing/oauth/linkedin/ligar", LinkedInOAuthLigarAPIView.as_view()),
]
