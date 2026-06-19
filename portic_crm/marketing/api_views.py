from __future__ import annotations

import secrets
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.db.models import Count, Q
from django.http import HttpResponseRedirect
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from portic_crm.core.audit import AcaoAuditoria, registar_auditoria
from portic_crm.core.permissions import is_admin_geral
from portic_crm.marketing.models import (
    ContaSocial,
    CorEstadoPublicacao,
    EstadoDestino,
    EstadoPublicacao,
    PlataformaSocial,
    Publicacao,
    PublicacaoDestino,
    PublicacaoMidia,
    TipoMidia,
)
from portic_crm.marketing.serializers import (
    ContaSocialSerializer,
    CorEstadoPublicacaoSerializer,
    LinkedInLigarContaSerializer,
    MediaUploadSerializer,
    MetaLigarContaSerializer,
    PublicacaoAgendarSerializer,
    PublicacaoMidiaSerializer,
    PublicacaoSerializer,
    TikTokLigarContaSerializer,
)
from portic_crm.marketing.services import linkedin as li_svc
from portic_crm.marketing.services import meta as meta_svc
from portic_crm.marketing.services import tiktok as tiktok_svc
from portic_crm.marketing.services.config import get_marketing_config
from portic_crm.marketing.services.publisher import publicar_publicacao
from portic_crm.marketing.services.tokens import encriptar_token


def _pode_ver(user) -> bool:
    return is_admin_geral(user) or user.has_perm("marketing.view_publicacao")


def _pode_criar(user) -> bool:
    return is_admin_geral(user) or user.has_perm("marketing.add_publicacao")


def _pode_editar(user) -> bool:
    return is_admin_geral(user) or user.has_perm("marketing.change_publicacao")


def _pode_eliminar(user) -> bool:
    return is_admin_geral(user) or user.has_perm("marketing.delete_publicacao")


def _pode_publicar(user) -> bool:
    return is_admin_geral(user) or user.has_perm("marketing.publicar")


def _pode_gerir_contas(user) -> bool:
    return is_admin_geral(user) or user.has_perm("marketing.gerir_contas")


def _rate_limit_publicar(user) -> bool:
    key = f"marketing_publish_rate:{user.pk}"
    count = cache.get(key, 0)
    if count >= settings.MARKETING_PUBLISH_RATE_LIMIT:
        return False
    cache.set(key, count + 1, timeout=3600)
    return True


class PublicacaoViewSet(viewsets.ModelViewSet):
    serializer_class = PublicacaoSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        if not _pode_ver(self.request.user):
            return Publicacao.objects.none()
        qs = Publicacao.objects.select_related("criado_por").prefetch_related(
            "midias", "destinos__conta", "logs"
        )
        params = self.request.query_params
        if estado := params.get("estado"):
            qs = qs.filter(estado=estado)
        if plataforma := params.get("plataforma"):
            qs = qs.filter(destinos__plataforma=plataforma)
        if q := params.get("q"):
            qs = qs.filter(Q(titulo_interno__icontains=q) | Q(texto__icontains=q))
        if de := params.get("de"):
            qs = qs.filter(
                Q(agendado_para__date__gte=de)
                | Q(publicado_em__date__gte=de)
                | Q(created_at__date__gte=de)
            )
        if ate := params.get("ate"):
            qs = qs.filter(
                Q(agendado_para__date__lte=ate)
                | Q(publicado_em__date__lte=ate)
                | Q(created_at__date__lte=ate)
            )
        return qs.distinct().order_by("-created_at")

    def create(self, request, *args, **kwargs):
        if not _pode_criar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            pub = Publicacao.objects.get(pk=response.data["id"])
            registar_auditoria(
                AcaoAuditoria.MKT_PUBLICACAO_CRIADA,
                f"Criou publicação «{pub.titulo_interno}»",
                actor=request.user,
                alvo=pub,
            )
        return response

    def partial_update(self, request, *args, **kwargs):
        if not _pode_editar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        pub = self.get_object()
        response = super().partial_update(request, *args, **kwargs)
        registar_auditoria(
            AcaoAuditoria.MKT_PUBLICACAO_EDITADA,
            f"Editou publicação «{pub.titulo_interno}»",
            actor=request.user,
            alvo=pub,
        )
        return response

    def destroy(self, request, *args, **kwargs):
        if not _pode_eliminar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        pub = self.get_object()
        titulo = pub.titulo_interno
        alvo = pub
        response = super().destroy(request, *args, **kwargs)
        registar_auditoria(
            AcaoAuditoria.MKT_PUBLICACAO_ELIMINADA,
            f"Eliminou publicação «{titulo}»",
            actor=request.user,
            alvo=alvo,
        )
        return response


class PublicacaoPublicarAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        if not _pode_publicar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        if not _rate_limit_publicar(request.user):
            return Response(
                {"error": "Limite de publicações por hora atingido"},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        pub = Publicacao.objects.filter(pk=pk).prefetch_related("destinos", "midias").first()
        if not pub:
            return Response({"error": "Não encontrado"}, status=status.HTTP_404_NOT_FOUND)
        if pub.estado not in (EstadoPublicacao.RASCUNHO, EstadoPublicacao.FALHOU, EstadoPublicacao.PARCIAL):
            return Response({"error": "Estado inválido para publicação"}, status=status.HTTP_400_BAD_REQUEST)

        err = _validar_publicacao(pub)
        if err:
            return Response({"error": err}, status=status.HTTP_400_BAD_REQUEST)

        publicar_publicacao(pub)
        pub.refresh_from_db()
        registar_auditoria(
            AcaoAuditoria.MKT_PUBLICACAO_PUBLICADA,
            f"Publicou «{pub.titulo_interno}»",
            actor=request.user,
            alvo=pub,
        )
        return Response(PublicacaoSerializer(pub, context={"request": request}).data)


class PublicacaoAgendarAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        if not _pode_publicar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        pub = Publicacao.objects.filter(pk=pk).prefetch_related("destinos", "midias").first()
        if not pub:
            return Response({"error": "Não encontrado"}, status=status.HTTP_404_NOT_FOUND)
        if pub.estado not in (EstadoPublicacao.RASCUNHO, EstadoPublicacao.CANCELADO):
            return Response({"error": "Estado inválido para agendamento"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = PublicacaoAgendarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        err = _validar_publicacao(pub)
        if err:
            return Response({"error": err}, status=status.HTTP_400_BAD_REQUEST)

        pub.agendado_para = serializer.validated_data["agendado_para"]
        pub.estado = EstadoPublicacao.AGENDADO
        pub.save(update_fields=["agendado_para", "estado", "updated_at"])
        pub.destinos.exclude(estado=EstadoDestino.PUBLICADO).update(
            estado=EstadoDestino.PENDENTE, erro=""
        )

        registar_auditoria(
            AcaoAuditoria.MKT_PUBLICACAO_AGENDADA,
            f"Agendou «{pub.titulo_interno}» para {pub.agendado_para}",
            actor=request.user,
            alvo=pub,
        )
        return Response(PublicacaoSerializer(pub, context={"request": request}).data)


class PublicacaoCancelarAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not _pode_publicar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        pub = Publicacao.objects.filter(pk=pk).first()
        if not pub:
            return Response({"error": "Não encontrado"}, status=status.HTTP_404_NOT_FOUND)
        if pub.estado != EstadoPublicacao.AGENDADO:
            return Response({"error": "Só agendamentos podem ser cancelados"}, status=status.HTTP_400_BAD_REQUEST)
        pub.estado = EstadoPublicacao.CANCELADO
        pub.save(update_fields=["estado", "updated_at"])
        pub.destinos.update(estado=EstadoDestino.CANCELADO)
        registar_auditoria(
            AcaoAuditoria.MKT_PUBLICACAO_CANCELADA,
            f"Cancelou agendamento «{pub.titulo_interno}»",
            actor=request.user,
            alvo=pub,
        )
        return Response(PublicacaoSerializer(pub, context={"request": request}).data)


class PublicacaoRepublicarAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not _pode_publicar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        pub = Publicacao.objects.filter(pk=pk).prefetch_related("destinos", "midias").first()
        if not pub:
            return Response({"error": "Não encontrado"}, status=status.HTTP_404_NOT_FOUND)
        pub.destinos.filter(estado=EstadoDestino.FALHOU).update(
            estado=EstadoDestino.PENDENTE, erro=""
        )
        publicar_publicacao(pub)
        pub.refresh_from_db()
        registar_auditoria(
            AcaoAuditoria.MKT_PUBLICACAO_REPUBLICADA,
            f"Republicou publicação «{pub.titulo_interno}»",
            actor=request.user,
            alvo=pub,
        )
        return Response(PublicacaoSerializer(pub, context={"request": request}).data)


def _validar_publicacao(pub: Publicacao) -> str | None:
    if not pub.destinos.exists():
        return "Configure pelo menos uma rede de destino"
    plataformas = set(pub.destinos.values_list("plataforma", flat=True))
    if PlataformaSocial.INSTAGRAM in plataformas and not pub.midias.exists():
        return "Instagram exige pelo menos uma imagem"
    if PlataformaSocial.TIKTOK in plataformas and not pub.midias.filter(tipo=TipoMidia.VIDEO).exists():
        return "TikTok exige pelo menos um vídeo"
    if not pub.texto.strip() and PlataformaSocial.LINKEDIN in plataformas:
        return "Texto obrigatório para LinkedIn"
    return None


class ContaSocialViewSet(viewsets.GenericViewSet, viewsets.mixins.ListModelMixin):
    serializer_class = ContaSocialSerializer
    permission_classes = [IsAuthenticated]
    queryset = ContaSocial.objects.select_related("ligada_por").filter(ativa=True)

    def get_queryset(self):
        if not _pode_ver(self.request.user):
            return ContaSocial.objects.none()
        return super().get_queryset()


class ContaSocialDeleteAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        if not _pode_gerir_contas(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        conta = ContaSocial.objects.filter(pk=pk).first()
        if not conta:
            return Response({"error": "Não encontrado"}, status=status.HTTP_404_NOT_FOUND)
        nome = conta.nome_exibicao
        conta.ativa = False
        conta.save(update_fields=["ativa", "updated_at"])
        registar_auditoria(
            AcaoAuditoria.MKT_CONTA_DESLIGADA,
            f"Desligou conta {conta.get_plataforma_display()} «{nome}»",
            actor=request.user,
            alvo=conta,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class MarketingMediaAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not _pode_editar(request.user) and not _pode_criar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        serializer = MediaUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        publicacao = None
        if pub_id := data.get("publicacao_id"):
            publicacao = Publicacao.objects.filter(pk=pub_id).first()
            if not publicacao:
                return Response({"error": "Publicação não encontrada"}, status=status.HTTP_404_NOT_FOUND)
        else:
            publicacao = Publicacao.objects.create(
                titulo_interno="Rascunho de mídia",
                texto="",
                criado_por=request.user,
            )
        midia = PublicacaoMidia.objects.create(
            publicacao=publicacao,
            ficheiro=data["ficheiro"],
            tipo=data["tipo"],
            ordem=data["ordem"],
        )
        registar_auditoria(
            AcaoAuditoria.MKT_MIDIA_ADICIONADA,
            f"Adicionou mídia ({data['tipo']}) à publicação «{publicacao.titulo_interno}»",
            actor=request.user,
            alvo=publicacao,
        )
        return Response(
            {
                "publicacao_id": publicacao.pk,
                "midia": PublicacaoMidiaSerializer(midia, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class MarketingMediaDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk: int):
        if not _pode_editar(request.user) and not _pode_criar(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        midia = PublicacaoMidia.objects.select_related("publicacao").filter(pk=pk).first()
        if not midia:
            return Response({"error": "Mídia não encontrada"}, status=status.HTTP_404_NOT_FOUND)
        publicacao = midia.publicacao
        if publicacao.estado not in (EstadoPublicacao.RASCUNHO, EstadoPublicacao.CANCELADO):
            return Response(
                {"error": "Só é possível remover mídia de rascunhos"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if midia.ficheiro:
            midia.ficheiro.delete(save=False)
        titulo_pub = publicacao.titulo_interno
        midia.delete()
        registar_auditoria(
            AcaoAuditoria.MKT_MIDIA_REMOVIDA,
            f"Removeu mídia da publicação «{titulo_pub}»",
            actor=request.user,
            alvo=publicacao,
        )
        for ordem, restante in enumerate(publicacao.midias.order_by("ordem", "id")):
            if restante.ordem != ordem:
                restante.ordem = ordem
                restante.save(update_fields=["ordem", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class MarketingCalendarioAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _pode_ver(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        de = request.query_params.get("de")
        ate = request.query_params.get("ate")
        qs = Publicacao.objects.prefetch_related("destinos").exclude(
            estado__in=[EstadoPublicacao.CANCELADO]
        )
        if de:
            qs = qs.filter(
                Q(agendado_para__date__gte=de)
                | Q(publicado_em__date__gte=de)
                | Q(created_at__date__gte=de)
            )
        if ate:
            qs = qs.filter(
                Q(agendado_para__date__lte=ate)
                | Q(publicado_em__date__lte=ate)
                | Q(created_at__date__lte=ate)
            )
        eventos = []
        for pub in qs[:500]:
            data_evento = pub.agendado_para or pub.publicado_em or pub.created_at
            eventos.append(
                {
                    "id": pub.pk,
                    "titulo": pub.titulo_interno,
                    "estado": pub.estado,
                    "data": data_evento.isoformat() if data_evento else None,
                    "plataformas": list(pub.destinos.values_list("plataforma", flat=True)),
                }
            )
        return Response({"eventos": eventos})


class MarketingEstatisticasAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _pode_ver(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        por_estado = dict(
            Publicacao.objects.values("estado")
            .annotate(total=Count("id"))
            .values_list("estado", "total")
        )
        por_plataforma = dict(
            PublicacaoDestino.objects.values("plataforma")
            .annotate(total=Count("id"))
            .values_list("plataforma", "total")
        )
        contas = ContaSocial.objects.filter(ativa=True).count()
        return Response(
            {
                "por_estado": por_estado,
                "por_plataforma": por_plataforma,
                "contas_ligadas": contas,
            }
        )


class MetaOAuthStartAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _pode_gerir_contas(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        if not get_marketing_config().meta_app_id:
            return Response(
                {"error": "Meta App ID não configurado (Administração → Sistema)"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        state = secrets.token_urlsafe(32)
        cache.set(f"marketing_oauth_meta:{state}", request.user.pk, timeout=600)
        return Response({"url": meta_svc.oauth_start_url(state)})


class MetaOAuthCallbackAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get("code")
        state = request.query_params.get("state")
        if not code or not state:
            return HttpResponseRedirect(f"{settings.WEB_URL}/marketing/contas?erro=oauth")
        user_id = cache.get(f"marketing_oauth_meta:{state}")
        cache.delete(f"marketing_oauth_meta:{state}")
        if not user_id:
            return HttpResponseRedirect(f"{settings.WEB_URL}/marketing/contas?erro=state")
        try:
            token_data = meta_svc.trocar_codigo_por_token(code)
            long_data = meta_svc.token_longa_duracao(token_data["access_token"])
            user_token = long_data["access_token"]
            paginas = meta_svc.listar_paginas(user_token)
            cache.set(
                f"marketing_oauth_meta_result:{user_id}",
                {"user_token": user_token, "paginas": paginas},
                timeout=600,
            )
        except meta_svc.MetaAPIError as exc:
            cache.set(
                f"marketing_oauth_meta_error:{user_id}",
                str(exc),
                timeout=300,
            )
            return HttpResponseRedirect(f"{settings.WEB_URL}/marketing/contas?erro=meta")
        return HttpResponseRedirect(f"{settings.WEB_URL}/marketing/contas?oauth=meta")


class MetaOAuthDisponiveisAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _pode_gerir_contas(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        data = cache.get(f"marketing_oauth_meta_result:{request.user.pk}")
        if not data:
            return Response({"paginas": []})
        return Response({"paginas": data.get("paginas", [])})


class MetaOAuthLigarAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not _pode_gerir_contas(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        oauth_data = cache.get(f"marketing_oauth_meta_result:{request.user.pk}")
        if not oauth_data:
            return Response({"error": "Sessão OAuth expirada"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = MetaLigarContaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        page_token = encriptar_token(data["page_token"])
        expira = timezone.now() + timedelta(days=55)
        contas_criadas = []

        if data["tipo"] == "FACEBOOK":
            conta, _ = ContaSocial.objects.update_or_create(
                plataforma=PlataformaSocial.FACEBOOK,
                external_id=data["page_id"],
                defaults={
                    "nome_exibicao": data["page_name"],
                    "access_token": page_token,
                    "token_expira_em": expira,
                    "metadata": {"page_id": data["page_id"]},
                    "ativa": True,
                    "ligada_por": request.user,
                },
            )
            contas_criadas.append(conta)

        if data["tipo"] == "INSTAGRAM":
            ig_id = data.get("ig_user_id")
            if not ig_id:
                return Response({"error": "ig_user_id obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
            nome = data.get("ig_username") or data["page_name"]
            conta, _ = ContaSocial.objects.update_or_create(
                plataforma=PlataformaSocial.INSTAGRAM,
                external_id=ig_id,
                defaults={
                    "nome_exibicao": nome,
                    "access_token": page_token,
                    "token_expira_em": expira,
                    "metadata": {
                        "ig_user_id": ig_id,
                        "page_id": data["page_id"],
                    },
                    "ativa": True,
                    "ligada_por": request.user,
                },
            )
            contas_criadas.append(conta)

        for conta in contas_criadas:
            registar_auditoria(
                AcaoAuditoria.MKT_CONTA_LIGADA,
                f"Ligou conta {conta.get_plataforma_display()} «{conta.nome_exibicao}»",
                actor=request.user,
                alvo=conta,
            )
        cache.delete(f"marketing_oauth_meta_result:{request.user.pk}")
        return Response(ContaSocialSerializer(contas_criadas, many=True).data, status=status.HTTP_201_CREATED)


class LinkedInOAuthStartAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _pode_gerir_contas(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        if not get_marketing_config().linkedin_client_id:
            return Response(
                {"error": "LinkedIn Client ID não configurado (Administração → Sistema)"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        state = secrets.token_urlsafe(32)
        cache.set(f"marketing_oauth_linkedin:{state}", request.user.pk, timeout=600)
        return Response({"url": li_svc.oauth_start_url(state)})


class LinkedInOAuthCallbackAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get("code")
        state = request.query_params.get("state")
        if not code or not state:
            return HttpResponseRedirect(f"{settings.WEB_URL}/marketing/contas?erro=oauth")
        user_id = cache.get(f"marketing_oauth_linkedin:{state}")
        cache.delete(f"marketing_oauth_linkedin:{state}")
        if not user_id:
            return HttpResponseRedirect(f"{settings.WEB_URL}/marketing/contas?erro=state")
        try:
            token_data = li_svc.trocar_codigo_por_token(code)
            access_token = token_data["access_token"]
            orgs = li_svc.listar_organizacoes(access_token)
            expires_in = token_data.get("expires_in", 5184000)
            cache.set(
                f"marketing_oauth_linkedin_result:{user_id}",
                {
                    "access_token": access_token,
                    "expires_in": expires_in,
                    "organizacoes": orgs,
                },
                timeout=600,
            )
        except li_svc.LinkedInAPIError:
            return HttpResponseRedirect(f"{settings.WEB_URL}/marketing/contas?erro=linkedin")
        return HttpResponseRedirect(f"{settings.WEB_URL}/marketing/contas?oauth=linkedin")


class LinkedInOAuthDisponiveisAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _pode_gerir_contas(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        data = cache.get(f"marketing_oauth_linkedin_result:{request.user.pk}")
        if not data:
            return Response({"organizacoes": []})
        return Response({"organizacoes": data.get("organizacoes", [])})


class LinkedInOAuthLigarAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not _pode_gerir_contas(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        oauth_data = cache.get(f"marketing_oauth_linkedin_result:{request.user.pk}")
        if not oauth_data:
            return Response({"error": "Sessão OAuth expirada"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = LinkedInLigarContaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        token = data.get("access_token") or oauth_data["access_token"]
        expires_in = oauth_data.get("expires_in", 5184000)

        conta, _ = ContaSocial.objects.update_or_create(
            plataforma=PlataformaSocial.LINKEDIN,
            external_id=data["org_id"],
            defaults={
                "nome_exibicao": data["org_nome"],
                "access_token": encriptar_token(token),
                "token_expira_em": timezone.now() + timedelta(seconds=int(expires_in)),
                "metadata": {"org_urn": data["org_urn"], "org_id": data["org_id"]},
                "ativa": True,
                "ligada_por": request.user,
            },
        )
        registar_auditoria(
            AcaoAuditoria.MKT_CONTA_LIGADA,
            f"Ligou conta LinkedIn «{conta.nome_exibicao}»",
            actor=request.user,
            alvo=conta,
        )
        cache.delete(f"marketing_oauth_linkedin_result:{request.user.pk}")
        return Response(ContaSocialSerializer(conta).data, status=status.HTTP_201_CREATED)


class TikTokOAuthStartAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _pode_gerir_contas(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        if not get_marketing_config().tiktok_client_key:
            return Response(
                {"error": "TikTok Client Key não configurado (Administração → Sistema)"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        state = secrets.token_urlsafe(32)
        code_verifier, code_challenge = tiktok_svc.gerar_pkce()
        cache.set(
            f"marketing_oauth_tiktok:{state}",
            {"user_id": request.user.pk, "code_verifier": code_verifier},
            timeout=600,
        )
        return Response({"url": tiktok_svc.oauth_start_url(state, code_challenge)})


class TikTokOAuthCallbackAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get("code")
        state = request.query_params.get("state")
        if not code or not state:
            return HttpResponseRedirect(f"{settings.WEB_URL}/marketing/contas?erro=oauth")
        oauth_state = cache.get(f"marketing_oauth_tiktok:{state}")
        cache.delete(f"marketing_oauth_tiktok:{state}")
        if not oauth_state:
            return HttpResponseRedirect(f"{settings.WEB_URL}/marketing/contas?erro=state")
        user_id = oauth_state.get("user_id")
        code_verifier = oauth_state.get("code_verifier", "")
        if not user_id:
            return HttpResponseRedirect(f"{settings.WEB_URL}/marketing/contas?erro=state")
        try:
            token_data = tiktok_svc.trocar_codigo_por_token(code, code_verifier)
            access_token = token_data.get("access_token", "")
            refresh_token = token_data.get("refresh_token", "")
            expires_in = token_data.get("expires_in", 86400)
            perfil = tiktok_svc.obter_perfil(access_token)
            cache.set(
                f"marketing_oauth_tiktok_result:{user_id}",
                {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "expires_in": expires_in,
                    "perfil": perfil,
                },
                timeout=600,
            )
        except tiktok_svc.TikTokAPIError:
            return HttpResponseRedirect(f"{settings.WEB_URL}/marketing/contas?erro=tiktok")
        return HttpResponseRedirect(f"{settings.WEB_URL}/marketing/contas?oauth=tiktok")


class TikTokOAuthDisponiveisAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _pode_gerir_contas(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        data = cache.get(f"marketing_oauth_tiktok_result:{request.user.pk}")
        if not data:
            return Response({"perfis": []})
        perfil = data.get("perfil") or {}
        return Response({"perfis": [perfil] if perfil.get("open_id") else []})


class TikTokOAuthLigarAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not _pode_gerir_contas(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        oauth_data = cache.get(f"marketing_oauth_tiktok_result:{request.user.pk}")
        if not oauth_data:
            return Response({"error": "Sessão OAuth expirada"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = TikTokLigarContaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        token = data.get("access_token") or oauth_data["access_token"]
        refresh_token = oauth_data.get("refresh_token", "")
        expires_in = oauth_data.get("expires_in", 86400)
        perfil = oauth_data.get("perfil") or {}

        conta, _ = ContaSocial.objects.update_or_create(
            plataforma=PlataformaSocial.TIKTOK,
            external_id=data["open_id"],
            defaults={
                "nome_exibicao": data["display_name"],
                "access_token": encriptar_token(token),
                "token_expira_em": timezone.now() + timedelta(seconds=int(expires_in)),
                "metadata": {
                    "open_id": data["open_id"],
                    "display_name": data["display_name"],
                    "avatar_url": perfil.get("avatar_url", ""),
                    "refresh_token": encriptar_token(refresh_token) if refresh_token else "",
                },
                "ativa": True,
                "ligada_por": request.user,
            },
        )
        registar_auditoria(
            AcaoAuditoria.MKT_CONTA_LIGADA,
            f"Ligou conta TikTok «{conta.nome_exibicao}»",
            actor=request.user,
            alvo=conta,
        )
        cache.delete(f"marketing_oauth_tiktok_result:{request.user.pk}")
        return Response(ContaSocialSerializer(conta).data, status=status.HTTP_201_CREATED)


class CorEstadoPublicacaoViewSet(viewsets.GenericViewSet, viewsets.mixins.ListModelMixin, viewsets.mixins.UpdateModelMixin):
    serializer_class = CorEstadoPublicacaoSerializer
    permission_classes = [IsAuthenticated]
    queryset = CorEstadoPublicacao.objects.all()
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        if not _pode_ver(self.request.user):
            return CorEstadoPublicacao.objects.none()
        return super().get_queryset()

    def partial_update(self, request, *args, **kwargs):
        if not is_admin_geral(request.user):
            return Response({"error": "Sem permissão"}, status=status.HTTP_403_FORBIDDEN)
        allowed = {"cor", "nome"}
        if not allowed.intersection(request.data.keys()):
            return Response({"error": "Nada para actualizar"}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)
