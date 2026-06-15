import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("dashboard", "0005_revert_evento_membros"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="evento",
            name="particular",
            field=models.BooleanField(
                default=False,
                help_text="Se activo, o evento só é visível para quem o criou.",
            ),
        ),
        migrations.AddField(
            model_name="evento",
            name="criado_por",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="eventos_criados",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
