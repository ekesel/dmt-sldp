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
        self._reverse_cache = {}  # canonical_email -> set of all alias emails
        try:
            for mapping in UserIdentityMapping.objects.all():
                all_emails = set()
                for identity in mapping.source_identities:
                    email = identity.get('email')
                    if email:
                        self._cache[email.lower()] = mapping.canonical_email
                        all_emails.add(email.lower())
                all_emails.add(mapping.canonical_email.lower())
                self._reverse_cache[mapping.canonical_email.lower()] = all_emails
        except Exception as exc:
            logger.debug("IdentityResolver could not load mappings: %s", exc)

    def resolve(self, email: str) -> str:
        """
        Returns the canonical email for a given alias, or the original email if no mapping exists.
        """
        if not email:
            return email
        return self._cache.get(email.lower(), email)

    def all_aliases(self, canonical_email: str) -> list:
        """
        Returns all known email aliases for a canonical email (including the canonical itself).
        Falls back to [canonical_email] if no mapping exists.
        """
        if not canonical_email:
            return []
        key = canonical_email.lower()
        emails = self._reverse_cache.get(key)
        if emails:
            return list(emails)
        return [canonical_email]
