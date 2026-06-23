from django.contrib import admin

from portic_crm.empresas.models import Contacto, Empresa, TipoInteracao, TipoParceria


class ContactoInline(admin.TabularInline):
    model = Contacto
    extra = 1


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ("nome", "nif", "cae", "tipo", "tipo_parceria", "estado", "setor", "email")
    list_filter = ("tipo", "tipo_parceria", "estado", "setor")
    search_fields = ("nome", "nif", "cae", "email")
    inlines = [ContactoInline]


@admin.register(TipoParceria)
class TipoParceriaAdmin(admin.ModelAdmin):
    list_display = ("nome", "codigo", "ordem", "ativo")
    list_filter = ("ativo",)
    search_fields = ("nome", "codigo")
    ordering = ("ordem", "nome")


@admin.register(TipoInteracao)
class TipoInteracaoAdmin(admin.ModelAdmin):
    list_display = ("nome", "codigo", "cor", "ordem", "ativo")
    list_filter = ("ativo",)
    search_fields = ("nome", "codigo")
    ordering = ("ordem", "nome")


@admin.register(Contacto)
class ContactoAdmin(admin.ModelAdmin):
    list_display = ("nome", "empresa", "cargo", "email")
    search_fields = ("nome", "email", "empresa__nome")
