from django.contrib import admin

from portic_crm.avisos_seguranca.models import (
    AvisoSeguranca,
    EventoSeguranca,
    OcorrenciaSeguranca,
    TipoEventoSeguranca,
    TipoOcorrencia,
)


@admin.register(TipoOcorrencia)
class TipoOcorrenciaAdmin(admin.ModelAdmin):
    list_display = ("nome", "codigo", "cor", "ordem", "ativo")


@admin.register(TipoEventoSeguranca)
class TipoEventoSegurancaAdmin(admin.ModelAdmin):
    list_display = ("nome", "codigo", "cor", "ordem", "ativo")


@admin.register(AvisoSeguranca)
class AvisoSegurancaAdmin(admin.ModelAdmin):
    list_display = ("titulo", "nivel", "data_inicio", "data_fim", "ativo")
    list_filter = ("nivel", "ativo")


@admin.register(OcorrenciaSeguranca)
class OcorrenciaSegurancaAdmin(admin.ModelAdmin):
    list_display = ("titulo", "tipo", "data_hora", "local", "estado")
    list_filter = ("estado", "tipo")


@admin.register(EventoSeguranca)
class EventoSegurancaAdmin(admin.ModelAdmin):
    list_display = ("titulo", "tipo", "data_inicio", "data_fim", "local")
