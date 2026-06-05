from django.apps import AppConfig


class AdministradorConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "portic_crm.administrador"
    verbose_name = "Administrador"

    def ready(self):
        import portic_crm.administrador.signals  # noqa: F401
