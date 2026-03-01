import os
from pathlib import Path
from datetime import timedelta
from corsheaders.defaults import default_headers, default_methods

BASE_DIR = Path(__file__).resolve().parent.parent

IS_PRODUCTION = os.environ.get('PRODUCTION', 'False') == 'True'

if IS_PRODUCTION and not os.environ.get('DJANGO_SECRET_KEY'):
    raise ValueError("DJANGO_SECRET_KEY environment variable is required in production")
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-dummy-key')

DEBUG = not IS_PRODUCTION

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
APPEND_SLASH = False

# Application definition
SHARED_APPS = [
    'daphne',
    'core',
    'django_tenants',
    'tenants.apps.TenantsConfig',
    'users',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt',
    'channels',
    'configuration',
    'notifications',
]

TENANT_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'data',
]

INSTALLED_APPS = list(SHARED_APPS) + [app for app in TENANT_APPS if app not in SHARED_APPS]

TENANT_MODEL = "tenants.Tenant"
TENANT_DOMAIN_MODEL = "tenants.Domain"

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django_tenants.middleware.main.TenantMainMiddleware',
    'core.middleware.TenantHeaderMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'core.middleware.AuditLogMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

ASGI_APPLICATION = 'core.asgi.application'
WSGI_APPLICATION = 'core.wsgi.application'
DATABASE_ROUTERS = (
    'django_tenants.routers.TenantSyncRouter',
)

DATABASES = {
    'default': {
        'ENGINE': 'django_tenants.postgresql_backend',
        'NAME': os.environ.get('DB_NAME', 'dmt_sldp'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'postgres'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    )
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
# MEDIA configuration is below in CORS & Security section for organization
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'users.User'

CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://redis:6379/1')
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [(os.environ.get('REDIS_HOST', 'redis'), 6379)],
        },
    },
}

# Static & Media Files
STATIC_URL = 'static/'
MEDIA_URL = 'media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Ensure media directory exists
if not os.path.exists(MEDIA_ROOT):
    os.makedirs(MEDIA_ROOT, exist_ok=True)

# CORS & Security
def csv_env(name, default):
    return [x.strip() for x in os.environ.get(name, default).split(",") if x.strip()]

CORS_ALLOW_ALL_ORIGINS = True
# CORS_ALLOWED_ORIGINS = csv_env(
#     "CORS_ALLOWED_ORIGINS",
#     "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"
# )

CSRF_TRUSTED_ORIGINS = csv_env(
    "CSRF_TRUSTED_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"
)

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = list(default_headers) + ['authorization', 'content-type', 'x-tenant']
CORS_ALLOW_METHODS = list(default_methods)

# Production Security
# IS_PRODUCTION definition moved to top of file

if IS_PRODUCTION:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
else:
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
    
TENANT_DOMAIN_SUFFIX = os.environ.get('TENANT_DOMAIN_SUFFIX', 'localhost')
