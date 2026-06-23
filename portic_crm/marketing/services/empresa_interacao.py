from __future__ import annotations

from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from portic_crm.core.models import HistoricoEntrada
from portic_crm.empresas.models import Empresa, TipoInteracao
from portic_crm.marketing.models import EstadoPublicacao, Publicacao


def _formatar_data_hora(dt) -> str:
    return timezone.localtime(dt).strftime("%d/%m/%Y %H:%M")


def conteudo_interacao_publicacao(publicacao: Publicacao) -> str:
    plataformas = ", ".join(
        d.get_plataforma_display() for d in publicacao.destinos.filter(estado="PUBLICADO")
    ) or ", ".join(d.get_plataforma_display() for d in publicacao.destinos.all())
    linhas = [f"Publicação «{publicacao.titulo_interno}»"]
    if publicacao.texto.strip():
        texto = publicacao.texto.strip()
        if len(texto) > 500:
            texto = f"{texto[:497]}…"
        linhas.append(texto)
    if plataformas:
        linhas.append(f"Redes: {plataformas}")
    if publicacao.publicado_em:
        linhas.append(f"Publicado em {_formatar_data_hora(publicacao.publicado_em)}")
    return "\n".join(linhas)


def registar_interacoes_empresa_publicacao(publicacao: Publicacao) -> None:
    if publicacao.estado not in (EstadoPublicacao.PUBLICADO, EstadoPublicacao.PARCIAL):
        return
    empresas = list(publicacao.empresas.all())
    if not empresas:
        return
    if not TipoInteracao.objects.filter(codigo="PUBLICACAO", ativo=True).exists():
        return

    ct = ContentType.objects.get_for_model(Empresa)
    data = timezone.localdate(publicacao.publicado_em or timezone.now())
    conteudo = conteudo_interacao_publicacao(publicacao)
    user = publicacao.criado_por

    for empresa in empresas:
        HistoricoEntrada.objects.update_or_create(
            publicacao=publicacao,
            content_type=ct,
            object_id=empresa.pk,
            defaults={
                "tipo": "PUBLICACAO",
                "data": data,
                "conteudo": conteudo,
                "registado_por": user,
            },
        )
