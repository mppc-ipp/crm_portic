# Generated manually

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("dashboard", "0004_evento_criado_por_membros"),
    ]

    operations = [
        migrations.DeleteModel(
            name="MembroEvento",
        ),
        migrations.RemoveField(
            model_name="evento",
            name="criado_por",
        ),
    ]
