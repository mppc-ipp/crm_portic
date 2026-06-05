from django.contrib import admin

from portic_crm.empresas.models import Contacto, Empresa


class ContactoInline(admin.TabularInline):
    model = Contacto
    extra = 1


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ("nome", "nif", "cae", "tipo", "estado", "setor", "email")
    list_filter = ("tipo", "estado", "setor")
    search_fields = ("nome", "nif", "cae", "email")
    inlines = [ContactoInline]


@admin.register(Contacto)
class ContactoAdmin(admin.ModelAdmin):
    list_display = ("nome", "empresa", "cargo", "email")
    search_fields = ("nome", "email", "empresa__nome")
