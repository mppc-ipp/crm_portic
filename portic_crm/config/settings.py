import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-dev-only-change-in-production",
)

DEBUG = os.environ.get("DJANGO_DEBUG", "True").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get(
        "DJANGO_ALLOWED_HOSTS",
        "localhost,127.0.0.1,0.0.0.0,web,web:8000",
    ).split(",")
    if h.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "django_htmx",
    "portic_crm.core",
    "portic_crm.empresas",
    "portic_crm.startups",
    "portic_crm.projetos",
    "portic_crm.espacos",
    "portic_crm.dashboard",
    "portic_crm.administrador",
    "portic_crm.marketing",
    "portic_crm.teletrabalho",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django_htmx.middleware.HtmxMiddleware",
]

ROOT_URLCONF = "portic_crm.config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "portic_crm.core.context_processors.navigation",
            ],
        },
    },
]

WSGI_APPLICATION = "portic_crm.config.wsgi.application"
ASGI_APPLICATION = "portic_crm.config.asgi.application"

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgres://portic:portic@localhost:5432/portic_crm",
)
DATABASES = {
    "default": dj_database_url.parse(DATABASE_URL, conn_max_age=600),
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "pt-pt"
TIME_ZONE = "Europe/Lisbon"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR.parent / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR.parent / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LOGIN_URL = "/login/"
LOGIN_REDIRECT_URL = "/"
LOGOUT_REDIRECT_URL = "/login/"

AUTHENTICATION_BACKENDS = [
    "portic_crm.core.auth_backend.EmailAuthBackend",
    "django.contrib.auth.backends.ModelBackend",
]

# Grupos (nomes estáveis para código e migrations)
CRM_VERSION = os.environ.get("CRM_VERSION", "0.1.0")

GRUPO_ADMIN_GERAL = "AdministradorGeral"
GRUPO_ADMIN_PARCIAL = "AdministradorParcial"
GRUPO_UTILIZADOR_COMUM = "UtilizadorComum"
GRUPO_GESTOR = "Gestor"

EMAIL_BACKEND = os.environ.get(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

LOGIN_RATE_LIMIT = int(os.environ.get("LOGIN_RATE_LIMIT", "10"))
LOGIN_RATE_WINDOW_SEC = int(os.environ.get("LOGIN_RATE_WINDOW_SEC", "900"))

ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY", "")

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3002,http://127.0.0.1:3002",
    ).split(",")
    if o.strip()
]
CORS_ALLOW_CREDENTIALS = True

API_PUBLIC_URL = os.environ.get("API_PUBLIC_URL", "http://localhost:8002")
WEB_URL = os.environ.get("WEB_URL", "http://localhost:3002")
RESERVA_ADMIN_EMAIL = os.environ.get("RESERVA_ADMIN_EMAIL", "admin@portic.local")

# Celery
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE

_broker = os.environ.get("CELERY_BROKER_URL", "")
if _broker.startswith("redis://"):
    _cache_url = _broker.rsplit("/", 1)[0] + "/1"
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": _cache_url,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }

# Marketing / redes sociais
META_APP_ID = os.environ.get("META_APP_ID", "")
META_APP_SECRET = os.environ.get("META_APP_SECRET", "")
META_REDIRECT_URI = os.environ.get(
    "META_REDIRECT_URI",
    f"{API_PUBLIC_URL}/api/marketing/oauth/meta/callback",
)
LINKEDIN_CLIENT_ID = os.environ.get("LINKEDIN_CLIENT_ID", "")
LINKEDIN_CLIENT_SECRET = os.environ.get("LINKEDIN_CLIENT_SECRET", "")
LINKEDIN_REDIRECT_URI = os.environ.get(
    "LINKEDIN_REDIRECT_URI",
    f"{API_PUBLIC_URL}/api/marketing/oauth/linkedin/callback",
)
TIKTOK_CLIENT_KEY = os.environ.get("TIKTOK_CLIENT_KEY", "")
TIKTOK_CLIENT_SECRET = os.environ.get("TIKTOK_CLIENT_SECRET", "")
TIKTOK_REDIRECT_URI = os.environ.get(
    "TIKTOK_REDIRECT_URI",
    f"{API_PUBLIC_URL}/api/marketing/oauth/tiktok/callback",
)
MARKETING_MEDIA_PUBLIC_BASE_URL = os.environ.get("MARKETING_MEDIA_PUBLIC_BASE_URL", API_PUBLIC_URL)
MARKETING_DRY_RUN = os.environ.get("MARKETING_DRY_RUN", "False").lower() in ("true", "1", "yes")
MARKETING_PUBLISH_RATE_LIMIT = int(os.environ.get("MARKETING_PUBLISH_RATE_LIMIT", "30"))

if not DEBUG:
    SECURE_SSL_REDIRECT = os.environ.get("DJANGO_SECURE_SSL_REDIRECT", "True").lower() in (
        "true",
        "1",
        "yes",
    )
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_HSTS_SECONDS = int(os.environ.get("DJANGO_HSTS_SECONDS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS
