"""Utilitários de exportação CSV."""

from __future__ import annotations

import csv
import io
from typing import Any, Iterable

from django.http import HttpResponse


def csv_response(filename: str, columns: list[tuple[str, str]], rows: Iterable[dict[str, Any]]) -> HttpResponse:
    """
    Gera HttpResponse CSV.
    columns: lista de (chave_no_row, cabeçalho)
    """
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([header for _, header in columns])
    for row in rows:
        writer.writerow([row.get(key, "") for key, _ in columns])
    response = HttpResponse(buffer.getvalue(), content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
