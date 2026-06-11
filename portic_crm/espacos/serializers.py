from rest_framework import serializers

from portic_crm.espacos.models import (
    ConfiguracaoModulos,
    Localizacao,
    OcorrenciaReserva,
    PedidoReserva,
    Sala,
    Unidade,
    Viatura,
)


class UnidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unidade
        fields = ["id", "nome", "cor_r", "cor_g", "cor_b", "ativo"]


class SalaSerializer(serializers.ModelSerializer):
    unidade = UnidadeSerializer(read_only=True)
    unidade_id = serializers.PrimaryKeyRelatedField(
        queryset=Unidade.objects.all(), source="unidade", write_only=True
    )
    foto_url = serializers.SerializerMethodField()

    class Meta:
        model = Sala
        fields = [
            "id",
            "nome",
            "capacidade",
            "foto_url",
            "descricao",
            "localizacao",
            "recursos",
            "mobilidade_reduzida",
            "status",
            "visibilidade",
            "ativo",
            "unidade",
            "unidade_id",
        ]

    def get_foto_url(self, obj):
        if obj.foto:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.foto.url)
            return obj.foto.url
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        unidade = data.get("unidade")
        return {
            "id": str(data["id"]),
            "nome": data["nome"],
            "capacidade": data["capacidade"],
            "fotoUrl": data.get("foto_url"),
            "descricao": data["descricao"],
            "localizacao": data["localizacao"],
            "recursos": data.get("recursos") or [],
            "mobilidadeReduzida": data.get("mobilidade_reduzida", False),
            "status": data["status"],
            "visibilidade": data.get("visibilidade"),
            "unidadeId": str(unidade["id"]) if unidade else None,
            "unidade": unidade,
        }


class ViaturaSerializer(serializers.ModelSerializer):
    unidade = UnidadeSerializer(read_only=True)
    foto_url = serializers.SerializerMethodField()

    class Meta:
        model = Viatura
        fields = [
            "id",
            "nome",
            "matricula",
            "marca",
            "modelo",
            "cor",
            "capacidade",
            "foto_url",
            "descricao",
            "localizacao",
            "recursos",
            "status",
            "visibilidade",
            "ativo",
            "unidade",
        ]

    def get_foto_url(self, obj):
        if obj.foto:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.foto.url)
            return obj.foto.url
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        unidade = data.get("unidade")
        return {
            "id": str(data["id"]),
            "nome": data["nome"],
            "matricula": data["matricula"],
            "marca": data.get("marca") or None,
            "modelo": data.get("modelo") or None,
            "cor": data.get("cor") or None,
            "capacidade": data["capacidade"],
            "fotoUrl": data.get("foto_url"),
            "descricao": data.get("descricao") or "",
            "localizacao": data["localizacao"],
            "recursos": data.get("recursos") or [],
            "status": data["status"],
            "visibilidade": data.get("visibilidade"),
            "unidadeId": str(unidade["id"]) if unidade else None,
            "unidade": unidade,
        }


def _sala_resumo(sala):
    if not sala:
        return None
    return {
        "id": str(sala.id),
        "nome": sala.nome,
        "localizacao": sala.localizacao,
        "capacidade": sala.capacidade,
    }


def _viatura_resumo(viatura):
    if not viatura:
        return None
    return {
        "id": str(viatura.id),
        "nome": viatura.nome,
        "matricula": viatura.matricula,
        "localizacao": viatura.localizacao,
        "capacidade": viatura.capacidade,
    }


def _ocorrencia_frontend(o):
    sala = o.sala
    viatura = o.viatura
    return {
        "id": str(o.id),
        "salaId": str(o.sala_id) if o.sala_id else None,
        "viaturaId": str(o.viatura_id) if o.viatura_id else None,
        "dataInicio": o.data_inicio.isoformat(),
        "dataFim": o.data_fim.isoformat(),
        "status": o.status,
        "sala": _sala_resumo(sala),
        "viatura": _viatura_resumo(viatura),
    }


def pedido_frontend(obj, include_user=False):
    data = {
        "id": str(obj.id),
        "titulo": obj.titulo,
        "descricao": obj.descricao,
        "numeroPessoas": obj.numero_pessoas,
        "status": obj.status,
        "criadoEm": obj.created_at.isoformat(),
        "modulo": obj.modulo,
        "ocorrencias": [_ocorrencia_frontend(o) for o in obj.ocorrencias.all()],
    }
    if include_user:
        data["usuario"] = {
            "nome": obj.utilizador.get_full_name() or obj.utilizador.username,
            "email": obj.utilizador.email,
        }
        data["usuarioId"] = str(obj.utilizador_id)
    return data


class OcorrenciaSerializer(serializers.ModelSerializer):
    sala_id = serializers.IntegerField(source="sala_id", required=False, allow_null=True)
    viatura_id = serializers.IntegerField(source="viatura_id", required=False, allow_null=True)

    class Meta:
        model = OcorrenciaReserva
        fields = ["id", "sala_id", "viatura_id", "data_inicio", "data_fim", "status"]


class PedidoReservaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PedidoReserva
        fields = ["id"]

    def to_representation(self, instance):
        return pedido_frontend(instance, include_user=True)


class PedidoCreateSerializer(serializers.Serializer):
    titulo = serializers.CharField(max_length=255)
    descricao = serializers.CharField()
    numero_pessoas = serializers.IntegerField(min_value=1, required=False)
    numeroPessoas = serializers.IntegerField(min_value=1, required=False)
    modulo = serializers.ChoiceField(choices=["SALA", "VIATURA"], required=False)
    ocorrencias = serializers.ListField(child=serializers.DictField(), allow_empty=False)

    def validate(self, attrs):
        numero = attrs.get("numero_pessoas") or attrs.get("numeroPessoas")
        if not numero:
            raise serializers.ValidationError({"numeroPessoas": "Obrigatório"})
        attrs["numero_pessoas"] = numero
        attrs.setdefault("modulo", "SALA")
        return attrs


class ConfigModulosSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoModulos
        fields = ["modulo_salas_ativo", "modulo_viaturas_ativo"]

    def to_representation(self, instance):
        return {
            "salas": instance.modulo_salas_ativo,
            "viaturas": instance.modulo_viaturas_ativo,
        }


class LocalizacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Localizacao
        fields = ["id", "nome", "ativo", "unidade_id"]

    def to_representation(self, instance):
        return {
            "id": str(instance.id),
            "nome": instance.nome,
            "ativo": instance.ativo,
            "unidadeId": str(instance.unidade_id),
        }
