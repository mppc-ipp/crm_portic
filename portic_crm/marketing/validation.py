"""Validação server-side de ficheiros de mídia para marketing."""

from __future__ import annotations

import os

from rest_framework import serializers

from portic_crm.marketing.models import TipoMidia

EXTENSOES_IMAGEM = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
EXTENSOES_VIDEO = {".mp4", ".mov", ".webm", ".avi"}
TAMANHO_MAX_IMAGEM = 30 * 1024 * 1024
TAMANHO_MAX_VIDEO = 287 * 1024 * 1024


def validar_ficheiro_midia(ficheiro, tipo: str):
    ext = os.path.splitext(ficheiro.name)[1].lower()
    if tipo == TipoMidia.IMAGEM:
        if ext not in EXTENSOES_IMAGEM:
            raise serializers.ValidationError(
                "Tipo de imagem não permitido. Use JPEG, PNG, GIF ou WebP."
            )
        if ficheiro.size > TAMANHO_MAX_IMAGEM:
            raise serializers.ValidationError("A imagem não pode exceder 30 MB.")
    elif tipo == TipoMidia.VIDEO:
        if ext not in EXTENSOES_VIDEO:
            raise serializers.ValidationError(
                "Tipo de vídeo não permitido. Use MP4, MOV ou WebM."
            )
        if ficheiro.size > TAMANHO_MAX_VIDEO:
            raise serializers.ValidationError("O vídeo não pode exceder 287 MB.")
    else:
        raise serializers.ValidationError("Tipo de mídia inválido.")
    return ficheiro
