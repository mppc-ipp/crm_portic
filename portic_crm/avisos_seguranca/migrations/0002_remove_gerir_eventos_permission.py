from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("avisos_seguranca", "0001_initial"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="avisoseguranca",
            options={
                "default_permissions": (),
                "ordering": ["-data_inicio", "-created_at"],
                "permissions": [
                    ("view_avisoseguranca", "Ver avisos de segurança"),
                    ("gerir_avisos", "Gerir avisos de segurança"),
                    ("gerir_ocorrencias", "Gerir ocorrências de segurança"),
                ],
                "verbose_name": "aviso de segurança",
                "verbose_name_plural": "avisos de segurança",
            },
        ),
    ]
