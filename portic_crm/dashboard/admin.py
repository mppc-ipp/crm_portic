from django.contrib import admin

from portic_crm.dashboard.models import AnexoEvento, Evento, TipoEvento


class AnexoEventoInline(admin.TabularInline):
    model = AnexoEvento
    extra = 0
    readonly_fields = ("nome_original", "tamanho", "tipo_mime", "carregado_por", "created_at")


@admin.register(TipoEvento)
class TipoEventoAdmin(admin.ModelAdmin):
    list_display = ("nome", "codigo", "cor", "ordem", "ativo")
    list_filter = ("ativo",)


@admin.register(Evento)
class EventoAdmin(admin.ModelAdmin):
    list_display = ("titulo", "tipo", "data_inicio", "data_fim")
    list_filter = ("tipo",)
    inlines = [AnexoEventoInline]


@admin.register(AnexoEvento)
class AnexoEventoAdmin(admin.ModelAdmin):
    list_display = ("nome_original", "evento", "tamanho", "created_at")
    list_filter = ("created_at",)
