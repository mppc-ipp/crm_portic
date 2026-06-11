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
    "django_htmx",
    "portic_crm.core",
    "portic_crm.empresas",
    "portic_crm.startups",
    "portic_crm.projetos",
    "portic_crm.espacos",
    "portic_crm.dashboard",
    "portic_crm.administrador",
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
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=12),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if o.strip()
]
CORS_ALLOW_CREDENTIALS = True

API_PUBLIC_URL = os.environ.get("API_PUBLIC_URL", "http://localhost:8000")
WEB_URL = os.environ.get("WEB_URL", "http://localhost:3000")
RESERVA_ADMIN_EMAIL = os.environ.get("RESERVA_ADMIN_EMAIL", "admin@portic.local")
