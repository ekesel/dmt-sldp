from typing import Optional
from django.contrib.auth import get_user_model
from .models import ExternalIdentity
import logging

User = get_user_model()
logger = logging.getLogger(__name__)

class UserResolver:
    """
    Utility to map external emails/usernames to system users.
    """
    @staticmethod
    def resolve_by_identity(provider: str, identifier: str) -> Optional[User]:
        """
        Attempts to find a user by their ExternalIdentity.
        """
        if not identifier:
            return None
            
        try:
            identity = ExternalIdentity.objects.select_related('user').get(
                provider=provider,
                external_id=identifier
            )
            return identity.user
        except ExternalIdentity.DoesNotExist:
            # Fallback: Check if a user directly has this email
            try:
                return User.objects.get(email=identifier)
            except User.DoesNotExist:
                return None
        except Exception as e:
            logger.error(f"Error resolving user: {e}")
            return None
