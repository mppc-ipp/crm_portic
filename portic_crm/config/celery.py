import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "portic_crm.config.settings")

app = Celery("portic_crm")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "marketing-publicar-agendados": {
        "task": "portic_crm.marketing.tasks.publicar_agendados",
        "schedule": 60.0,
    },
    "marketing-renovar-tokens-meta": {
        "task": "portic_crm.marketing.tasks.renovar_tokens_meta",
        "schedule": crontab(hour=3, minute=0),
    },
    "marketing-renovar-tokens-linkedin": {
        "task": "portic_crm.marketing.tasks.renovar_tokens_linkedin",
        "schedule": crontab(hour=4, minute=0),
    },
}
