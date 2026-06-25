from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("administrador", "0006_configuracao_marketing_tiktok"),
    ]

    operations = [
        migrations.AddField(
            model_name="configuracaosistema",
            name="limpeza_ficheiros_dias",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Apagar ficheiros órfãos com mais de N dias. 0 = desativado.",
            ),
        ),
        migrations.AddField(
            model_name="configuracaosistema",
            name="limpeza_ficheiros_automatica",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="configuracaosistema",
            name="limpeza_ficheiros_ultima",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
