from rest_framework import serializers

from portic_crm.startups.models import Candidatura, Edicao, FormularioCandidatura, Startup


class EdicaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Edicao
        fields = ["id", "ano", "nome", "ativa"]


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


class CandidaturaSerializer(serializers.ModelSerializer):
    edicao_ano = serializers.IntegerField(source="formulario.edicao.ano", read_only=True)
    formulario_titulo = serializers.CharField(source="formulario.titulo", read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)

    class Meta:
        model = Candidatura
        fields = [
            "id",
            "nome_startup",
            "email_contacto",
            "estado",
            "estado_display",
            "submetida_em",
            "edicao_ano",
            "formulario_titulo",
        ]


class FormularioSerializer(serializers.ModelSerializer):
    edicao_ano = serializers.IntegerField(source="edicao.ano", read_only=True)
    link_publico = serializers.SerializerMethodField()

    class Meta:
        model = FormularioCandidatura
        fields = ["id", "titulo", "token", "ativo", "edicao_ano", "link_publico"]

    def get_link_publico(self, obj):
        web = self.context.get("web_url", "http://localhost:3000")
        return f"{web}/candidatura/{obj.token}"
