from django.contrib import admin

from portic_crm.teletrabalho.models import RegistroTeletrabalho


@admin.register(RegistroTeletrabalho)
class RegistroTeletrabalhoAdmin(admin.ModelAdmin):
    list_display = ("utilizador", "tipo", "created_at", "observacao")
    list_filter = ("tipo", "created_at")
    search_fields = ("utilizador__email", "utilizador__first_name", "utilizador__last_name")
    readonly_fields = ("created_at", "updated_at")
