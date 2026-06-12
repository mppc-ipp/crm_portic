from __future__ import annotations

from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from portic_crm.marketing.models import (
    ContaSocial,
    EstadoDestino,
    EstadoPublicacao,
    PlataformaSocial,
    Publicacao,
    PublicacaoDestino,
    PublicacaoLog,
    PublicacaoMidia,
    TipoMidia,
)

LIMITES_TEXTO = {
    PlataformaSocial.FACEBOOK: 63206,
    PlataformaSocial.INSTAGRAM: 2200,
    PlataformaSocial.LINKEDIN: 3000,
}


class PublicacaoMidiaSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = PublicacaoMidia
        fields = ["id", "tipo", "ordem", "url", "ficheiro"]
        read_only_fields = ["id", "url"]
        extra_kwargs = {"ficheiro": {"write_only": True}}

    def get_url(self, obj) -> str:
        request = self.context.get("request")
        if obj.ficheiro and request:
            return request.build_absolute_uri(obj.ficheiro.url)
        if obj.ficheiro:
            return obj.ficheiro.url
        return ""


class PublicacaoDestinoSerializer(serializers.ModelSerializer):
    plataforma_nome = serializers.CharField(source="get_plataforma_display", read_only=True)
    conta_nome = serializers.CharField(source="conta.nome_exibicao", read_only=True)

    class Meta:
        model = PublicacaoDestino
        fields = [
            "id",
            "plataforma",
            "plataforma_nome",
            "conta",
            "conta_nome",
            "estado",
            "external_post_id",
            "erro",
            "publicado_em",
        ]
        read_only_fields = [
            "id",
            "estado",
            "external_post_id",
            "erro",
            "publicado_em",
            "plataforma_nome",
            "conta_nome",
        ]


class PublicacaoLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicacaoLog
        fields = ["id", "nivel", "mensagem", "detalhes", "created_at"]


