from django.utils import timezone
from rest_framework import serializers

from portic_crm.avisos_seguranca.models import (
    AvisoSeguranca,
    EventoSeguranca,
    OcorrenciaSeguranca,
    StatusOcorrencia,
    TipoEventoSeguranca,
    TipoOcorrencia,
)


class TipoEventoSegurancaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoEventoSeguranca
        fields = ["id", "codigo", "nome", "cor", "ordem", "ativo", "created_at"]
        read_only_fields = ["id", "codigo", "created_at"]

    def validate_nome(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("O nome é obrigatório.")
        return value

    def create(self, validated_data):
        validated_data["codigo"] = TipoEventoSeguranca.gerar_codigo(validated_data["nome"])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        nome = validated_data.get("nome")
        if nome and nome != instance.nome:
            validated_data["codigo"] = TipoEventoSeguranca.gerar_codigo(nome, excluir_pk=instance.pk)
        return super().update(instance, validated_data)


class TipoOcorrenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoOcorrencia
        fields = ["id", "codigo", "nome", "cor", "ordem", "ativo", "created_at"]
        read_only_fields = ["id", "codigo", "created_at"]

    def validate_nome(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("O nome é obrigatório.")
        return value

    def create(self, validated_data):
        validated_data["codigo"] = TipoOcorrencia.gerar_codigo(validated_data["nome"])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        nome = validated_data.get("nome")
        if nome and nome != instance.nome:
            validated_data["codigo"] = TipoOcorrencia.gerar_codigo(nome, excluir_pk=instance.pk)
        return super().update(instance, validated_data)


class StatusOcorrenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusOcorrencia
        fields = ["id", "codigo", "nome", "cor", "ordem", "ativo", "created_at"]
        read_only_fields = ["id", "codigo", "created_at"]

    def validate_nome(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("O nome é obrigatório.")
        return value


class AvisoSegurancaSerializer(serializers.ModelSerializer):
    nivel_display = serializers.CharField(source="get_nivel_display", read_only=True)
    criado_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = AvisoSeguranca
        fields = [
            "id",
            "titulo",
            "conteudo",
            "nivel",
            "nivel_display",
            "data_inicio",
            "data_fim",
            "ativo",
            "criado_por",
            "criado_por_nome",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "criado_por", "criado_por_nome", "created_at", "updated_at"]

    def get_criado_por_nome(self, obj):
        if obj.criado_por:
            return obj.criado_por.get_full_name() or obj.criado_por.email
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return {
            "id": data["id"],
            "titulo": data["titulo"],
            "conteudo": data["conteudo"],
            "nivel": data["nivel"],
            "nivelDisplay": data.get("nivel_display"),
            "dataInicio": data["data_inicio"],
            "dataFim": data.get("data_fim"),
            "ativo": data["ativo"],
            "criadoPorNome": data.get("criado_por_nome"),
            "createdAt": data.get("created_at"),
            "updatedAt": data.get("updated_at"),
        }


class OcorrenciaSegurancaSerializer(serializers.ModelSerializer):
    estado_display = serializers.SerializerMethodField()
    estado_cor = serializers.SerializerMethodField()
    tipo_nome = serializers.CharField(source="tipo.nome", read_only=True)
    tipo_cor = serializers.CharField(source="tipo.cor", read_only=True)
    registado_por_nome = serializers.SerializerMethodField()
    dia = serializers.SerializerMethodField()

    class Meta:
        model = OcorrenciaSeguranca
        fields = [
            "id",
            "titulo",
            "descricao",
            "tipo",
            "tipo_nome",
            "tipo_cor",
            "data_hora",
            "local",
            "estado",
            "estado_display",
            "estado_cor",
            "observacoes_resolucao",
            "registado_por",
            "registado_por_nome",
            "dia",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "tipo_nome",
            "tipo_cor",
            "estado_display",
            "estado_cor",
            "registado_por",
            "registado_por_nome",
            "dia",
            "created_at",
            "updated_at",
        ]

    def validate_tipo(self, value):
        if value and not value.ativo:
            raise serializers.ValidationError("O tipo de ocorrência seleccionado está inactivo.")
        return value

    def validate_estado(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("O estado é obrigatório.")
        if not StatusOcorrencia.objects.filter(codigo=value, ativo=True).exists():
            raise serializers.ValidationError("Estado inválido ou inativo.")
        return value

    def get_estado_display(self, obj):
        return StatusOcorrencia.nome_por_codigo(obj.estado) or obj.estado

    def get_estado_cor(self, obj):
        return StatusOcorrencia.cor_por_codigo(obj.estado)

    def get_registado_por_nome(self, obj):
        if obj.registado_por:
            return obj.registado_por.get_full_name() or obj.registado_por.email
        return None

    def get_dia(self, obj):
        return timezone.localtime(obj.data_hora).date().isoformat()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return {
            "id": data["id"],
            "titulo": data["titulo"],
            "descricao": data["descricao"],
            "tipoId": data.get("tipo"),
            "tipo": data.get("tipo_nome"),
            "tipoCor": data.get("tipo_cor"),
            "dataHora": data["data_hora"],
            "local": data.get("local") or "",
            "estado": data["estado"],
            "estadoDisplay": data.get("estado_display"),
            "estadoCor": data.get("estado_cor"),
            "observacoesResolucao": data.get("observacoes_resolucao") or "",
            "registadoPorNome": data.get("registado_por_nome"),
            "dia": data.get("dia"),
            "createdAt": data.get("created_at"),
            "updatedAt": data.get("updated_at"),
        }


class EventoSegurancaSerializer(serializers.ModelSerializer):
    tipo_nome = serializers.CharField(source="tipo.nome", read_only=True)
    tipo_cor = serializers.CharField(source="tipo.cor", read_only=True)
    criado_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = EventoSeguranca
        fields = [
            "id",
            "titulo",
            "tipo",
            "tipo_nome",
            "tipo_cor",
            "data_inicio",
            "data_fim",
            "descricao",
            "local",
            "criado_por",
            "criado_por_nome",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "criado_por", "criado_por_nome", "created_at", "updated_at"]

    def get_criado_por_nome(self, obj):
        if obj.criado_por:
            return obj.criado_por.get_full_name() or obj.criado_por.email
        return None

    def validate(self, attrs):
        inicio = attrs.get("data_inicio") or (self.instance.data_inicio if self.instance else None)
        fim = attrs.get("data_fim") or (self.instance.data_fim if self.instance else None)
        if inicio and fim and fim < inicio:
            raise serializers.ValidationError({"data_fim": "A data de fim deve ser posterior à de início."})
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return {
            "id": data["id"],
            "titulo": data["titulo"],
            "tipoId": data["tipo"],
            "tipo": data.get("tipo_nome"),
            "tipoCor": data.get("tipo_cor"),
            "dataInicio": data["data_inicio"],
            "dataFim": data["data_fim"],
            "descricao": data.get("descricao") or "",
            "local": data.get("local") or "",
            "criadoPorNome": data.get("criado_por_nome"),
            "createdAt": data.get("created_at"),
            "updatedAt": data.get("updated_at"),
        }
