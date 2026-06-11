from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("startups", "0004_remove_candidatura_contactado"),
    ]

    operations = [
        migrations.AlterField(
            model_name="candidatura",
            name="email_contacto",
            field=models.EmailField(blank=True),
        ),
        migrations.AlterField(
            model_name="candidatura",
            name="nome_startup",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