class PublicacaoSerializer(serializers.ModelSerializer):
    midias = PublicacaoMidiaSerializer(many=True, read_only=True)
    destinos = PublicacaoDestinoSerializer(many=True, read_only=True)
    logs = PublicacaoLogSerializer(many=True, read_only=True)
    criado_por_nome = serializers.SerializerMethodField()
    destinos_input = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Publicacao
        fields = [
            "id",
            "titulo_interno",
            "texto",
            "link_url",
            "estado",
            "agendado_para",
            "publicado_em",
            "criado_por",
            "criado_por_nome",
            "midias",
            "destinos",
            "destinos_input",
            "logs",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "estado",
            "publicado_em",
            "criado_por",
            "criado_por_nome",
            "midias",
            "destinos",
            "logs",
            "created_at",
            "updated_at",
        ]

    def get_criado_por_nome(self, obj) -> str:
        if obj.criado_por:
            return obj.criado_por.get_full_name() or obj.criado_por.username
        return ""

    def _validar_destinos(self, destinos_input: list[dict]):
        if not destinos_input:
            return
        for item in destinos_input:
            plataforma = item.get("plataforma")
            conta_id = item.get("conta")
            if plataforma not in PlataformaSocial.values:
                raise serializers.ValidationError({"destinos_input": "Plataforma inválida"})
            if not conta_id:
                raise serializers.ValidationError({"destinos_input": "Conta obrigatória por destino"})
            if not ContaSocial.objects.filter(pk=conta_id, ativa=True, plataforma=plataforma).exists():
                raise serializers.ValidationError(
                    {"destinos_input": f"Conta inválida para {plataforma}"}
                )

    def _validar_texto_plataformas(self, texto: str, destinos_input: list[dict]):
        for item in destinos_input or []:
            plataforma = item.get("plataforma")
            limite = LIMITES_TEXTO.get(plataforma)
            if limite and len(texto) > limite:
                raise serializers.ValidationError(
                    {"texto": f"Texto excede {limite} caracteres para {plataforma}"}
                )

    def validate(self, attrs):
        destinos_input = attrs.get("destinos_input") or (
            self.instance and list(self.instance.destinos.values("plataforma", "conta_id"))
        )
        texto = attrs.get("texto", getattr(self.instance, "texto", ""))
        if destinos_input:
            normalized = []
            for item in destinos_input:
                if isinstance(item, dict):
                    normalized.append(
                        {
                            "plataforma": item.get("plataforma"),
                            "conta": item.get("conta") or item.get("conta_id"),
                        }
                    )
            self._validar_destinos(normalized)
            self._validar_texto_plataformas(texto, normalized)

            plataformas = {d["plataforma"] for d in normalized}
            if PlataformaSocial.INSTAGRAM in plataformas:
                midias = self.instance.midias.count() if self.instance else 0
                if midias == 0 and not attrs.get("_tem_midias"):
                    pass  # validado no create após upload separado
        return attrs

    def _sync_destinos(self, publicacao: Publicacao, destinos_input: list[dict]):
        if destinos_input is None:
            return
        publicacao.destinos.exclude(
            plataforma__in=[d.get("plataforma") for d in destinos_input]
        ).delete()
        for item in destinos_input:
            plataforma = item.get("plataforma")
            conta_id = item.get("conta") or item.get("conta_id")
            PublicacaoDestino.objects.update_or_create(
                publicacao=publicacao,
                plataforma=plataforma,
                conta_id=conta_id,
                defaults={"estado": EstadoDestino.PENDENTE, "erro": ""},
            )

    def create(self, validated_data):
        destinos_input = validated_data.pop("destinos_input", [])
        validated_data.pop("_tem_midias", None)
        user = self.context["request"].user
        publicacao = Publicacao.objects.create(criado_por=user, **validated_data)
        self._sync_destinos(publicacao, destinos_input)
        return publicacao

    def update(self, instance, validated_data):
        if instance.estado not in (EstadoPublicacao.RASCUNHO, EstadoPublicacao.CANCELADO):
            raise serializers.ValidationError("Só é possível editar rascunhos ou cancelados")
        destinos_input = validated_data.pop("destinos_input", None)
        validated_data.pop("_tem_midias", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if destinos_input is not None:
            self._sync_destinos(instance, destinos_input)
        return instance


class PublicacaoAgendarSerializer(serializers.Serializer):
    agendado_para = serializers.DateTimeField()

    def validate_agendado_para(self, value):
        agora = timezone.now()
        if value <= agora + timedelta(minutes=2):
            raise serializers.ValidationError("Agendamento deve ser pelo menos 2 minutos no futuro")
        if value > agora + timedelta(days=30):
            raise serializers.ValidationError("Agendamento máximo de 30 dias")
        return value


class ContaSocialSerializer(serializers.ModelSerializer):
    token_expirado = serializers.SerializerMethodField()
    plataforma_nome = serializers.CharField(source="get_plataforma_display", read_only=True)
    ligada_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = ContaSocial
        fields = [
            "id",
            "plataforma",
            "plataforma_nome",
            "nome_exibicao",
            "external_id",
            "token_expira_em",
            "token_expirado",
            "metadata",
            "ativa",
            "ligada_por",
            "ligada_por_nome",
            "created_at",
        ]
        read_only_fields = fields

    def get_token_expirado(self, obj) -> bool:
        if not obj.token_expira_em:
            return False
        return obj.token_expira_em <= timezone.now()

    def get_ligada_por_nome(self, obj) -> str:
        if obj.ligada_por:
            return obj.ligada_por.get_full_name() or obj.ligada_por.username
        return ""


class MediaUploadSerializer(serializers.Serializer):
    ficheiro = serializers.FileField()
    publicacao_id = serializers.IntegerField(required=False)
    tipo = serializers.ChoiceField(choices=TipoMidia.choices, default=TipoMidia.IMAGEM)
    ordem = serializers.IntegerField(default=0, min_value=0)


class MetaLigarContaSerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(choices=["FACEBOOK", "INSTAGRAM"])
    page_id = serializers.CharField()
    page_name = serializers.CharField()
    page_token = serializers.CharField()
    ig_user_id = serializers.CharField(required=False, allow_blank=True)
    ig_username = serializers.CharField(required=False, allow_blank=True)


class LinkedInLigarContaSerializer(serializers.Serializer):
    org_id = serializers.CharField()
    org_urn = serializers.CharField()
    org_nome = serializers.CharField()
    access_token = serializers.CharField()
