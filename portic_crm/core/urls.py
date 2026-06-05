from django.urls import path

from portic_crm.core.views import PorticLoginView, PorticLogoutView, PostLoginRedirectView

urlpatterns = [
    path("login/", PorticLoginView.as_view(), name="login"),
    path("logout/", PorticLogoutView.as_view(), name="logout"),
    path("inicio/", PostLoginRedirectView.as_view(), name="post_login"),
]
