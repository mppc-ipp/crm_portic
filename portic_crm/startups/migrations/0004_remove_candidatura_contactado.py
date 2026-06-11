from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("startups", "0003_status_e_tipos_historico"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="candidatura",
            name="contactado",
        ),
    ]
