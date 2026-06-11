from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

from portic_crm.administrador.models import ConfiguracaoSistema, PerfilUtilizador


class PerfilUtilizadorInline(admin.StackedInline):
    model = PerfilUtilizador
    can_delete = False
    verbose_name_plural = "Perfil"


class UserAdmin(BaseUserAdmin):
    inlines = [PerfilUtilizadorInline]


admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(ConfiguracaoSistema)
class ConfiguracaoSistemaAdmin(admin.ModelAdmin):
    list_display = ("backup_frequencia", "backup_retencao_dias", "backup_automatico", "atualizado_em")

    def has_add_permission(self, request):
        return not ConfiguracaoSistema.objects.exists()


@admin.register(PerfilUtilizador)
class PerfilUtilizadorAdmin(admin.ModelAdmin):
    list_display = ("user", "telemovel")
    search_fields = ("user__username", "user__email")
