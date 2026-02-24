from typing import Optional
from django.contrib.auth import get_user_model
from .models import ExternalIdentity
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class UserResolver:
    """
    Utility to map external emails/usernames to system users.
    Also handles creating portal-ready User + ExternalIdentity records
    when a new assignee is encountered during ETL sync.
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

    @staticmethod
    def resolve_or_create(
        provider: str,
        external_user_id: str,
        email: Optional[str] = None,
        name: Optional[str] = None,
        tenant=None,
    ) -> Optional[User]:
        """
        Finds or creates a platform User for an assignee encountered during ETL sync.

        Resolution order:
          1. ExternalIdentity(provider, external_user_id) match
          2. User.email match (links ExternalIdentity)
          3. User first_name+last_name match (fallback, email unknown)
          4. Create new User (is_active=False, unusable password — requires invite to log in)

        Always upserts an ExternalIdentity row for the (provider, external_user_id) pair.
        """
        if not external_user_id and not email and not name:
            return None

        user = None

        # 1. ExternalIdentity match
        if external_user_id:
            try:
                identity = ExternalIdentity.objects.select_related('user').get(
                    provider=provider,
                    external_id=external_user_id,
                )
                user = identity.user
            except ExternalIdentity.DoesNotExist:
                pass

        # 2. Email match
        if user is None and email:
            user = User.objects.filter(email=email).first()

        # 3. Name match (only when email is blank — rough fallback)
        if user is None and name and not email:
            parts = name.strip().split(' ', 1)
            first = parts[0]
            last = parts[1] if len(parts) > 1 else ''
            if first and last:
                user = User.objects.filter(
                    first_name__iexact=first,
                    last_name__iexact=last,
                ).first()

        # 4. Create a new portal-ready user (inactive until admin invites)
        if user is None:
            parts = (name or '').strip().split(' ', 1)
            first_name = parts[0] if parts else ''
            last_name = parts[1] if len(parts) > 1 else ''

            if email:
                username = email
            elif name:
                username = name.lower().replace(' ', '.') + f'@{provider}.sync'
            else:
                username = f'{provider}.{external_user_id}'

            # Ensure username is unique
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f'{base_username}.{counter}'
                counter += 1

            user = User(
                username=username,
                email=email or '',
                first_name=first_name,
                last_name=last_name,
                is_active=False,   # Cannot log in until admin sends invite
                tenant=tenant,
            )
            user.set_unusable_password()
            user.save()
            logger.info(f"[AssigneeService] Created portal user for {name or email} ({provider}:{external_user_id})")

        # Always upsert the ExternalIdentity link
        if external_user_id:
            ExternalIdentity.objects.get_or_create(
                provider=provider,
                external_id=external_user_id,
                defaults={'user': user},
            )

        # Update name if it was blank and we now have one
        if name and (not user.first_name or not user.last_name):
            parts = name.strip().split(' ', 1)
            user.first_name = user.first_name or parts[0]
            user.last_name = user.last_name or (parts[1] if len(parts) > 1 else '')
            user.save(update_fields=['first_name', 'last_name'])

        return user
