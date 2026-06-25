import os

from rest_framework import serializers

from portic_crm.viaturas.models import Viatura

EXTENSOES_FOTO = {".jpg", ".jpeg", ".png", ".webp"}
TAMANHO_MAX_FOTO = 10 * 1024 * 1024


def validar_foto(ficheiro):
    ext = os.path.splitext(ficheiro.name)[1].lower()
    if ext not in EXTENSOES_FOTO:
        raise serializers.ValidationError("Use imagens JPG, PNG ou WebP.")
    if ficheiro.size > TAMANHO_MAX_FOTO:
        raise serializers.ValidationError("A foto não pode exceder 10 MB.")
    return ficheiro


class ViaturaSerializer(serializers.ModelSerializer):
    foto_url = serializers.SerializerMethodField()
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)

    class Meta:
        model = Viatura
        fields = [
            "id",
            "matricula",
            "marca",
            "modelo",
            "cor",
            "ano",
            "dono",
            "telemovel",
            "sala",
            "foto",
            "foto_url",
            "descricao",
            "observacoes",
            "estado",
            "estado_display",
            "ativo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "foto_url", "estado_display", "ativo", "created_at", "updated_at"]

    def get_foto_url(self, obj):
        if not obj.foto:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.foto.url)
        return obj.foto.url

    def validate_foto(self, value):
        if value:
            return validar_foto(value)
        return value

    def validate_matricula(self, value):
        value = (value or "").strip().upper()
        if not value:
            raise serializers.ValidationError("A matrícula é obrigatória.")
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return {
            "id": data["id"],
            "matricula": data["matricula"],
            "marca": data.get("marca") or "",
            "modelo": data.get("modelo") or "",
            "cor": data.get("cor") or "",
            "ano": data.get("ano"),
            "dono": data.get("dono") or "",
            "telemovel": data.get("telemovel") or "",
            "sala": data.get("sala") or "",
            "fotoUrl": data.get("foto_url"),
            "descricao": data.get("descricao") or "",
            "observacoes": data.get("observacoes") or "",
            "estado": data["estado"],
            "estadoDisplay": data.get("estado_display"),
            "ativo": data["ativo"],
            "createdAt": data.get("created_at"),
            "updatedAt": data.get("updated_at"),
        }
