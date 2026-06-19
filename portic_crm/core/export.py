"""Utilitários de exportação CSV."""

from __future__ import annotations

import csv
import io
from typing import Any, Iterable

from django.http import HttpResponse


def registar_exportacao_csv(actor, modulo: str, filename: str, num_registos: int) -> None:
    from portic_crm.core.audit import AcaoAuditoria, registar_auditoria

    registar_auditoria(
        AcaoAuditoria.EXPORT_CSV,
        f"Exportou «{filename}» ({num_registos} registos) — módulo {modulo}",
        actor=actor,
    )


def csv_response(
    filename: str,
    columns: list[tuple[str, str]],
    rows: Iterable[dict[str, Any]],
    *,
    actor=None,
    modulo: str | None = None,
) -> HttpResponse:
    """
    Gera HttpResponse CSV.
    columns: lista de (chave_no_row, cabeçalho)
    """
    rows_list = list(rows)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([header for _, header in columns])
    for row in rows_list:
        writer.writerow([row.get(key, "") for key, _ in columns])
    response = HttpResponse(buffer.getvalue(), content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    if actor is not None and modulo:
        registar_exportacao_csv(actor, modulo, filename, len(rows_list))
    return response
