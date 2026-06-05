from django.contrib import admin

from portic_crm.dashboard.models import Evento


@admin.register(Evento)
class EventoAdmin(admin.ModelAdmin):
    list_display = ("titulo", "tipo", "data_inicio", "data_fim", "edicao")
    list_filter = ("tipo",)
