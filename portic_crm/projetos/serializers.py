from rest_framework import serializers

from rest_framework.exceptions import ValidationError

from portic_crm.projetos.models import (
    AtividadeProjeto,
    CampoPersonalizado,
    ComentarioObjetivo,
    DependenciaObjetivo,
    MembroProjeto,
    Objetivo,
    Projeto,
    Secao,
    Subtarefa,
    ValorCampoPersonalizado,
    VistaGuardada,
)
from portic_crm.projetos.services import nome_responsavel_objetivo, pode_atribuir_tarefa


class SubtarefaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subtarefa
        fields = ["id", "titulo", "concluida", "ordem"]


class ComentarioSerializer(serializers.ModelSerializer):
    autor_nome = serializers.SerializerMethodField()

    class Meta:
        model = ComentarioObjetivo
        fields = ["id", "texto", "autor", "autor_nome", "created_at"]

    def get_autor_nome(self, obj):
        if not obj.autor:
            return "Utilizador"
        return obj.autor.get_full_name() or obj.autor.username


class DependenciaSerializer(serializers.ModelSerializer):
    predecessora_titulo = serializers.CharField(source="predecessora.titulo", read_only=True)
    sucessora_titulo = serializers.CharField(source="sucessora.titulo", read_only=True)

    class Meta:
        model = DependenciaObjetivo
        fields = ["id", "predecessora", "sucessora", "predecessora_titulo", "sucessora_titulo"]


class CampoPersonalizadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampoPersonalizado
        fields = ["id", "nome", "tipo", "opcoes", "ordem"]


class ValorCampoSerializer(serializers.ModelSerializer):
    campo_nome = serializers.CharField(source="campo.nome", read_only=True)
    campo_tipo = serializers.CharField(source="campo.tipo", read_only=True)

    class Meta:
        model = ValorCampoPersonalizado
        fields = [
            "id",
            "campo",
            "campo_nome",
            "campo_tipo",
            "valor_texto",
            "valor_numero",
            "valor_data",
        ]


class ObjetivoSerializer(serializers.ModelSerializer):
    responsavel_nome = serializers.SerializerMethodField()
    subtarefas = SubtarefaSerializer(many=True, read_only=True)
    comentarios = ComentarioSerializer(many=True, read_only=True)
    dependencias_entrada = DependenciaSerializer(many=True, read_only=True)
    dependencias_saida = DependenciaSerializer(many=True, read_only=True)
    valores_campos = ValorCampoSerializer(many=True, read_only=True)
    subtarefas_total = serializers.SerializerMethodField()
    subtarefas_concluidas = serializers.SerializerMethodField()

    def get_responsavel_nome(self, obj):
        return nome_responsavel_objetivo(obj)

    def get_subtarefas_total(self, obj):
        return obj.subtarefas.count()

    def get_subtarefas_concluidas(self, obj):
        return obj.subtarefas.filter(concluida=True).count()

    class Meta:
        model = Objetivo
        fields = [
            "id",
            "secao_id",
            "titulo",
            "descricao",
            "data_inicio",
            "data_limite",
            "responsavel",
            "responsavel_email",
            "responsavel_nome",
            "estado",
            "ordem",
            "subtarefas",
            "subtarefas_total",
            "subtarefas_concluidas",
            "comentarios",
            "dependencias_entrada",
            "dependencias_saida",
            "valores_campos",
        ]


class ObjetivoListSerializer(serializers.ModelSerializer):
    """Versão leve para listagens em board/lista."""

    responsavel_nome = serializers.SerializerMethodField()
    subtarefas_total = serializers.SerializerMethodField()
    subtarefas_concluidas = serializers.SerializerMethodField()
    comentarios_total = serializers.SerializerMethodField()

    def get_responsavel_nome(self, obj):
        return nome_responsavel_objetivo(obj)

    def get_subtarefas_total(self, obj):
        return getattr(obj, "_subtarefas_total", obj.subtarefas.count())

    def get_subtarefas_concluidas(self, obj):
        return getattr(obj, "_subtarefas_concluidas", obj.subtarefas.filter(concluida=True).count())

    def get_comentarios_total(self, obj):
        return getattr(obj, "_comentarios_total", obj.comentarios.count())

    class Meta:
        model = Objetivo
        fields = [
            "id",
            "secao_id",
            "titulo",
            "descricao",
            "data_inicio",
            "data_limite",
            "responsavel",
            "responsavel_email",
            "responsavel_nome",
            "estado",
            "ordem",
            "subtarefas_total",
            "subtarefas_concluidas",
            "comentarios_total",
        ]


class SecaoSerializer(serializers.ModelSerializer):
    objetivos = ObjetivoListSerializer(many=True, read_only=True)

    class Meta:
        model = Secao
        fields = ["id", "nome", "ordem", "objetivos"]


class VistaGuardadaSerializer(serializers.ModelSerializer):
    class Meta:
        model = VistaGuardada
        fields = ["id", "nome", "tipo_vista", "filtros", "padrao", "created_at"]


