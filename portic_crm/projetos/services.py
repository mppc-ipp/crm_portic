import re
from datetime import date

from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db.models import Count, Prefetch, Q

from portic_crm.core.models import HistoricoEntrada
from portic_crm.core.permissions import is_admin_geral
from portic_crm.empresas.models import Empresa, TipoInteracao
from portic_crm.projetos.models import (
    AtividadeProjeto,
    DependenciaObjetivo,
    MembroProjeto,
    Objetivo,
    Projeto,
)

User = get_user_model()

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _normalizar_email(email: str) -> str:
    return email.strip().lower()


def _email_utilizador(user) -> str:
    return _normalizar_email(user.email or "")


def usuario_pode_ver_projeto(user, projeto: Projeto) -> bool:
    if is_admin_geral(user):
        return True
    if projeto.criado_por_id == user.pk:
        return True
    email = _email_utilizador(user)
    if not email:
        return False
    return projeto.membros.filter(
        Q(utilizador_id=user.pk) | Q(email__iexact=email)
    ).exists()


def pode_ver_projetos(user) -> bool:
    return is_admin_geral(user) or user.has_perm("projetos.view_projeto")


def pode_criar_projeto(user) -> bool:
    return is_admin_geral(user) or user.has_perm("projetos.add_projeto")


def pode_editar_projeto(user) -> bool:
    return is_admin_geral(user) or user.has_perm("projetos.change_projeto")


def pode_eliminar_projeto(user) -> bool:
    return is_admin_geral(user) or user.has_perm("projetos.delete_projeto")


def queryset_projetos_visiveis(user):
    if is_admin_geral(user):
        return Projeto.objects.all()
    email = _email_utilizador(user)
    filtro = Q(criado_por=user)
    if email:
        filtro |= Q(membros__utilizador=user) | Q(membros__email__iexact=email)
    return Projeto.objects.filter(filtro).distinct()


def queryset_objetivos_para_listagem():
    return (
        Objetivo.objects.select_related("responsavel", "empresa")
        .annotate(
            _subtarefas_total=Count("subtarefas", distinct=True),
            _subtarefas_concluidas=Count(
                "subtarefas", filter=Q(subtarefas__concluida=True), distinct=True
            ),
            _comentarios_total=Count("comentarios", distinct=True),
        )
        .prefetch_related(
            Prefetch(
                "dependencias_entrada",
                queryset=DependenciaObjetivo.objects.select_related("predecessora"),
            ),
            Prefetch(
                "dependencias_saida",
                queryset=DependenciaObjetivo.objects.select_related("sucessora"),
            ),
        )
        .order_by("ordem", "id")
    )


def _validar_emails(emails: list) -> list[str]:
    vistos: set[str] = set()
    resultado: list[str] = []
    for raw in emails:
        email = _normalizar_email(str(raw))
        if not email:
            continue
        if not _EMAIL_RE.match(email):
            raise ValidationError(f"Email inválido: {raw}")
        if email in vistos:
            raise ValidationError(f"Email duplicado: {email}")
        vistos.add(email)
        resultado.append(email)
    return resultado


def _utilizador_por_email(email: str):
    norm = _normalizar_email(email)
    user = User.objects.filter(email__iexact=norm, is_active=True).first()
    if user:
        return user
    user = User.objects.filter(username__iexact=norm, is_active=True).first()
    if user:
        return user
    if "@" in norm:
        local = norm.split("@", 1)[0]
        user = User.objects.filter(username__iexact=local, is_active=True).first()
        if user:
            return user
    return None


def nome_responsavel_objetivo(objetivo: Objetivo) -> str | None:
    if objetivo.responsavel_id:
        return (
            objetivo.responsavel.get_full_name()
            or objetivo.responsavel.email
            or objetivo.responsavel.username
        )
    if objetivo.responsavel_email:
        user = _utilizador_por_email(objetivo.responsavel_email)
        if user:
            return user.get_full_name() or user.email or user.username
        return objetivo.responsavel_email
    return None


def emails_atribuiveis_projeto(projeto: Projeto) -> set[str]:
    emails = {_normalizar_email(m.email) for m in projeto.membros.all()}
    if projeto.responsavel_id and projeto.responsavel.email:
        emails.add(_normalizar_email(projeto.responsavel.email))
    return emails


def pode_atribuir_tarefa(
    projeto: Projeto,
    responsavel=None,
    responsavel_email: str | None = None,
) -> bool:
    if responsavel is None and not responsavel_email:
        return True
    emails = emails_atribuiveis_projeto(projeto)
    if responsavel is not None:
        if projeto.responsavel_id == responsavel.pk:
            return True
        if projeto.membros.filter(utilizador_id=responsavel.pk).exists():
            return True
        if responsavel.email and _normalizar_email(responsavel.email) in emails:
            return True
        return False
    if responsavel_email:
        return _normalizar_email(responsavel_email) in emails
    return False


