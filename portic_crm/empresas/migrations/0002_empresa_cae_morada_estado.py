from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="empresa",
            name="cae",
            field=models.CharField(blank=True, max_length=10, verbose_name="CAE"),
        ),
        migrations.AddField(
            model_name="empresa",
            name="codigo_postal",
            field=models.CharField(blank=True, max_length=8, verbose_name="Código postal"),
        ),
        migrations.AddField(
            model_name="empresa",
            name="concelho",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="empresa",
            name="distrito",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="empresa",
            name="estado",
            field=models.CharField(
                choices=[
                    ("ATIVO", "Ativo"),
                    ("INATIVO", "Inativo"),
                    ("PROSPETO", "Prospeto / Lead"),
                    ("SUSPENSO", "Suspenso"),
                    ("STARTUP", "StartUp"),
                    ("PARCEIRA", "Parceira"),
                ],
                default="ATIVO",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="empresa",
            name="localidade",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="empresa",
            name="morada",
            field=models.CharField(blank=True, max_length=255, verbose_name="Morada"),
        ),
        migrations.AlterField(
            model_name="contacto",
            name="telefone",
            field=models.CharField(blank=True, max_length=40),
        ),
        migrations.AlterField(
            model_name="empresa",
            name="telefone",
            field=models.CharField(blank=True, max_length=40),
        ),
    ]
