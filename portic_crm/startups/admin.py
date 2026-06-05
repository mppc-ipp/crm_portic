from django.contrib import admin

from portic_crm.startups.models import (
    CampoFormulario,
    Candidatura,
    ClassificacaoCandidatura,
    ContratoResidencia,
    Edicao,
    FormularioCandidatura,
    RespostaCampo,
    Startup,
)


class CampoFormularioInline(admin.TabularInline):
    model = CampoFormulario
    extra = 1


@admin.register(Edicao)
class EdicaoAdmin(admin.ModelAdmin):
    list_display = ("ano", "nome", "ativa")


@admin.register(FormularioCandidatura)
class FormularioCandidaturaAdmin(admin.ModelAdmin):
    list_display = ("titulo", "edicao", "token", "ativo")
    list_filter = ("ativo", "edicao")
    readonly_fields = ("token",)
    inlines = [CampoFormularioInline]


@admin.register(Startup)
class StartupAdmin(admin.ModelAdmin):
    list_display = ("nome", "edicao", "estado_residencia", "empresa")
    list_filter = ("estado_residencia", "edicao")
    search_fields = ("nome",)


class RespostaCampoInline(admin.TabularInline):
    model = RespostaCampo
    extra = 0
    readonly_fields = ("campo", "valor")


@admin.register(Candidatura)
class CandidaturaAdmin(admin.ModelAdmin):
    list_display = ("nome_startup", "formulario", "estado", "submetida_em")
    list_filter = ("estado", "formulario__edicao")
    search_fields = ("nome_startup", "email_contacto")
    inlines = [RespostaCampoInline]


@admin.register(ClassificacaoCandidatura)
class ClassificacaoCandidaturaAdmin(admin.ModelAdmin):
    list_display = ("candidatura", "pontuacao", "classificacao", "avaliado_por")


@admin.register(ContratoResidencia)
class ContratoResidenciaAdmin(admin.ModelAdmin):
    list_display = ("startup", "data_inicio", "data_fim", "ativo")
    list_filter = ("ativo",)
