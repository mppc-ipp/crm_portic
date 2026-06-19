from django.core.management.base import BaseCommand

from portic_crm.marketing.models import ContaSocial, PlataformaSocial

CONTAS_DEMO = [
    {
        "plataforma": PlataformaSocial.FACEBOOK,
        "nome_exibicao": "Portic Demo (Facebook)",
        "external_id": "demo-facebook-001",
    },
    {
        "plataforma": PlataformaSocial.INSTAGRAM,
        "nome_exibicao": "portic_demo",
        "external_id": "demo-instagram-001",
    },
    {
        "plataforma": PlataformaSocial.LINKEDIN,
        "nome_exibicao": "Portic — Demo",
        "external_id": "demo-linkedin-001",
    },
    {
        "plataforma": PlataformaSocial.TIKTOK,
        "nome_exibicao": "@portic_demo",
        "external_id": "demo-tiktok-001",
    },
]


class Command(BaseCommand):
    help = "Cria contas sociais fictícias para testar pré-visualização sem OAuth."

    def handle(self, *args, **options):
        criadas = 0
        reactivadas = 0

        for dados in CONTAS_DEMO:
            conta, created = ContaSocial.objects.get_or_create(
                plataforma=dados["plataforma"],
                external_id=dados["external_id"],
                defaults={
                    "nome_exibicao": dados["nome_exibicao"],
                    "access_token": "demo-token",
                    "metadata": {"demo": True},
                    "ativa": True,
                },
            )
            if created:
                criadas += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Criada: {conta.get_plataforma_display()} — {conta.nome_exibicao}"
                    )
                )
                continue

            updates = []
            if conta.nome_exibicao != dados["nome_exibicao"]:
                conta.nome_exibicao = dados["nome_exibicao"]
                updates.append("nome_exibicao")
            if not conta.ativa:
                conta.ativa = True
                updates.append("ativa")
                reactivadas += 1
            if updates:
                conta.save(update_fields=[*updates, "updated_at"])
            self.stdout.write(
                f"Já existia: {conta.get_plataforma_display()} — {conta.nome_exibicao}"
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Concluído: {criadas} criada(s), {reactivadas} reactivada(s)."
            )
        )
