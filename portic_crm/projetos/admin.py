from django.contrib import admin

from portic_crm.projetos.models import Objetivo, Projeto, Secao


class SecaoInline(admin.TabularInline):
    model = Secao
    extra = 1


class ObjetivoInline(admin.TabularInline):
    model = Objetivo
    extra = 1
    fk_name = "secao"


@admin.register(Projeto)
class ProjetoAdmin(admin.ModelAdmin):
    list_display = ("nome", "responsavel", "estado")
    list_filter = ("estado",)
    search_fields = ("nome",)
    inlines = [SecaoInline]


@admin.register(Secao)
class SecaoAdmin(admin.ModelAdmin):
    list_display = ("nome", "projeto", "ordem")
    inlines = [ObjetivoInline]


@admin.register(Objetivo)
class ObjetivoAdmin(admin.ModelAdmin):
    list_display = ("titulo", "secao", "responsavel", "estado", "data_limite")
    list_filter = ("estado",)
