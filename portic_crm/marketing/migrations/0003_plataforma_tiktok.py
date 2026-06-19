from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("marketing", "0002_grant_admin_marketing_perms"),
    ]

    operations = [
        migrations.AlterField(
            model_name="contasocial",
            name="plataforma",
            field=models.CharField(
                choices=[
                    ("FACEBOOK", "Facebook"),
                    ("INSTAGRAM", "Instagram"),
                    ("LINKEDIN", "LinkedIn"),
                    ("TIKTOK", "TikTok"),
                ],
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="publicacaodestino",
            name="plataforma",
            field=models.CharField(
                choices=[
                    ("FACEBOOK", "Facebook"),
                    ("INSTAGRAM", "Instagram"),
                    ("LINKEDIN", "LinkedIn"),
                    ("TIKTOK", "TikTok"),
                ],
                max_length=20,
            ),
        ),
    ]
