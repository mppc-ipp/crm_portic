from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("administrador", "0005_configuracao_marketing"),
    ]

    operations = [
        migrations.AddField(
            model_name="configuracaosistema",
            name="marketing_tiktok_client_key",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="configuracaosistema",
            name="marketing_tiktok_client_secret",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="configuracaosistema",
            name="marketing_tiktok_redirect_uri",
            field=models.URLField(blank=True, max_length=500),
        ),
    ]
