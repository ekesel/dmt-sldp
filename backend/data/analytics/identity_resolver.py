import logging
from data.models import UserIdentityMapping
from django.contrib.auth import get_user_model
from django.db.models import Q


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
                canonical = mapping.canonical_email.lower()
                all_identities = set()
                
                identities_data = mapping.source_identities or {}
                if isinstance(identities_data, dict):
                    for k, val in identities_data.items():
                        if isinstance(val, list):
                            for item in val:
                                if isinstance(item, str):
                                    all_identities.add(item.lower())
                        elif isinstance(val, str):
                            all_identities.add(val.lower())
                elif isinstance(identities_data, list):
                    for item in identities_data:
                        if isinstance(item, dict) and item.get('email'):
                            all_identities.add(item['email'].lower())
                        elif isinstance(item, str):
                            all_identities.add(item.lower())
                
                if mapping.canonical_name:
                    all_identities.add(mapping.canonical_name.lower())

                for identity in all_identities:
                    self._cache[identity] = mapping.canonical_email

                all_identities.add(canonical)
                self._reverse_cache[canonical] = all_identities
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

def get_inactive_user_emails_expanded(tenant=None):
    """
    Returns a set of all inactive emails including their mapped aliases.
    """
    User = get_user_model()
    
    qs = User.objects.filter(is_active=False)
    if tenant:
        qs = qs.filter(tenant=tenant)
        
    base_emails = list(qs.values_list('email', flat=True))
    
    resolver = IdentityResolver()
    resolver.load()
    
    active_emails = set(User.objects.filter(is_active=True).values_list('email', flat=True))
    
    expanded = set()
    for email in base_emails:
        if email:
            canonical = resolver.resolve(email)
            aliases = set(resolver.all_aliases(canonical)) | {email, canonical}
            # Only add aliases that do NOT belong to an active user account
            expanded.update(e for e in aliases if e not in active_emails)
            
    return list(expanded)



def get_non_developer_user_emails_expanded(tenant=None):
    """
    Returns a set of all non-developer emails (PMs, QA, Managers) including their mapped aliases.
    """
    
    User = get_user_model()
    
    # Check both role_code and role_name for non-developer roles
    qs = User.objects.filter(
        Q(role__role_code__in=[
            'PM', 'QA', 'TESTER', 'PROJECT_MANAGER', 'PRODUCT_MANAGER', 
            'SCRUM_MASTER', 'MANAGER', 'LEAD', 'QA_TEAM_LEAD', 
            'QA_ENGINEER', 'QA_INTERN'
        ]) | 
        Q(role__role_name__icontains='pm') |
        Q(role__role_name__icontains='tester') |
        Q(role__role_name__icontains='manager') |
        Q(role__role_name__icontains='qa') |
        Q(role__role_name__icontains='scrum')
    )
    if tenant:
        qs = qs.filter(tenant=tenant)
        
    base_emails = list(qs.values_list('email', flat=True))
    
    resolver = IdentityResolver()
    resolver.load()
    
    expanded = set()
    for email in base_emails:
        if email:
            canonical = resolver.resolve(email)
            expanded.update(resolver.all_aliases(canonical))
            expanded.add(email)
            
    return list(expanded)
