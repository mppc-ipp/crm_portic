"""Inventário e gestão dos ficheiros guardados em MEDIA_ROOT.

Centraliza a descoberta de todos os campos de ficheiro dos modelos, a deteção de
ficheiros órfãos (em disco mas sem registo na BD) e a remoção segura de ficheiros.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone as dt_timezone
from pathlib import Path

from django.conf import settings


@dataclass(frozen=True)
class CampoFicheiro:
    """Descreve um campo de ficheiro de um modelo a inventariar."""

    app_label: str
    model_name: str
    campo: str
    modulo: str

    def get_model(self):
        from django.apps import apps

        return apps.get_model(self.app_label, self.model_name)


# Registo central de todos os campos FileField/ImageField do projeto.
CAMPOS_FICHEIRO: list[CampoFicheiro] = [
    CampoFicheiro("dashboard", "AnexoEvento", "ficheiro", "Eventos (anexos)"),
    CampoFicheiro("marketing", "PublicacaoMidia", "ficheiro", "Marketing (mídias)"),
    CampoFicheiro("espacos", "Sala", "foto", "Espaços (salas)"),
    CampoFicheiro("espacos", "Viatura", "foto", "Espaços (viaturas)"),
    CampoFicheiro("viaturas", "Viatura", "foto", "Viaturas"),
    CampoFicheiro("projetos", "AnexoObjetivo", "ficheiro", "Projetos (anexos de tarefas)"),
]


def _media_root() -> Path:
    return Path(settings.MEDIA_ROOT).resolve()


def _formatar_data(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, tz=dt_timezone.utc).isoformat()


def _info_disco(caminho_abs: Path) -> tuple[bool, int, str | None]:
    """Devolve (existe, tamanho, data_modificacao_iso)."""
    try:
        stat = caminho_abs.stat()
        return True, stat.st_size, _formatar_data(stat.st_mtime)
    except OSError:
        return False, 0, None


def _caminhos_referenciados() -> set[str]:
    """Conjunto de caminhos relativos (normalizados) referenciados na BD."""
    referenciados: set[str] = set()
    for campo in CAMPOS_FICHEIRO:
        try:
            model = campo.get_model()
        except LookupError:
            continue
        valores = (
            model.objects.exclude(**{f"{campo.campo}": ""})
            .exclude(**{f"{campo.campo}__isnull": True})
            .values_list(campo.campo, flat=True)
        )
        for valor in valores:
            if valor:
                referenciados.add(os.path.normpath(str(valor)))
    return referenciados


def construir_inventario() -> list[dict]:
    """Lista todos os ficheiros referenciados na BD, com estado em disco."""
    media_root = _media_root()
    itens: list[dict] = []
    for campo in CAMPOS_FICHEIRO:
        try:
            model = campo.get_model()
        except LookupError:
            continue
        qs = (
            model.objects.exclude(**{f"{campo.campo}": ""})
            .exclude(**{f"{campo.campo}__isnull": True})
        )
        for obj in qs.iterator():
            file_field = getattr(obj, campo.campo, None)
            nome = getattr(file_field, "name", "") if file_field else ""
            if not nome:
                continue
            caminho_abs = (media_root / nome).resolve()
            existe, tamanho, modificado = _info_disco(caminho_abs)
            itens.append(
                {
                    "modulo": campo.modulo,
                    "modelo": f"{campo.app_label}.{campo.model_name}",
                    "object_id": obj.pk,
                    "descricao": str(obj)[:200],
                    "caminho_relativo": os.path.normpath(nome),
                    "caminho_disco": str(caminho_abs),
                    "tamanho": tamanho,
                    "modificado_em": modificado,
                    "estado": "referenciado" if existe else "em_falta",
                }
            )
    return itens


def listar_orfaos(idade_minima_dias: int | None = None) -> list[dict]:
    """Ficheiros presentes em disco que não são referenciados por nenhum registo.

    Se ``idade_minima_dias`` for indicado, apenas devolve ficheiros cuja última
    modificação seja mais antiga do que esse número de dias.
    """
    media_root = _media_root()
    if not media_root.exists():
        return []
    referenciados = _caminhos_referenciados()
    limite_ts: float | None = None
    if idade_minima_dias and idade_minima_dias > 0:
        limite_ts = datetime.now(tz=dt_timezone.utc).timestamp() - idade_minima_dias * 86400

    orfaos: list[dict] = []
    for raiz, _dirs, ficheiros in os.walk(media_root):
        for nome_ficheiro in ficheiros:
            caminho_abs = Path(raiz) / nome_ficheiro
            try:
                rel = os.path.normpath(str(caminho_abs.relative_to(media_root)))
            except ValueError:
                continue
            if rel in referenciados:
                continue
            existe, tamanho, modificado = _info_disco(caminho_abs)
            if not existe:
                continue
            stat_mtime = caminho_abs.stat().st_mtime
            if limite_ts is not None and stat_mtime > limite_ts:
                continue
            orfaos.append(
                {
                    "modulo": "Órfão",
                    "modelo": None,
                    "object_id": None,
                    "descricao": "Sem registo na base de dados",
                    "caminho_relativo": rel,
                    "caminho_disco": str(caminho_abs.resolve()),
                    "tamanho": tamanho,
                    "modificado_em": modificado,
                    "estado": "orfao",
                }
            )
    return orfaos


def listar_em_falta() -> list[dict]:
    """Registos cujo ficheiro já não existe em disco."""
    return [item for item in construir_inventario() if item["estado"] == "em_falta"]


def totais_por_modulo() -> dict:
    """Resumo de contagem e tamanho por módulo, mais totais de órfãos."""
    inventario = construir_inventario()
    orfaos = listar_orfaos()

    modulos: dict[str, dict] = {}
    total_referenciado = 0
    for item in inventario:
        bucket = modulos.setdefault(
            item["modulo"], {"modulo": item["modulo"], "ficheiros": 0, "tamanho": 0}
        )
        bucket["ficheiros"] += 1
        bucket["tamanho"] += item["tamanho"]
        total_referenciado += item["tamanho"]

    tamanho_orfaos = sum(o["tamanho"] for o in orfaos)
    return {
        "modulos": sorted(modulos.values(), key=lambda m: m["tamanho"], reverse=True),
        "total_ficheiros": len(inventario),
        "total_tamanho": total_referenciado + tamanho_orfaos,
        "tamanho_referenciado": total_referenciado,
        "orfaos_ficheiros": len(orfaos),
        "orfaos_tamanho": tamanho_orfaos,
        "em_falta": sum(1 for i in inventario if i["estado"] == "em_falta"),
    }


def _resolver_seguro(caminho: str) -> Path | None:
    """Resolve um caminho garantindo que fica dentro de MEDIA_ROOT (anti path traversal)."""
    media_root = _media_root()
    candidato = Path(caminho)
    if not candidato.is_absolute():
        candidato = media_root / candidato
    try:
        resolvido = candidato.resolve()
    except OSError:
        return None
    try:
        resolvido.relative_to(media_root)
    except ValueError:
        return None
    return resolvido


def apagar_caminhos(caminhos: list[str]) -> dict:
    """Apaga ficheiros (por caminho absoluto ou relativo a MEDIA_ROOT) com segurança.

    Devolve um resumo com ficheiros apagados, espaço libertado e caminhos ignorados.
    """
    apagados: list[str] = []
    ignorados: list[str] = []
    bytes_libertados = 0

    for caminho in caminhos:
        resolvido = _resolver_seguro(caminho)
        if resolvido is None or not resolvido.is_file():
            ignorados.append(caminho)
            continue
        try:
            tamanho = resolvido.stat().st_size
            resolvido.unlink()
            apagados.append(str(resolvido))
            bytes_libertados += tamanho
        except OSError:
            ignorados.append(caminho)

    return {
        "apagados": apagados,
        "ignorados": ignorados,
        "total_apagados": len(apagados),
        "bytes_libertados": bytes_libertados,
    }
