from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from portic_crm.administrador.models import ConfiguracaoSistema
from portic_crm.core.audit import AcaoAuditoria, registar_auditoria, rotulo_entrada_auditoria
from portic_crm.core.models import HistoricoEntrada
from portic_crm.core.permissions import (
    MODULE_PERMISSIONS,
    PERMISSION_CATALOG,
    is_admin_geral,
    pode_gerir_utilizadores,
    user_can_access_module,
)

User = get_user_model()

CRM_GROUP_NAMES = [
    settings.GRUPO_ADMIN_GERAL,
    settings.GRUPO_ADMIN_PARCIAL,
    settings.GRUPO_UTILIZADOR_COMUM,
]


def _all_catalog_perms():
    perms = []
    for mod in PERMISSION_CATALOG.values():
        perms.extend(p[0] for p in mod["permissions"])
    return perms


def _perm_to_id(perm_string: str) -> int | None:
    try:
        app_label, codename = perm_string.split(".", 1)
        return Permission.objects.filter(
            content_type__app_label=app_label, codename=codename
        ).values_list("id", flat=True).first()
    except ValueError:
        return None


def _serialize_user(user: User) -> dict:
    grupos = list(user.groups.values_list("name", flat=True))
    perm_strings = user.user_permissions.values_list(
        "content_type__app_label", "codename"
    )
    permissoes_directas = [f"{a}.{c}" for a, c in perm_strings]
    modulos = {k: user_can_access_module(user, k) for k in MODULE_PERMISSIONS}
    return {
        "id": user.pk,
        "username": user.username,
        "email": user.email,
        "nome": user.get_full_name() or user.username,
        "grupos": grupos,
        "permissoes_directas": permissoes_directas,
        "modulos": modulos,
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
    }


