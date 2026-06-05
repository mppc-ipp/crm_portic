from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from portic_crm.core.permissions import MODULE_PERMISSIONS, is_admin_geral, user_can_access_module
from portic_crm.espacos.models import PerfilUnidadeEspacos
from portic_crm.espacos.services import reservas as espacos_svc


def _tipo_utilizador(user: User) -> str:
    if user.is_superuser:
        return "SUPER_ADMIN"
    if user.has_perm("espacos.aprovar_reserva") or user.has_perm("espacos.admin_unidade_espacos"):
        return "ADMIN_UNIDADE"
    email = (user.email or "").lower()
    if email.endswith("@ipp.pt") or email.endswith("@portic.local"):
        return "INTERNO"
    return "EXTERNO"


def _admin_modulos(user: User) -> dict:
    if is_admin_geral(user):
        cfg = espacos_svc.get_config_modulos()
        return {"salas": cfg.modulo_salas_ativo, "viaturas": cfg.modulo_viaturas_ativo}
    perfis = PerfilUnidadeEspacos.objects.filter(utilizador=user)
    salas = user.has_perm("espacos.aprovar_reserva") or perfis.filter(admin_salas=True).exists()
    viaturas = user.has_perm("espacos.aprovar_reserva") or perfis.filter(admin_viaturas=True).exists()
    return {"salas": salas, "viaturas": viaturas}


def _modulos_instalacao() -> dict:
    cfg = espacos_svc.get_config_modulos()
    return {"salas": cfg.modulo_salas_ativo, "viaturas": cfg.modulo_viaturas_ativo}


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
        "adminModulos": _admin_modulos(user),
        "modulosInstalacao": _modulos_instalacao(),
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "grupos": grupos,
        "modulos": modulos,
        "admin_geral": is_admin_geral(user),
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
