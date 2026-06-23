from django.contrib import admin

from portic_crm.viaturas.models import Viatura


@admin.register(Viatura)
class ViaturaAdmin(admin.ModelAdmin):
    list_display = ("matricula", "marca", "modelo", "dono", "sala", "estado", "ativo")
    list_filter = ("estado", "ativo")
    search_fields = ("matricula", "marca", "modelo", "dono", "sala", "telemovel")
