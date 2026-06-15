from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("projetos", "0007_projeto_criado_por"),
    ]

    operations = [
        migrations.AddField(
            model_name="projeto",
            name="arquivado",
            field=models.BooleanField(default=False),
        ),
    ]