class AtividadeSerializer(serializers.ModelSerializer):
    utilizador_nome = serializers.SerializerMethodField()
    objetivo_titulo = serializers.CharField(source="objetivo.titulo", read_only=True, allow_null=True)

    class Meta:
        model = AtividadeProjeto
        fields = [
            "id",
            "acao",
            "descricao",
            "metadata",
            "utilizador",
            "utilizador_nome",
            "objetivo",
            "objetivo_titulo",
            "created_at",
        ]

    def get_utilizador_nome(self, obj):
        if not obj.utilizador:
            return "Sistema"
        return obj.utilizador.get_full_name() or obj.utilizador.username


class MembroProjetoSerializer(serializers.ModelSerializer):
    nome = serializers.SerializerMethodField()
    tem_cadastro = serializers.SerializerMethodField()

    def get_nome(self, obj):
        if obj.utilizador_id:
            return obj.utilizador.get_full_name() or obj.utilizador.username
        return None

    def get_tem_cadastro(self, obj):
        return obj.utilizador_id is not None

    class Meta:
        model = MembroProjeto
        fields = ["id", "email", "utilizador", "nome", "tem_cadastro"]


class ProjetoSerializer(serializers.ModelSerializer):
    secoes = SecaoSerializer(many=True, read_only=True)
    campos_personalizados = CampoPersonalizadoSerializer(many=True, read_only=True)
    vistas_guardadas = serializers.SerializerMethodField()
    responsavel_nome = serializers.SerializerMethodField()
    membros = MembroProjetoSerializer(many=True, read_only=True)

    def get_responsavel_nome(self, obj):
        if not obj.responsavel:
            return None
        return obj.responsavel.get_full_name() or obj.responsavel.username

    def get_vistas_guardadas(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return []
        qs = obj.vistas_guardadas.filter(utilizador=request.user)
        return VistaGuardadaSerializer(qs, many=True).data

    class Meta:
        model = Projeto
        fields = [
            "id",
            "nome",
            "resumo",
            "responsavel",
            "responsavel_nome",
            "estado",
            "cor",
            "arquivado",
            "membros",
            "secoes",
            "campos_personalizados",
            "vistas_guardadas",
            "created_at",
        ]


class ProjetoWriteSerializer(serializers.ModelSerializer):
    membros_emails = serializers.ListField(
        child=serializers.EmailField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = Projeto
        fields = ["id", "nome", "resumo", "responsavel", "estado", "cor", "arquivado", "membros_emails"]

    def create(self, validated_data):
        validated_data.pop("membros_emails", None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("membros_emails", None)
        return super().update(instance, validated_data)


class SecaoWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Secao
        fields = ["id", "nome", "ordem", "projeto"]


class ObjetivoWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Objetivo
        fields = [
            "id",
            "titulo",
            "descricao",
            "data_inicio",
            "data_limite",
            "responsavel",
            "responsavel_email",
            "estado",
            "ordem",
            "secao",
        ]
        extra_kwargs = {
            "responsavel_email": {"allow_null": True},
        }

    def _projeto_alvo(self):
        if self.instance:
            return self.instance.secao.projeto
        secao_id = self.initial_data.get("secao")
        if not secao_id:
            return None
        from portic_crm.projetos.models import Secao

        try:
            return Secao.objects.select_related("projeto").get(pk=secao_id).projeto
        except Secao.DoesNotExist:
            return None

    def validate(self, attrs):
        if attrs.get("responsavel_email") is None:
            attrs["responsavel_email"] = ""

        projeto = self._projeto_alvo()
        if not projeto:
            return attrs

        responsavel = attrs.get("responsavel", getattr(self.instance, "responsavel", None) if self.instance else None)
        responsavel_email = attrs.get(
            "responsavel_email",
            getattr(self.instance, "responsavel_email", "") if self.instance else "",
        )

        if "responsavel" in attrs and attrs["responsavel"] is not None:
            attrs["responsavel_email"] = ""
        elif attrs.get("responsavel_email"):
            attrs["responsavel"] = None
            attrs["responsavel_email"] = str(attrs["responsavel_email"]).strip().lower()
        elif "responsavel" in attrs and attrs["responsavel"] is None and "responsavel_email" not in attrs:
            attrs["responsavel_email"] = ""

        responsavel = attrs.get("responsavel", getattr(self.instance, "responsavel", None) if self.instance else None)
        responsavel_email = attrs.get(
            "responsavel_email",
            getattr(self.instance, "responsavel_email", "") if self.instance else "",
        )

        if not pode_atribuir_tarefa(projeto, responsavel, responsavel_email or None):
            raise ValidationError(
                "A pessoa deve ser membro do projeto ou responsável pelo projeto."
            )
        return attrs


class SubtarefaWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subtarefa
        fields = ["id", "titulo", "concluida", "ordem", "objetivo"]


class ComentarioWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComentarioObjetivo
        fields = ["id", "texto", "objetivo"]


class CampoPersonalizadoWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampoPersonalizado
        fields = ["id", "nome", "tipo", "opcoes", "ordem", "projeto"]


class VistaGuardadaWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = VistaGuardada
        fields = ["id", "nome", "tipo_vista", "filtros", "padrao", "projeto", "utilizador"]


class ValorCampoWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ValorCampoPersonalizado
        fields = ["id", "campo", "objetivo", "valor_texto", "valor_numero", "valor_data"]
