from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from portic_crm.core.permissions import pode_gerir_utilizadores

User = get_user_model()


class UsersListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not pode_gerir_utilizadores(request.user):
            return Response({"error": "Sem permissão"}, status=403)
        users = User.objects.filter(is_active=True).order_by("first_name", "username")[:100]
        return Response(
            [
                {
                    "id": u.pk,
                    "nome": u.get_full_name() or u.username,
                    "username": u.username,
                    "email": u.email,
                }
                for u in users
            ]
        )


class UserSearchAPIView(APIView):
    """Pesquisa utilizadores cadastrados por nome ou email (para atribuição a projetos)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response([])
        users = (
            User.objects.filter(is_active=True)
            .filter(
                Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(username__icontains=q)
                | Q(email__icontains=q)
            )
            .order_by("first_name", "username")[:15]
        )
        return Response(
            [
                {
                    "id": u.pk,
                    "nome": u.get_full_name() or u.username,
                    "email": u.email,
                }
                for u in users
            ]
        )


class UserLookupAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        email = (request.query_params.get("email") or "").strip().lower()
        if not email:
            return Response({"tem_cadastro": False, "nome": None, "utilizador": None})
        from portic_crm.projetos.services import _utilizador_por_email

        user = _utilizador_por_email(email)
        if not user:
            return Response({"tem_cadastro": False, "nome": None, "utilizador": None})
        return Response(
            {
                "tem_cadastro": True,
                "nome": user.get_full_name() or user.username,
                "utilizador": user.pk,
            }
        )
