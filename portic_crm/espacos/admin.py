from django.contrib import admin

from portic_crm.espacos.models import (
    AuditoriaEspacos,
    ConfiguracaoModulos,
    HistoricoReserva,
    Localizacao,
    OcorrenciaReserva,
    PedidoReserva,
    PerfilUnidadeEspacos,
    Sala,
    TokenReserva,
    Unidade,
    Viatura,
)


@admin.register(Unidade)
class UnidadeAdmin(admin.ModelAdmin):
    list_display = ("nome", "ativo", "cor_r", "cor_g", "cor_b")


@admin.register(PerfilUnidadeEspacos)
class PerfilUnidadeEspacosAdmin(admin.ModelAdmin):
    list_display = ("utilizador", "unidade", "admin_salas", "admin_viaturas")


@admin.register(Localizacao)
class LocalizacaoAdmin(admin.ModelAdmin):
    list_display = ("nome", "unidade", "modulo", "ativo")
    list_filter = ("modulo", "unidade")


@admin.register(Sala)
class SalaAdmin(admin.ModelAdmin):
    list_display = ("nome", "unidade", "capacidade", "status", "ativo")
    list_filter = ("unidade", "status", "visibilidade")


@admin.register(Viatura)
class ViaturaAdmin(admin.ModelAdmin):
    list_display = ("nome", "matricula", "unidade", "status", "ativo")
    list_filter = ("unidade", "status")


class OcorrenciaReservaInline(admin.TabularInline):
    model = OcorrenciaReserva
    extra = 0


@admin.register(PedidoReserva)
class PedidoReservaAdmin(admin.ModelAdmin):
    list_display = ("titulo", "modulo", "utilizador", "status", "created_at")
    list_filter = ("modulo", "status")
    inlines = [OcorrenciaReservaInline]


@admin.register(HistoricoReserva)
class HistoricoReservaAdmin(admin.ModelAdmin):
    list_display = ("pedido", "acao", "utilizador_acao", "criado_em")


@admin.register(TokenReserva)
class TokenReservaAdmin(admin.ModelAdmin):
    list_display = ("pedido", "acao", "usado", "expira_em")


@admin.register(ConfiguracaoModulos)
class ConfiguracaoModulosAdmin(admin.ModelAdmin):
    list_display = ("modulo_salas_ativo", "modulo_viaturas_ativo", "updated_at")

    def has_add_permission(self, request):
        return not ConfiguracaoModulos.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AuditoriaEspacos)
class AuditoriaEspacosAdmin(admin.ModelAdmin):
    list_display = ("acao", "entidade", "modulo", "utilizador", "criado_em")
    list_filter = ("modulo", "acao")
    readonly_fields = ("criado_em",)
