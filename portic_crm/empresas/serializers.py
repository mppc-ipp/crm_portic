import re

from rest_framework import serializers

from portic_crm.core.models import HistoricoEntrada
from portic_crm.empresas.models import Contacto, Empresa, TipoInteracao

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
    ultima_interacao = serializers.SerializerMethodField()

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
            "ultima_interacao",
        ]

    def get_ultima_interacao(self, obj):
        from portic_crm.empresas.services.ultima_interacao import calcular_ultima_interacao

        return calcular_ultima_interacao(obj).isoformat()

    def validate_codigo_postal(self, value):
        if value and not CODIGO_POSTAL_RE.match(value):
            raise serializers.ValidationError("Formato inválido. Use XXXX-XXX.")
        return value

    def _guardar_contactos(self, empresa, contactos_data):
        empresa.contactos.all().delete()
        for contacto_data in contactos_data:
            if contacto_data.get("nome", "").strip():
                Contacto.objects.create(empresa=empresa, **contacto_data)

    def create(self, validated_data):
        contactos_data = validated_data.pop("contactos", [])
        empresa = Empresa.objects.create(**validated_data)
        self._guardar_contactos(empresa, contactos_data)
        return empresa

    def update(self, instance, validated_data):
        contactos_data = validated_data.pop("contactos", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if contactos_data is not None:
            self._guardar_contactos(instance, contactos_data)
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["contactos"] = ContactoSerializer(instance.contactos.all(), many=True).data
        return data


class InteracaoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.SerializerMethodField()
    registado_por_nome = serializers.SerializerMethodField()
    evento_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = HistoricoEntrada
        fields = [
            "id",
            "tipo",
            "tipo_display",
            "data",
            "conteudo",
            "registado_por_nome",
            "evento_id",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "evento_id"]

    def get_tipo_display(self, obj):
        nome = TipoInteracao.nome_por_codigo(obj.tipo)
        if nome:
            return nome
        return obj.tipo.replace("_", " ").title()

    def get_registado_por_nome(self, obj):
        if obj.registado_por:
            return obj.registado_por.get_full_name() or obj.registado_por.username
        return None

    def validate_tipo(self, value):
        if not TipoInteracao.objects.filter(codigo=value, ativo=True).exists():
            raise serializers.ValidationError("Tipo de interação inválido ou inativo.")
        return value

    def validate_conteudo(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("O texto da interação é obrigatório.")
        return value.strip()


class TipoInteracaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoInteracao
        fields = ["id", "codigo", "nome", "ordem", "ativo", "created_at"]
        read_only_fields = ["id", "codigo", "created_at"]

    def validate_nome(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("O nome é obrigatório.")
        return value.strip()
