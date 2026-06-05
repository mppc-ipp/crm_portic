import re

from rest_framework import serializers

from portic_crm.core.models import HistoricoEntrada
from portic_crm.empresas.models import Contacto, Empresa

CODIGO_POSTAL_RE = re.compile(r"^\d{4}-\d{3}$")


class ContactoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contacto
        fields = ["id", "nome", "cargo", "email", "telefone"]


class ContactoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contacto
        fields = ["nome", "cargo", "email", "telefone"]


class EmpresaSerializer(serializers.ModelSerializer):
    contactos = ContactoCreateSerializer(many=True, required=False)
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)

    class Meta:
        model = Empresa
        fields = [
            "id",
            "nome",
            "nif",
            "cae",
            "setor",
            "tipo",
            "tipo_display",
            "estado",
            "estado_display",
            "email",
            "telefone",
            "morada",
            "codigo_postal",
            "localidade",
            "concelho",
            "distrito",
            "contactos",
            "created_at",
        ]

    def validate_codigo_postal(self, value):
        if value and not CODIGO_POSTAL_RE.match(value):
            raise serializers.ValidationError("Formato inválido. Use XXXX-XXX.")
        return value

    def create(self, validated_data):
        contactos_data = validated_data.pop("contactos", [])
        empresa = Empresa.objects.create(**validated_data)
        for contacto_data in contactos_data:
            if contacto_data.get("nome", "").strip():
                Contacto.objects.create(empresa=empresa, **contacto_data)
        return empresa

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["contactos"] = ContactoSerializer(instance.contactos.all(), many=True).data
        return data


class InteracaoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    registado_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = HistoricoEntrada
        fields = [
            "id",
            "tipo",
            "tipo_display",
            "data",
            "conteudo",
            "registado_por_nome",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_registado_por_nome(self, obj):
        if obj.registado_por:
            return obj.registado_por.get_full_name() or obj.registado_por.username
        return None

    def validate_conteudo(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("O texto da interação é obrigatório.")
        return value.strip()
