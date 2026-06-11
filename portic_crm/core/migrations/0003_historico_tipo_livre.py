from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_historico_data_opcional_tipos"),
    ]

    operations = [
        migrations.AlterField(
            model_name="historicoentrada",
            name="tipo",
            field=models.CharField(default="TEXTO_LIVRE", max_length=40),
        ),
    ]
