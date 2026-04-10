from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'

    def ready(self):
        # Import models here to ensure signals (defined at bottom of models.py)
        # are registered when Django starts
        import notifications.models  # noqa
