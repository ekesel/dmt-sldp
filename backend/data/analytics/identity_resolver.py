import logging
from data.models import UserIdentityMapping

logger = logging.getLogger(__name__)


class IdentityResolver:
    """
    Utility to resolve various source emails to a canonical email based on UserIdentityMapping.
    """
    def __init__(self):
        self._cache = {}  # alias_email.lower() -> canonical_email

    def load(self):
        """
        Loads all mappings from the database into the local cache.

        Gracefully handles the case where the table does not yet exist
        (e.g. during test_connection before migrations have been applied).
        """
        self._cache = {}
        try:
            for mapping in UserIdentityMapping.objects.all():
                for identity in mapping.source_identities:
                    email = identity.get('email')
                    if email:
                        self._cache[email.lower()] = mapping.canonical_email
        except Exception as exc:
            # Table may not exist yet (migration pending) — continue with empty cache.
            logger.debug("IdentityResolver could not load mappings: %s", exc)

    def resolve(self, email: str) -> str:
        """
        Returns the canonical email for a given alias, or the original email if no mapping exists.
        """
        if not email:
            return email
        return self._cache.get(email.lower(), email)
