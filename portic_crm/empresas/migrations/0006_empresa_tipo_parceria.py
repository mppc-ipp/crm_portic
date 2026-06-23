from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0005_tipointeracao_cor"),
    ]

    operations = [
        migrations.AddField(
            model_name="empresa",
            name="tipo_parceria",
            field=models.CharField(
                blank=True,
                choices=[
                    ("ACADEMICA", "Académica"),
                    ("EMPRESARIAL", "Empresarial"),
                    ("SOCIEDADE_CIVIL", "Sociedade Civil"),
                ],
                max_length=20,
                verbose_name="Tipo de parceria",
            ),
        ),
    ]
