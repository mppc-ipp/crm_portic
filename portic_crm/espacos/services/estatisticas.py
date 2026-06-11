"""Agregações de estatísticas de reservas (salas e viaturas)."""

from __future__ import annotations

from datetime import datetime, time, timedelta

from django.utils import timezone

from portic_crm.espacos.models import (
    ModuloEspaco,
    OcorrenciaReserva,
    Sala,
    StatusOcorrenciaReserva,
    Viatura,
)

DIAS_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]


def _parse_date_param(value: str | None, end_of_day: bool = False) -> datetime | None:
    if not value or not value.strip():
        return None
    parts = value.strip().split("-")
    if len(parts) != 3:
        return None
    try:
        y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
        if end_of_day:
            return timezone.make_aware(datetime.combine(datetime(y, m, d).date(), time(23, 59, 59, 999000)))
        return timezone.make_aware(datetime.combine(datetime(y, m, d).date(), time.min))
    except (ValueError, TypeError):
        return None


def _round2(n: float) -> float:
    return round(n, 2)


def _add_by_clock_hour(por_hora: list[float], a: datetime, b: datetime) -> None:
    cur = a.timestamp()
    end = b.timestamp()
    while cur < end:
        d = datetime.fromtimestamp(cur, tz=a.tzinfo)
        hour = d.hour
        boundary = d.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        seg_end = min(boundary.timestamp(), end)
        por_hora[hour] += (seg_end - cur) / 60.0
        cur = seg_end


def _add_by_weekday(por_dia: list[float], a: datetime, b: datetime) -> None:
    cur = a.timestamp()
    end = b.timestamp()
    while cur < end:
        d = datetime.fromtimestamp(cur, tz=a.tzinfo)
        wd = (d.weekday()) % 7
        start_of_day = d.replace(hour=0, minute=0, second=0, microsecond=0)
        next_day = start_of_day + timedelta(days=1)
        seg_end = min(next_day.timestamp(), end)
        por_dia[wd] += (seg_end - cur) / 60.0
        cur = seg_end


def _add_by_calendar_day(por_dia_cal: dict[str, float], a: datetime, b: datetime) -> None:
    cur = a.timestamp()
    end = b.timestamp()
    while cur < end:
        d = datetime.fromtimestamp(cur, tz=a.tzinfo)
        key = d.strftime("%Y-%m-%d")
        start_of_day = d.replace(hour=0, minute=0, second=0, microsecond=0)
        next_day = start_of_day + timedelta(days=1)
        seg_end = min(next_day.timestamp(), end)
        por_dia_cal[key] = por_dia_cal.get(key, 0.0) + (seg_end - cur)
        cur = seg_end


def calcular_estatisticas(
    modulo: str,
    data_inicio: str | None = None,
    data_fim: str | None = None,
    unidade_id: str | None = None,
) -> dict:
    now = timezone.now()
    range_start = _parse_date_param(data_inicio) or (now - timedelta(days=30)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    range_end = _parse_date_param(data_fim, end_of_day=True) or now.replace(
        hour=23, minute=59, second=59, microsecond=999000
    )

    if range_start > range_end:
        raise ValueError("dataInicio deve ser anterior ou igual a dataFim")

    is_viatura = modulo == ModuloEspaco.VIATURA
    recurso_label = "viaturasAtivas" if is_viatura else "salasAtivas"
    recurso_id_field = "viatura_id"
    recurso_fk = "viatura"

    if is_viatura:
        recursos_qs = Viatura.objects.filter(ativo=True)
        if unidade_id:
            recursos_qs = recursos_qs.filter(unidade_id=unidade_id)
        recursos_ativos = recursos_qs.count()
        ocorrencias_qs = OcorrenciaReserva.objects.filter(
            status=StatusOcorrenciaReserva.APROVADA,
            viatura__isnull=False,
            viatura__ativo=True,
            data_inicio__lt=range_end,
            data_fim__gt=range_start,
        ).select_related("viatura")
        if unidade_id:
            ocorrencias_qs = ocorrencias_qs.filter(viatura__unidade_id=unidade_id)
    else:
        recursos_qs = Sala.objects.filter(ativo=True)
        if unidade_id:
            recursos_qs = recursos_qs.filter(unidade_id=unidade_id)
        recursos_ativos = recursos_qs.count()
        ocorrencias_qs = OcorrenciaReserva.objects.filter(
            status=StatusOcorrenciaReserva.APROVADA,
            sala__isnull=False,
            sala__ativo=True,
            data_inicio__lt=range_end,
            data_fim__gt=range_start,
        ).select_related("sala")
        if unidade_id:
            ocorrencias_qs = ocorrencias_qs.filter(sala__unidade_id=unidade_id)

    por_hora_minutos = [0.0] * 24
    por_dia_semana_minutos = [0.0] * 7
    por_recurso_ms: dict[str, dict] = {}
    por_dia_calendario_ms: dict[str, float] = {}
    total_ms = 0.0
    counted_occ = 0
    rs = range_start.timestamp()
    re = range_end.timestamp()

    for occ in ocorrencias_qs:
        clip_start = max(occ.data_inicio.timestamp(), rs)
        clip_end = min(occ.data_fim.timestamp(), re)
        if clip_start >= clip_end:
            continue
        counted_occ += 1
        clip_start_d = datetime.fromtimestamp(clip_start, tz=occ.data_inicio.tzinfo)
        clip_end_d = datetime.fromtimestamp(clip_end, tz=occ.data_fim.tzinfo)
        dur_ms = (clip_end - clip_start) * 1000
        total_ms += dur_ms

        _add_by_clock_hour(por_hora_minutos, clip_start_d, clip_end_d)
        _add_by_weekday(por_dia_semana_minutos, clip_start_d, clip_end_d)
        _add_by_calendar_day(por_dia_calendario_ms, clip_start_d, clip_end_d)

        recurso = occ.viatura if is_viatura else occ.sala
        if recurso:
            rid = str(recurso.pk)
            nome = recurso.nome
            prev = por_recurso_ms.get(rid, {"nome": nome, "ms": 0.0})
            por_recurso_ms[rid] = {"nome": nome, "ms": prev["ms"] + dur_ms}

    por_hora_dia = [{"hora": h, "minutos": _round2(m)} for h, m in enumerate(por_hora_minutos)]
    por_dia_semana = [
        {"dia": d, "label": DIAS_LABELS[d], "minutos": _round2(m)}
        for d, m in enumerate(por_dia_semana_minutos)
    ]
    por_sala = sorted(
        [
            {"salaId": rid, "nome": v["nome"], "horas": _round2(v["ms"] / 3_600_000)}
            for rid, v in por_recurso_ms.items()
        ],
        key=lambda x: x["horas"],
        reverse=True,
    )[:10]
    por_dia_calendario = [
        {"data": data, "horas": _round2(ms / 3_600_000)}
        for data, ms in sorted(por_dia_calendario_ms.items())
    ]

    resumo = {
        "ocorrenciasAprovadas": counted_occ,
        "totalHorasReservadas": _round2(total_ms / 3_600_000),
        recurso_label: recursos_ativos,
    }
    if is_viatura:
        resumo["salasAtivas"] = 0
    else:
        resumo["viaturasAtivas"] = 0

    return {
        "resumo": resumo,
        "porHoraDia": por_hora_dia,
        "porDiaSemana": por_dia_semana,
        "porSala": por_sala,
        "porDiaCalendario": por_dia_calendario,
    }
