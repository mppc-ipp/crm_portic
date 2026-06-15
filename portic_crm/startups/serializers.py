from datetime import date

from django.utils import timezone
from rest_framework import serializers

from portic_crm.core.models import HistoricoEntrada
from portic_crm.startups.models import (
    CampoFormulario,
    Candidatura,
    Edicao,
    FormularioCandidatura,
    RespostaCampo,
    Startup,
    StatusCandidatura,
    TipoCampoFormulario,
    TipoHistoricoCandidatura,
)


class TipoHistoricoCandidaturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoHistoricoCandidatura
        fields = ["id", "codigo", "nome", "ordem", "ativo", "created_at"]
        read_only_fields = ["id", "codigo", "created_at"]

    def validate_nome(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("O nome é obrigatório.")
        return value.strip()


class StatusCandidaturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusCandidatura
        fields = ["id", "codigo", "nome", "cor", "ordem", "ativo", "created_at"]
        read_only_fields = ["id", "codigo", "created_at"]

    def validate_nome(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("O nome é obrigatório.")
        return value.strip()

    def validate_cor(self, value):
        value = (value or "").strip()
        if not value.startswith("#") or len(value) not in (4, 7):
            raise serializers.ValidationError("Use uma cor hexadecimal (ex.: #3B82F6).")
        return value


class EdicaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Edicao
        fields = ["id", "ano", "nome", "ativa", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_ano(self, value):
        if value < 2000 or value > 2100:
            raise serializers.ValidationError("Ano inválido.")
        return value

    def validate_nome(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("O nome é obrigatório.")
        return value


class StartupSerializer(serializers.ModelSerializer):
    edicao_ano = serializers.IntegerField(source="edicao.ano", read_only=True)
    edicao_nome = serializers.CharField(source="edicao.nome", read_only=True)
    estado_display = serializers.CharField(source="get_estado_residencia_display", read_only=True)

    class Meta:
        model = Startup
        fields = [
            "id",
            "nome",
            "edicao",
            "edicao_ano",
            "edicao_nome",
            "estado_residencia",
            "estado_display",
            "email_contacto",
            "telefone_contacto",
        ]


class CampoFormularioSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampoFormulario
        fields = ["id", "ordem", "nome", "tipo", "obrigatorio", "opcoes"]
        read_only_fields = ["id"]

    def validate_opcoes(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Opções devem ser uma lista.")
        return [str(v).strip() for v in value if str(v).strip()]

    def validate(self, attrs):
        tipo = attrs.get("tipo", getattr(self.instance, "tipo", None))
        opcoes = attrs.get("opcoes", getattr(self.instance, "opcoes", []))
        if tipo == TipoCampoFormulario.CHOICE and not opcoes:
            raise serializers.ValidationError({"opcoes": "Campos de escolha precisam de opções."})
        return attrs


class FormularioSerializer(serializers.ModelSerializer):
    edicao_ano = serializers.IntegerField(source="edicao.ano", read_only=True)
    link_publico = serializers.SerializerMethodField()
    num_candidaturas = serializers.SerializerMethodField()
    campos = CampoFormularioSerializer(many=True, required=False)

    class Meta:
        model = FormularioCandidatura
        fields = [
            "id",
            "titulo",
            "token",
            "ativo",
            "edicao",
            "edicao_ano",
            "aberto_em",
            "fechado_em",
            "link_publico",
            "num_candidaturas",
            "campos",
            "created_at",
        ]
        read_only_fields = ["id", "token", "created_at", "edicao_ano"]
        extra_kwargs = {"edicao": {"required": False}}

    def get_link_publico(self, obj):
        web = self.context.get("web_url", "http://localhost:3002")
        return f"{web}/candidatura/{obj.token}"

    def get_num_candidaturas(self, obj):
        if hasattr(obj, "num_candidaturas"):
            return obj.num_candidaturas
        return obj.candidaturas.count()

    def _guardar_campos(self, formulario, campos_data):
        formulario.campos.all().delete()
        for i, campo_data in enumerate(campos_data):
            data = {k: v for k, v in campo_data.items() if k != "id"}
            data.setdefault("ordem", i)
            CampoFormulario.objects.create(formulario=formulario, **data)

    def _resolver_edicao(self, validated_data):
        if not validated_data.get("edicao"):
            ano = date.today().year
            edicao, _ = Edicao.objects.get_or_create(
                ano=ano,
                defaults={"nome": f"Candidaturas {ano}", "ativa": True},
            )
            validated_data["edicao"] = edicao

    def create(self, validated_data):
        campos_data = validated_data.pop("campos", [])
        self._resolver_edicao(validated_data)
        formulario = FormularioCandidatura.objects.create(**validated_data)
        if campos_data:
            self._guardar_campos(formulario, campos_data)
        return formulario

    def update(self, instance, validated_data):
        campos_data = validated_data.pop("campos", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if campos_data is not None:
            self._guardar_campos(instance, campos_data)
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["campos"] = CampoFormularioSerializer(
            instance.campos.all(), many=True
        ).data
        return data


class RespostaCampoSerializer(serializers.ModelSerializer):
    campo_nome = serializers.CharField(source="campo.nome", read_only=True)
    campo_tipo = serializers.CharField(source="campo.tipo", read_only=True)

    class Meta:
        model = RespostaCampo
        fields = ["id", "campo", "campo_nome", "campo_tipo", "valor"]


class CandidaturaSerializer(serializers.ModelSerializer):
    formulario_titulo = serializers.CharField(source="formulario.titulo", read_only=True)
    estado_nome = serializers.SerializerMethodField()
    estado_cor = serializers.SerializerMethodField()
    rotulo = serializers.SerializerMethodField()
    respostas = RespostaCampoSerializer(many=True, read_only=True)

    class Meta:
        model = Candidatura
        fields = [
            "id",
            "rotulo",
            "estado",
            "estado_nome",
            "estado_cor",
            "submetida_em",
            "formulario_titulo",
            "formulario",
            "respostas",
        ]
        read_only_fields = [
            "id",
            "rotulo",
            "submetida_em",
            "formulario",
            "respostas",
        ]

    def get_rotulo(self, obj):
        primeira = obj.respostas.select_related("campo").order_by("campo__ordem").first()
        if primeira and primeira.valor.strip():
            return primeira.valor.strip()[:120]
        return obj.submetida_em.strftime("Candidatura · %d/%m/%Y %H:%M")

    def get_estado_nome(self, obj):
        return StatusCandidatura.nome_por_codigo(obj.estado) or obj.estado.replace("_", " ").title()

    def get_estado_cor(self, obj):
        return StatusCandidatura.cor_por_codigo(obj.estado)

    def validate_estado(self, value):
        if not StatusCandidatura.objects.filter(codigo=value, ativo=True).exists():
            raise serializers.ValidationError("Estado inválido ou inativo.")
        return value


class CandidaturaHistoricoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.SerializerMethodField()
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

    def get_tipo_display(self, obj):
        nome = TipoHistoricoCandidatura.nome_por_codigo(obj.tipo)
        if nome:
            return nome
        return obj.tipo.replace("_", " ").title()

    def get_registado_por_nome(self, obj):
        if obj.registado_por:
            return obj.registado_por.get_full_name() or obj.registado_por.username
        return None

    def validate_tipo(self, value):
        if not TipoHistoricoCandidatura.objects.filter(codigo=value, ativo=True).exists():
            raise serializers.ValidationError("Tipo inválido ou inativo.")
        return value

    def validate_conteudo(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("O texto é obrigatório.")
        return value.strip()


class PublicCampoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampoFormulario
        fields = ["id", "ordem", "nome", "tipo", "obrigatorio", "opcoes"]


class PublicFormularioSerializer(serializers.ModelSerializer):
    campos = PublicCampoSerializer(many=True, read_only=True)

    class Meta:
        model = FormularioCandidatura
        fields = ["titulo", "campos"]


class CandidaturaSubmissaoSerializer(serializers.Serializer):
    respostas = serializers.DictField(
        child=serializers.CharField(allow_blank=True),
        required=False,
        default=dict,
    )


def formulario_publico_aberto(formulario: FormularioCandidatura) -> str | None:
    if not formulario.ativo:
        return "Este formulário não está ativo."
    now = timezone.now()
    if formulario.fechado_em and now > formulario.fechado_em:
        return "Este formulário já está fechado."
    if formulario.aberto_em and now < formulario.aberto_em:
        return "Este formulário ainda não está aberto."
    return None
