from django.utils import timezone
from rest_framework import serializers

from portic_crm.teletrabalho.models import RegistroTeletrabalho, TipoRegistoTeletrabalho


class RegistroTeletrabalhoCreateSerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(choices=TipoRegistoTeletrabalho.choices)
    observacao = serializers.CharField(required=False, allow_blank=True, default="")


def serializar_registro(reg: RegistroTeletrabalho, *, include_user: bool = False) -> dict:
    local_dt = timezone.localtime(reg.created_at)
    data = {
        "id": reg.id,
        "tipo": reg.tipo,
        "tipo_label": reg.get_tipo_display(),
        "observacao": reg.observacao,
        "registrado_em": local_dt.isoformat(),
        "dia": local_dt.date().isoformat(),
    }
    if include_user:
        data["utilizador_id"] = reg.utilizador_id
        data["utilizador_nome"] = (
            reg.utilizador.get_full_name() or reg.utilizador.email or reg.utilizador.username
        )
    return data
