from django.contrib.auth import get_user_model
from .models import ExternalIdentity

User = get_user_model()

class IdentityService:
    @staticmethod
    def resolve_user(provider, identifier):
        """
        Resolves an external identity (github username, jira email) to a platform User.
        Priority:
        1. Explicit mapping in ExternalIdentity
        2. Email match in User
        3. Username match in User
        """
        if not identifier:
            return None

        # 1. Explicit mapping
        try:
            mapping = ExternalIdentity.objects.get(provider=provider, external_id=identifier)
            return mapping.user
        except ExternalIdentity.DoesNotExist:
            pass

        # 2. Email match
        user_by_email = User.objects.filter(email=identifier).first()
        if user_by_email:
            return user_by_email

        # 3. Username match
        user_by_username = User.objects.filter(username=identifier).first()
        if user_by_username:
            return user_by_username

        return None
