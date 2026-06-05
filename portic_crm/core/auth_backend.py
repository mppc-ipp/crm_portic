from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

User = get_user_model()


class EmailAuthBackend(ModelBackend):
    """Autenticação apenas por email (campo email do utilizador)."""

    def authenticate(self, request, email=None, password=None, **kwargs):
        if not email or not password:
            return None
        normalized = str(email).strip().lower()
        if not normalized:
            return None
        try:
            user = User.objects.get(email__iexact=normalized, is_active=True)
        except User.DoesNotExist:
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

    def get_user(self, user_id):
        try:
            user = User.objects.get(pk=user_id, is_active=True)
        except User.DoesNotExist:
            return None
        return user if self.user_can_authenticate(user) else None
