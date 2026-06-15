import os

from django.utils import timezone
from rest_framework import serializers

from portic_crm.dashboard.models import AnexoEvento, Evento, TipoEvento

EXTENSOES_PERMITIDAS = {".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp"}
TAMANHO_MAX_BYTES = 10 * 1024 * 1024


def validar_ficheiro_anexo(ficheiro):
    ext = os.path.splitext(ficheiro.name)[1].lower()
    if ext not in EXTENSOES_PERMITIDAS:
        raise serializers.ValidationError(
            "Tipo de ficheiro não permitido. Use PDF, Word ou imagens."
        )
    if ficheiro.size > TAMANHO_MAX_BYTES:
        raise serializers.ValidationError("O ficheiro não pode exceder 10 MB.")
    return ficheiro


class AnexoEventoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    carregado_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = AnexoEvento
        fields = [
            "id",
            "nome_original",
            "tamanho",
            "tipo_mime",
            "url",
            "carregado_por_nome",
            "created_at",
        ]
        read_only_fields = fields

    def get_url(self, obj):
        request = self.context.get("request")
        if obj.ficheiro and request:
            return request.build_absolute_uri(obj.ficheiro.url)
        if obj.ficheiro:
            return obj.ficheiro.url
        return None

    def get_carregado_por_nome(self, obj):
        if obj.carregado_por:
            return obj.carregado_por.get_full_name() or obj.carregado_por.email
        return None


class TipoEventoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoEvento
        fields = ["id", "codigo", "nome", "cor", "ordem", "ativo", "created_at"]
        read_only_fields = ["id", "codigo", "created_at"]

    def validate_nome(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("O nome é obrigatório.")
        return value.strip()


class EventoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="tipo.nome", read_only=True)
    tipo_cor = serializers.CharField(source="tipo.cor", read_only=True)
    tipo_codigo = serializers.CharField(source="tipo.codigo", read_only=True)
    anexos = AnexoEventoSerializer(many=True, read_only=True)
    passado = serializers.SerializerMethodField()
    editable = serializers.SerializerMethodField()

    class Meta:
        model = Evento
        fields = [
            "id",
            "titulo",
            "tipo",
            "tipo_display",
            "tipo_cor",
            "tipo_codigo",
            "data_inicio",
            "data_fim",
            "descricao",
            "particular",
            "anexos",
            "passado",
            "editable",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["criado_por"] = request.user
        return super().create(validated_data)

    def get_passado(self, obj):
        return obj.data_fim < timezone.now()

    def get_editable(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        user = request.user
        from portic_crm.core.permissions import is_admin_geral

        pode_gerir = is_admin_geral(user) or user.has_perm("dashboard.gerir_eventos")
        return pode_gerir and obj.data_fim >= timezone.now()

    def validate_titulo(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("O título é obrigatório.")
        return value

    def validate_tipo(self, value):
        if not value.ativo:
            raise serializers.ValidationError("O tipo de evento seleccionado está inativo.")
        return value

    def validate(self, data):
        inicio = data.get("data_inicio") or getattr(self.instance, "data_inicio", None)
        fim = data.get("data_fim") or getattr(self.instance, "data_fim", None)
        if inicio and fim and fim <= inicio:
            raise serializers.ValidationError("A data de fim deve ser posterior à de início.")
        return data


def evento_para_calendario(evento, user) -> dict:
    from portic_crm.core.permissions import is_admin_geral

    pode_gerir = is_admin_geral(user) or user.has_perm("dashboard.gerir_eventos")
    return {
        "id": str(evento.pk),
        "title": evento.titulo,
        "dataInicio": evento.data_inicio.isoformat(),
        "dataFim": evento.data_fim.isoformat(),
        "tipo": evento.tipo.codigo,
        "tipoCor": evento.tipo.cor,
        "tipoNome": evento.tipo.nome,
        "descricao": evento.descricao,
        "editable": pode_gerir and evento.data_fim >= timezone.now(),
    }
