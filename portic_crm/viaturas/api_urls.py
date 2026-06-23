from django.urls import path

from portic_crm.viaturas.api_views import ViaturaViewSet

urlpatterns = [
    path("viaturas", ViaturaViewSet.as_view({"get": "list", "post": "create"})),
    path(
        "viaturas/<int:pk>",
        ViaturaViewSet.as_view(
            {
                "get": "retrieve",
                "patch": "partial_update",
                "put": "update",
                "delete": "destroy",
            }
        ),
    ),
]
