from django.contrib import admin

from portic_crm.core.models import HistoricoEntrada


@admin.register(HistoricoEntrada)
class HistoricoEntradaAdmin(admin.ModelAdmin):
    list_display = ("tipo", "data", "registado_por", "content_type", "object_id")
    list_filter = ("tipo", "data")
    search_fields = ("conteudo",)
