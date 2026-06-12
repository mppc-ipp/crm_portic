from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from portic_crm.core.audit import AcaoAuditoria, registar_auditoria
from portic_crm.core.permissions import MODULE_PERMISSIONS, is_admin_geral, user_can_access_module


def _tipo_utilizador(user: User) -> str:
    if user.is_superuser:
        return "SUPER_ADMIN"
    email = (user.email or "").lower()
    if email.endswith("@ipp.pt") or email.endswith("@portic.local"):
        return "INTERNO"
    return "EXTERNO"


def _user_payload(user: User) -> dict:
    modulos = {k: user_can_access_module(user, k) for k in MODULE_PERMISSIONS}
    grupos = list(user.groups.values_list("name", flat=True))
    return {
        "id": str(user.pk),
        "username": user.username,
        "email": user.email,
        "nome": user.get_full_name() or user.email or user.username,
        "telemovel": None,
        "tipo": _tipo_utilizador(user),
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "grupos": grupos,
        "modulos": modulos,
        "admin_geral": is_admin_geral(user),
        "permissoes": {
            "gerir_eventos": is_admin_geral(user) or user.has_perm("dashboard.gerir_eventos"),
        },
    }


class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or request.data.get("senha", "")
        if not email:
            return Response({"error": "Email obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
        user = authenticate(request, email=email, password=password)
        if not user:
            return Response({"error": "Credenciais inválidas"}, status=status.HTTP_401_UNAUTHORIZED)
        registar_auditoria(
            AcaoAuditoria.LOGIN,
            f"Login via API ({email})",
            actor=user,
            alvo=user,
        )
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "token": str(refresh.access_token),
                "refresh": str(refresh),
                "user": _user_payload(user),
            }
        )


class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_user_payload(request.user))
