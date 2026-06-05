from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="historicoentrada",
            name="data",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="historicoentrada",
            name="tipo",
            field=models.CharField(
                choices=[
                    ("TEXTO_LIVRE", "Texto livre"),
                    ("EVENTO", "Evento"),
                    ("PEDIDO_PORTIC", "Pedido Portic"),
                    ("PEDIDO_EMPRESA", "Pedido Empresa"),
                    ("OUTRO", "Outro"),
                ],
                default="TEXTO_LIVRE",
                max_length=20,
            ),
        ),
    ]
