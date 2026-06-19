from django.contrib import admin

from portic_crm.marketing.models import (
    ContaSocial,
    CorEstadoPublicacao,
    Publicacao,
    PublicacaoDestino,
    PublicacaoLog,
    PublicacaoMidia,
)


class PublicacaoMidiaInline(admin.TabularInline):
    model = PublicacaoMidia
    extra = 0


class PublicacaoDestinoInline(admin.TabularInline):
    model = PublicacaoDestino
    extra = 0


@admin.register(Publicacao)
class PublicacaoAdmin(admin.ModelAdmin):
    list_display = ("titulo_interno", "estado", "agendado_para", "criado_por", "created_at")
    list_filter = ("estado",)
    search_fields = ("titulo_interno", "texto")
    inlines = [PublicacaoMidiaInline, PublicacaoDestinoInline]


@admin.register(ContaSocial)
class ContaSocialAdmin(admin.ModelAdmin):
    list_display = ("nome_exibicao", "plataforma", "ativa", "token_expira_em", "ligada_por")
    list_filter = ("plataforma", "ativa")


@admin.register(PublicacaoLog)
class PublicacaoLogAdmin(admin.ModelAdmin):
    list_display = ("publicacao", "nivel", "mensagem", "created_at")
    list_filter = ("nivel",)


@admin.register(CorEstadoPublicacao)
class CorEstadoPublicacaoAdmin(admin.ModelAdmin):
    list_display = ("nome", "codigo", "cor", "ordem")
    ordering = ("ordem", "nome")
    readonly_fields = ("codigo",)