class AdminPermissionMixin:
    permission_classes = [IsAuthenticated]

    def _check_admin(self, request):
        if not pode_gerir_utilizadores(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        return None

    def _check_admin_geral(self, request):
        if not is_admin_geral(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        return None

    def _can_edit_user(self, actor: User, target: User) -> bool:
        if not pode_gerir_utilizadores(actor):
            return False
        if target.is_superuser and not actor.is_superuser:
            return False
        if is_admin_geral(target) and not is_admin_geral(actor):
            return False
        return True


class AdminUtilizadoresListAPIView(AdminPermissionMixin, APIView):
    def get(self, request):
        denied = self._check_admin(request)
        if denied:
            return denied
        q = (request.query_params.get("q") or "").strip()
        qs = User.objects.prefetch_related("groups", "user_permissions").order_by(
            "first_name", "username"
        )
        if q:
            qs = qs.filter(
                Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(username__icontains=q)
                | Q(email__icontains=q)
            )
        users = list(qs[:200])
        if request.query_params.get("format") == "csv":
            from portic_crm.core.export import csv_response

            return csv_response(
                "utilizadores.csv",
                [
                    ("nome", "Nome"),
                    ("email", "Email"),
                    ("grupos", "Grupos"),
                    ("is_active", "Ativo"),
                ],
                [
                    {
                        "nome": u.get("nome"),
                        "email": u.get("email"),
                        "grupos": ", ".join(u.get("grupos", [])),
                        "is_active": "Sim" if u.get("is_active") else "Não",
                    }
                    for u in (_serialize_user(x) for x in users)
                ],
                actor=request.user,
                modulo="administrador",
            )
        return Response([_serialize_user(u) for u in users])

    def post(self, request):
        denied = self._check_admin(request)
        if denied:
            return denied
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        nome = (request.data.get("nome") or "").strip()
        if not email or not password:
            return Response(
                {"error": "Email e palavra-passe são obrigatórios"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(email__iexact=email).exists():
            return Response({"error": "Email já registado"}, status=status.HTTP_400_BAD_REQUEST)
        username = email
        if User.objects.filter(username=username).exists():
            username = f"{email.split('@')[0]}_{User.objects.count()}"
        parts = nome.split(None, 1) if nome else [email.split("@")[0], ""]
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=parts[0],
            last_name=parts[1] if len(parts) > 1 else "",
        )
        self._apply_user_permissions(request.user, user, request.data)
        grupos = list(user.groups.values_list("name", flat=True))
        registar_auditoria(
            AcaoAuditoria.USER_CRIADO,
            f"Criou o utilizador {user.email} (grupos: {', '.join(grupos) or 'nenhum'})",
            actor=request.user,
            alvo=user,
        )
        return Response(_serialize_user(user), status=status.HTTP_201_CREATED)

    def _apply_user_permissions(self, actor: User, target: User, data: dict):
        grupos = data.get("grupos")
        if grupos is not None:
            if not actor.is_superuser and settings.GRUPO_ADMIN_GERAL in grupos:
                grupos = [g for g in grupos if g != settings.GRUPO_ADMIN_GERAL]
            nomes_validos = [g for g in grupos if g in CRM_GROUP_NAMES]
            valid = Group.objects.filter(name__in=nomes_validos)
            target.groups.set(valid)
        permissoes = data.get("permissoes_directas")
        if permissoes is not None and not is_admin_geral(target):
            perm_ids = [_perm_to_id(p) for p in permissoes if p in _all_catalog_perms()]
            perm_ids = [i for i in perm_ids if i is not None]
            target.user_permissions.set(Permission.objects.filter(id__in=perm_ids))
        if "is_active" in data and self._can_edit_user(actor, target):
            target.is_active = bool(data["is_active"])
        if "nome" in data:
            parts = (data["nome"] or "").strip().split(None, 1)
            target.first_name = parts[0] if parts else ""
            target.last_name = parts[1] if len(parts) > 1 else ""
        if "password" in data and data["password"]:
            target.set_password(data["password"])
        if actor.is_superuser:
            if "is_staff" in data:
                target.is_staff = bool(data["is_staff"])
            if "is_superuser" in data and not (target.pk == actor.pk and not data["is_superuser"]):
                target.is_superuser = bool(data["is_superuser"])
        target.save()


class AdminUtilizadorDetailAPIView(AdminPermissionMixin, APIView):
    def get(self, request, pk):
        denied = self._check_admin(request)
        if denied:
            return denied
        try:
            user = User.objects.prefetch_related("groups", "user_permissions").get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "Utilizador não encontrado"}, status=status.HTTP_404_NOT_FOUND)
        return Response(_serialize_user(user))

    def patch(self, request, pk):
        denied = self._check_admin(request)
        if denied:
            return denied
        try:
            user = User.objects.prefetch_related("groups", "user_permissions").get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "Utilizador não encontrado"}, status=status.HTTP_404_NOT_FOUND)
        if not self._can_edit_user(request.user, user):
            return Response({"error": "Sem permissão para editar este utilizador"}, status=status.HTTP_403_FORBIDDEN)
        antes = _serialize_user(user)
        AdminUtilizadoresListAPIView()._apply_user_permissions(request.user, user, request.data)
        user.refresh_from_db()
        depois = _serialize_user(user)
        detalhes = _diff_user_payload(antes, depois, request.data)
        if detalhes:
            registar_auditoria(
                AcaoAuditoria.USER_EDITADO,
                f"Editou {user.email}: {detalhes}",
                actor=request.user,
                alvo=user,
            )
        return Response(depois)

    def delete(self, request, pk):
        denied = self._check_admin(request)
        if denied:
            return denied
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "Utilizador não encontrado"}, status=status.HTTP_404_NOT_FOUND)
        if user.pk == request.user.pk:
            return Response({"error": "Não pode desactivar a própria conta"}, status=status.HTTP_400_BAD_REQUEST)
        if not self._can_edit_user(request.user, user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        user.is_active = False
        user.save(update_fields=["is_active"])
        registar_auditoria(
            AcaoAuditoria.USER_DESATIVADO,
            f"Desactivou o utilizador {user.email}",
            actor=request.user,
            alvo=user,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminGruposListAPIView(AdminPermissionMixin, APIView):
    def get(self, request):
        denied = self._check_admin(request)
        if denied:
            return denied
        grupos = (
            Group.objects.filter(name__in=CRM_GROUP_NAMES)
            .annotate(num_utilizadores=Count("user"))
            .order_by("name")
        )
        return Response(
            [
                {
                    "id": g.pk,
                    "nome": g.name,
                    "num_utilizadores": g.num_utilizadores,
                }
                for g in grupos
            ]
        )


class AdminGrupoDetailAPIView(AdminPermissionMixin, APIView):
    def get(self, request, pk):
        denied = self._check_admin(request)
        if denied:
            return denied
        try:
            grupo = Group.objects.prefetch_related("permissions").get(pk=pk, name__in=CRM_GROUP_NAMES)
        except Group.DoesNotExist:
            return Response({"error": "Grupo não encontrado"}, status=status.HTTP_404_NOT_FOUND)
        perm_strings = grupo.permissions.values_list("content_type__app_label", "codename")
        return Response(
            {
                "id": grupo.pk,
                "nome": grupo.name,
                "permissoes": [f"{a}.{c}" for a, c in perm_strings],
            }
        )

    def patch(self, request, pk):
        denied = self._check_admin(request)
        if denied:
            return denied
        try:
            grupo = Group.objects.get(pk=pk, name__in=CRM_GROUP_NAMES)
        except Group.DoesNotExist:
            return Response({"error": "Grupo não encontrado"}, status=status.HTTP_404_NOT_FOUND)
        if grupo.name == settings.GRUPO_ADMIN_GERAL and not request.user.is_superuser:
            return Response(
                {"error": "Apenas superuser pode editar AdministradorGeral"},
                status=status.HTTP_403_FORBIDDEN,
            )
        permissoes = request.data.get("permissoes")
        if permissoes is not None:
            antes_count = grupo.permissions.count()
            perm_ids = [_perm_to_id(p) for p in permissoes if p in _all_catalog_perms()]
            perm_ids = [i for i in perm_ids if i is not None]
            grupo.permissions.set(Permission.objects.filter(id__in=perm_ids))
            depois_count = grupo.permissions.count()
            registar_auditoria(
                AcaoAuditoria.GRUPO_PERMISSOES,
                f"Grupo «{grupo.name}»: {antes_count} → {depois_count} permissões",
                actor=request.user,
                alvo=grupo,
            )
        return Response({"id": grupo.pk, "nome": grupo.name})


class AdminPermissoesCatalogAPIView(AdminPermissionMixin, APIView):
    def get(self, request):
        denied = self._check_admin(request)
        if denied:
            return denied
        catalog = []
        for key, mod in PERMISSION_CATALOG.items():
            catalog.append(
                {
                    "modulo": key,
                    "label": mod["label"],
                    "permissoes": [{"codigo": p[0], "label": p[1]} for p in mod["permissions"]],
                    "modulo_base": MODULE_PERMISSIONS.get(key),
                }
            )
        return Response(
            {
                "catalogo": catalog,
                "grupos": CRM_GROUP_NAMES,
                "modulos": list(MODULE_PERMISSIONS.keys()),
            }
        )


def _serialize_sistema(cfg: ConfiguracaoSistema) -> dict:
    from django.conf import settings as dj_settings

    jwt = dj_settings.SIMPLE_JWT
    db = dj_settings.DATABASES.get("default", {})
    validadores = [v["NAME"].rsplit(".", 1)[-1] for v in dj_settings.AUTH_PASSWORD_VALIDATORS]
    api_base = dj_settings.API_PUBLIC_URL.rstrip("/")
    meta_redirect_default = (
        dj_settings.META_REDIRECT_URI or f"{api_base}/api/marketing/oauth/meta/callback"
    )
    linkedin_redirect_default = (
        dj_settings.LINKEDIN_REDIRECT_URI or f"{api_base}/api/marketing/oauth/linkedin/callback"
    )
    tiktok_redirect_default = (
        dj_settings.TIKTOK_REDIRECT_URI or f"{api_base}/api/marketing/oauth/tiktok/callback"
    )
    media_base_default = dj_settings.MARKETING_MEDIA_PUBLIC_BASE_URL or api_base
    dry_run_efectivo = (
        cfg.marketing_dry_run
        if cfg.marketing_dry_run is not None
        else dj_settings.MARKETING_DRY_RUN
    )
    return {
        "versao": getattr(dj_settings, "CRM_VERSION", "0.1.0"),
        "ambiente": "desenvolvimento" if dj_settings.DEBUG else "producao",
        "debug": dj_settings.DEBUG,
        "seguranca": {
            "jwt_access_horas": int(jwt.get("ACCESS_TOKEN_LIFETIME").total_seconds() // 3600),
            "jwt_refresh_dias": int(jwt.get("REFRESH_TOKEN_LIFETIME").days),
            "validadores_senha": validadores,
            "cors_origins": list(dj_settings.CORS_ALLOWED_ORIGINS),
            "autenticacao_email": True,
            "grupos_crm": CRM_GROUP_NAMES,
        },
        "backup": {
            "frequencia": cfg.backup_frequencia,
            "retencao_dias": cfg.backup_retencao_dias,
            "localizacao": cfg.backup_localizacao,
            "automatico": cfg.backup_automatico,
            "ultimo": cfg.backup_ultimo.isoformat() if cfg.backup_ultimo else None,
            "notas": cfg.backup_notas,
        },
        "manutencao": {
            "notas": cfg.notas_manutencao,
            "politica_seguranca_notas": cfg.politica_seguranca_notas,
            "atualizado_em": cfg.atualizado_em.isoformat(),
        },
        "infraestrutura": {
            "base_dados": db.get("ENGINE", "").rsplit(".", 1)[-1] if db.get("ENGINE") else "desconhecido",
            "nome_bd": db.get("NAME", ""),
            "media_root": str(dj_settings.MEDIA_ROOT),
            "utilizadores_ativos": User.objects.filter(is_active=True).count(),
            "comando_backup": (
                "docker compose exec db pg_dump -U portic portic_crm > backup_$(date +%Y%m%d).sql"
            ),
        },
        "marketing": {
            "meta_app_id": cfg.marketing_meta_app_id,
            "meta_app_secret_configured": bool(cfg.marketing_meta_app_secret),
            "meta_redirect_uri": cfg.marketing_meta_redirect_uri or meta_redirect_default,
            "linkedin_client_id": cfg.marketing_linkedin_client_id,
            "linkedin_client_secret_configured": bool(cfg.marketing_linkedin_client_secret),
            "linkedin_redirect_uri": cfg.marketing_linkedin_redirect_uri or linkedin_redirect_default,
            "tiktok_client_key": cfg.marketing_tiktok_client_key,
            "tiktok_client_secret_configured": bool(cfg.marketing_tiktok_client_secret),
            "tiktok_redirect_uri": cfg.marketing_tiktok_redirect_uri or tiktok_redirect_default,
            "media_public_base_url": cfg.marketing_media_public_base_url or media_base_default,
            "dry_run": dry_run_efectivo,
            "configurado_na_bd": bool(
                cfg.marketing_meta_app_id
                or cfg.marketing_meta_app_secret
                or cfg.marketing_linkedin_client_id
                or cfg.marketing_linkedin_client_secret
                or cfg.marketing_tiktok_client_key
                or cfg.marketing_tiktok_client_secret
            ),
        },
    }


def _aplicar_marketing_config(cfg: ConfiguracaoSistema, data: dict) -> None:
    from portic_crm.marketing.services.tokens import encriptar_token

    marketing = data.get("marketing") or {}
    if "meta_app_id" in marketing:
        cfg.marketing_meta_app_id = (marketing.get("meta_app_id") or "").strip()
    if "meta_redirect_uri" in marketing:
        cfg.marketing_meta_redirect_uri = (marketing.get("meta_redirect_uri") or "").strip()
    if "linkedin_client_id" in marketing:
        cfg.marketing_linkedin_client_id = (marketing.get("linkedin_client_id") or "").strip()
    if "linkedin_redirect_uri" in marketing:
        cfg.marketing_linkedin_redirect_uri = (marketing.get("linkedin_redirect_uri") or "").strip()
    if "tiktok_client_key" in marketing:
        cfg.marketing_tiktok_client_key = (marketing.get("tiktok_client_key") or "").strip()
    if "tiktok_redirect_uri" in marketing:
        cfg.marketing_tiktok_redirect_uri = (marketing.get("tiktok_redirect_uri") or "").strip()
    if "media_public_base_url" in marketing:
        cfg.marketing_media_public_base_url = (marketing.get("media_public_base_url") or "").strip()
    if "dry_run" in marketing:
        cfg.marketing_dry_run = bool(marketing.get("dry_run"))

    meta_secret = marketing.get("meta_app_secret")
    if meta_secret and meta_secret not in ("********", "••••••••"):
        cfg.marketing_meta_app_secret = encriptar_token(str(meta_secret).strip())

    linkedin_secret = marketing.get("linkedin_client_secret")
    if linkedin_secret and linkedin_secret not in ("********", "••••••••"):
        cfg.marketing_linkedin_client_secret = encriptar_token(str(linkedin_secret).strip())

    tiktok_secret = marketing.get("tiktok_client_secret")
    if tiktok_secret and tiktok_secret not in ("********", "••••••••"):
        cfg.marketing_tiktok_client_secret = encriptar_token(str(tiktok_secret).strip())


class AdminSistemaAPIView(AdminPermissionMixin, APIView):
    def get(self, request):
        denied = self._check_admin_geral(request)
        if denied:
            return denied
        cfg = ConfiguracaoSistema.get_solo()
        return Response(_serialize_sistema(cfg))

    def patch(self, request):
        denied = self._check_admin_geral(request)
        if denied:
            return denied
        cfg = ConfiguracaoSistema.get_solo()
        backup_ultimo_antes = cfg.backup_ultimo
        backup_fields = {
            "backup_frequencia": "frequencia",
            "backup_retencao_dias": "retencao_dias",
            "backup_localizacao": "localizacao",
            "backup_automatico": "automatico",
            "backup_notas": "notas",
        }
        data = request.data
        backup = data.get("backup") or {}
        for model_field, json_key in backup_fields.items():
            if json_key in backup:
                setattr(cfg, model_field, backup[json_key])
        if "ultimo" in backup and backup["ultimo"]:
            from django.utils.dateparse import parse_datetime

            parsed = parse_datetime(backup["ultimo"])
            if parsed:
                cfg.backup_ultimo = parsed
        manutencao = data.get("manutencao") or {}
        if "notas" in manutencao:
            cfg.notas_manutencao = manutencao["notas"]
        if "politica_seguranca_notas" in manutencao:
            cfg.politica_seguranca_notas = manutencao["politica_seguranca_notas"]
        if "marketing" in data:
            _aplicar_marketing_config(cfg, data)
        cfg.save()
        if cfg.backup_ultimo and cfg.backup_ultimo != backup_ultimo_antes:
            registar_auditoria(
                AcaoAuditoria.BACKUP_REGISTADO,
                f"Backup registado manualmente ({cfg.backup_ultimo.isoformat()})",
                actor=request.user,
                alvo=cfg,
            )
        else:
            msg = "Actualizou configuração do sistema"
            if "marketing" in data:
                msg = "Actualizou integrações de marketing (redes sociais)"
            elif "backup" in data or "manutencao" in data:
                msg = "Actualizou políticas de backup e/ou notas de manutenção do sistema"
            registar_auditoria(
                AcaoAuditoria.SISTEMA_CONFIG,
                msg,
                actor=request.user,
                alvo=cfg,
            )
        return Response(_serialize_sistema(cfg))


def _diff_user_payload(antes: dict, depois: dict, data: dict) -> str:
    partes = []
    if "nome" in data and antes.get("nome") != depois.get("nome"):
        partes.append(f"nome «{antes.get('nome')}» → «{depois.get('nome')}»")
    if "grupos" in data and antes.get("grupos") != depois.get("grupos"):
        partes.append(f"grupos {antes.get('grupos')} → {depois.get('grupos')}")
    if "is_active" in data and antes.get("is_active") != depois.get("is_active"):
        estado = "activo" if depois.get("is_active") else "inactivo"
        partes.append(f"estado → {estado}")
    if "permissoes_directas" in data and antes.get("permissoes_directas") != depois.get(
        "permissoes_directas"
    ):
        partes.append("permissões directas actualizadas")
    if "password" in data and data.get("password"):
        partes.append("palavra-passe alterada")
    if "is_staff" in data and antes.get("is_staff") != depois.get("is_staff"):
        partes.append(f"staff → {depois.get('is_staff')}")
    if "is_superuser" in data and antes.get("is_superuser") != depois.get("is_superuser"):
        partes.append(f"superuser → {depois.get('is_superuser')}")
    return "; ".join(partes)


class AdminAuditoriaAPIView(AdminPermissionMixin, APIView):
    def _queryset(self, request):
        qs = HistoricoEntrada.objects.select_related(
            "registado_por", "content_type"
        ).order_by("-created_at")
        tipo = request.query_params.get("tipo")
        if tipo:
            qs = qs.filter(tipo__icontains=tipo)
        modulo = request.query_params.get("modulo")
        if modulo:
            qs = qs.filter(content_type__app_label=modulo)
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(conteudo__icontains=q) | Q(tipo__icontains=q))
        return qs

    def _serialize_item(self, h: HistoricoEntrada) -> dict:
        return {
            "id": h.pk,
            "tipo": h.tipo,
            "tipo_label": rotulo_entrada_auditoria(h),
            "conteudo": h.conteudo[:500],
            "data": h.data.isoformat() if h.data else None,
            "criado_em": h.created_at.isoformat(),
            "registado_por": (
                h.registado_por.get_full_name() or h.registado_por.username
                if h.registado_por
                else None
            ),
            "entidade": f"{h.content_type.app_label}.{h.content_type.model}#{h.object_id}",
            "modulo": h.content_type.app_label,
        }

    def get(self, request):
        denied = self._check_admin_geral(request)
        if denied:
            return denied
        from portic_crm.core.export import csv_response

        qs = self._queryset(request)
        if request.query_params.get("format") == "csv":
            return csv_response(
                "auditoria_crm.csv",
                [
                    ("tipo_label", "Tipo"),
                    ("conteudo", "Conteúdo"),
                    ("modulo", "Módulo"),
                    ("entidade", "Entidade"),
                    ("registado_por", "Utilizador"),
                    ("criado_em", "Criado em"),
                ],
                [self._serialize_item(h) for h in qs[:5000]],
                actor=request.user,
                modulo="administrador",
            )
        page = max(1, int(request.query_params.get("page", 1)))
        page_size = min(100, max(10, int(request.query_params.get("page_size", 25))))
        total = qs.count()
        start = (page - 1) * page_size
        items = qs[start : start + page_size]
        return Response(
            {
                "total": total,
                "page": page,
                "page_size": page_size,
                "items": [self._serialize_item(h) for h in items],
            }
        )


def _serialize_ficheiros() -> dict:
    from portic_crm.core import files_inventory

    cfg = ConfiguracaoSistema.get_solo()
    inventario = files_inventory.construir_inventario()
    orfaos = files_inventory.listar_orfaos()
    return {
        "resumo": files_inventory.totais_por_modulo(),
        "ficheiros": inventario + orfaos,
        "limpeza": {
            "dias": cfg.limpeza_ficheiros_dias,
            "automatica": cfg.limpeza_ficheiros_automatica,
            "ultima": (
                cfg.limpeza_ficheiros_ultima.isoformat()
                if cfg.limpeza_ficheiros_ultima
                else None
            ),
        },
    }


class AdminFicheirosAPIView(AdminPermissionMixin, APIView):
    """Inventário e gestão dos ficheiros em disco (apenas administrador geral)."""

    def get(self, request):
        denied = self._check_admin_geral(request)
        if denied:
            return denied
        return Response(_serialize_ficheiros())

    def patch(self, request):
        denied = self._check_admin_geral(request)
        if denied:
            return denied
        cfg = ConfiguracaoSistema.get_solo()
        data = request.data
        if "dias" in data:
            try:
                cfg.limpeza_ficheiros_dias = max(0, int(data["dias"]))
            except (TypeError, ValueError):
                return Response(
                    {"error": "Valor de dias inválido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if "automatica" in data:
            cfg.limpeza_ficheiros_automatica = bool(data["automatica"])
        cfg.save()
        registar_auditoria(
            AcaoAuditoria.SISTEMA_CONFIG,
            (
                "Actualizou política de limpeza de ficheiros "
                f"(dias={cfg.limpeza_ficheiros_dias}, "
                f"automática={cfg.limpeza_ficheiros_automatica})"
            ),
            actor=request.user,
            alvo=cfg,
        )
        return Response(_serialize_ficheiros())

    def post(self, request):
        denied = self._check_admin_geral(request)
        if denied:
            return denied
        from portic_crm.core import files_inventory

        data = request.data
        if data.get("todos_orfaos"):
            caminhos = [o["caminho_disco"] for o in files_inventory.listar_orfaos()]
        else:
            caminhos = data.get("paths") or []
        if not isinstance(caminhos, list) or not caminhos:
            return Response(
                {"error": "Nenhum ficheiro indicado para remoção."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        resultado = files_inventory.apagar_caminhos([str(c) for c in caminhos])
        megabytes = resultado["bytes_libertados"] / (1024 * 1024)
        registar_auditoria(
            AcaoAuditoria.FICHEIROS_LIMPOS,
            (
                f"Removeu {resultado['total_apagados']} ficheiro(s) "
                f"({megabytes:.1f} MB libertados)"
            ),
            actor=request.user,
        )
        resultado["estado"] = _serialize_ficheiros()
        return Response(resultado)