def sincronizar_atribuicoes_tarefas(projeto: Projeto) -> None:
    """Liga tarefas atribuídas por email quando o membro passa a ter conta."""
    for objetivo in Objetivo.objects.filter(secao__projeto=projeto).exclude(responsavel_email=""):
        email = _normalizar_email(objetivo.responsavel_email)
        membro = projeto.membros.filter(email__iexact=email).first()
        utilizador = membro.utilizador if membro and membro.utilizador_id else _utilizador_por_email(email)
        if utilizador:
            objetivo.responsavel = utilizador
            objetivo.responsavel_email = ""
            objetivo.save(update_fields=["responsavel", "responsavel_email"])


def vincular_membros_pendentes(projeto: Projeto) -> None:
    for membro in projeto.membros.filter(utilizador__isnull=True):
        utilizador = _utilizador_por_email(membro.email)
        if utilizador:
            membro.utilizador = utilizador
            membro.save(update_fields=["utilizador"])
    sincronizar_atribuicoes_tarefas(projeto)


def garantir_responsavel_projeto(projeto: Projeto) -> None:
    if projeto.responsavel_id:
        return
    atividade = (
        projeto.atividades.filter(acao="PROJETO_CRIADO", utilizador__isnull=False)
        .order_by("created_at")
        .first()
    )
    if atividade:
        projeto.responsavel = atividade.utilizador
        projeto.save(update_fields=["responsavel"])


def preparar_projeto_para_leitura(projeto: Projeto) -> None:
    vincular_membros_pendentes(projeto)
    garantir_responsavel_projeto(projeto)


def sincronizar_membros(projeto: Projeto, emails: list) -> list[MembroProjeto]:
    emails_validos = _validar_emails(emails)
    existentes = {m.email: m for m in projeto.membros.all()}
    novos = set(emails_validos)

    for email in existentes:
        if email not in novos:
            existentes[email].delete()

    membros: list[MembroProjeto] = []
    for email in emails_validos:
        utilizador = _utilizador_por_email(email)
        if email in existentes:
            membro = existentes[email]
            if membro.utilizador_id != (utilizador.pk if utilizador else None):
                membro.utilizador = utilizador
                membro.save(update_fields=["utilizador"])
            membros.append(membro)
        else:
            membros.append(
                MembroProjeto.objects.create(
                    projeto=projeto,
                    email=email,
                    utilizador=utilizador,
                )
            )
    return membros


def registar_atividade(projeto, utilizador, acao, descricao, objetivo=None, metadata=None):
    from portic_crm.core.audit import registar_auditoria

    atividade = AtividadeProjeto.objects.create(
        projeto=projeto,
        utilizador=utilizador,
        objetivo=objetivo,
        acao=acao,
        descricao=descricao,
        metadata=metadata or {},
    )
    alvo = objetivo if objetivo is not None else projeto
    registar_auditoria(acao, descricao, actor=utilizador, alvo=alvo)
    return atividade


def projeto_de_objetivo(objetivo: Objetivo) -> Projeto:
    return objetivo.secao.projeto


def pode_registar_interacao_empresa(user) -> bool:
    return is_admin_geral(user) or user.has_perm("empresas.change_empresa")


def pode_ver_empresa(user) -> bool:
    return is_admin_geral(user) or user.has_perm("empresas.view_empresa")


def _conteudo_interacao_tarefa_concluida(objetivo: Objetivo) -> str:
    projeto = objetivo.projeto
    linhas = [f"Tarefa «{objetivo.titulo}» concluída no projeto «{projeto.nome}»."]
    if objetivo.descricao.strip():
        linhas.append(objetivo.descricao.strip())
    return "\n".join(linhas)


def registar_interacao_empresa_tarefa_concluida(objetivo: Objetivo, user) -> bool:
    if not objetivo.empresa_id:
        return False
    if not pode_registar_interacao_empresa(user):
        return False
    if not TipoInteracao.objects.filter(codigo="TAREFA_PROJETO", ativo=True).exists():
        return False
    ct = ContentType.objects.get_for_model(Empresa)
    HistoricoEntrada.objects.create(
        content_type=ct,
        object_id=objetivo.empresa_id,
        tipo="TAREFA_PROJETO",
        data=date.today(),
        conteudo=_conteudo_interacao_tarefa_concluida(objetivo),
        registado_por=user,
    )
    return True
