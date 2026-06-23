from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("viaturas", "0002_grant_admin_perms"),
    ]

    operations = [
        migrations.AddField(
            model_name="viatura",
            name="dono",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="viatura",
            name="sala",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="viatura",
            name="telemovel",
            field=models.CharField(blank=True, default="", max_length=30),
        ),
    ]
