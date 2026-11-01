from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework.exceptions import ValidationError
from rest_framework import serializers
from .models import RoleTable
from .models import CustomPermission, UserLevelHistory
from django.utils import timezone
import hashlib
import re

User = get_user_model()

# Host labels: alnum/hyphen. Second-level label >= 2 chars (rejects t.com, 6.rm), alphabetic TLD >= 2 chars.
_DOMAIN_RE = re.compile(r'^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9][a-z0-9-]+\.[a-z]{2,}$', re.I)


def validate_email_domain(email):
    """Raise ValidationError if the part after '@' is not a structurally valid hostname."""
    domain = (email or '').rsplit('@', 1)[-1]
    if not _DOMAIN_RE.match(domain):
        raise serializers.ValidationError("Invalid credentials provided or not accepted.")
    return email


def can_change_level(actor, target):
    """Managers and admins set levels; a manager can't change their own (superusers/platform admins can)."""
    if not actor or not (actor.is_superuser or actor.is_platform_admin or actor.is_manager):
        return False
    is_self = target is not None and target.pk == actor.pk
    return not is_self or actor.is_superuser or actor.is_platform_admin


class UserSerializer(serializers.ModelSerializer):
    tenant_name = serializers.ReadOnlyField(source='tenant.name')
    tenant_slug = serializers.ReadOnlyField(source='tenant.slug')
    role_name = serializers.ReadOnlyField(source='role.role_name')
    avatar_url = serializers.SerializerMethodField()
    permission = serializers.SerializerMethodField()
    # Date the new seniority takes effect (default today); earlier sprints keep the older level.
    seniority_effective_from = serializers.DateField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'tenant', 'tenant_name', 'tenant_slug', 'is_platform_admin', 
            'is_staff', 'is_superuser', 'is_manager', 'is_active', 'date_of_join',
            'role', 'role_name',
            'profile_picture', 'custom_title', 'competitive_title', 
            'competitive_title_reason', 'avatar_url', 'permission', 'seniority',
            'seniority_effective_from',
        ]
        read_only_fields = ['id', 'avatar_url']

    def _level_unchanged(self, value):
        """The user object was sent back with its current level and no new date: nothing to save."""
        return (
            self.instance is not None and not self.initial_data.get('seniority_effective_from')
            and (value or None) == (UserLevelHistory.level_on(self.instance, timezone.localdate()) or self.instance.seniority)
        )

    def validate_seniority(self, value):
        # Seniority drives workload weighting, so users must not set their own.
        if self._level_unchanged(value):
            return value
        request = self.context.get('request')
        if not can_change_level(getattr(request, 'user', None), self.instance):
            raise serializers.ValidationError("Only managers or admins can change seniority, and not their own.")
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # The stored mirror goes stale once a future-dated level takes effect; read it from the history
        # when it's prefetched or this is a single user (nested/list use keeps the mirror: no N+1).
        prefetched = 'level_history' in getattr(instance, '_prefetched_objects_cache', {})
        if 'seniority' in data and instance.pk and (prefetched or self.parent is None):
            data['seniority'] = UserLevelHistory.level_on(instance, timezone.localdate()) or instance.seniority
        return data

    def validate(self, attrs):
        if 'seniority' in attrs and self._level_unchanged(attrs['seniority']):
            attrs.pop('seniority')
        if attrs.get('seniority_effective_from') and 'seniority' not in attrs:
            raise serializers.ValidationError({'seniority_effective_from': 'Send it together with seniority.'})
        return super().validate(attrs)

    def create(self, validated_data):
        level = self._pop_level(validated_data)
        user = super().create(validated_data)
        self._save_level(user, level)
        return user

    def update(self, instance, validated_data):
        level = self._pop_level(validated_data)
        user = super().update(instance, validated_data)
        self._save_level(user, level)
        return user

    def _pop_level(self, validated_data):
        effective_from = validated_data.pop('seniority_effective_from', None)
        if 'seniority' not in validated_data:
            return None
        return validated_data.pop('seniority') or None, effective_from or timezone.localdate()

    def _save_level(self, user, level):
        """Record the level from its effective date; User.seniority mirrors the level in effect today."""
        if level is None:
            return
        seniority, effective_from = level
        request = self.context.get('request')
        UserLevelHistory.objects.update_or_create(
            user=user, effective_from=effective_from,
            defaults={'seniority': seniority, 'created_by': getattr(request, 'user', None)},
        )
        UserLevelHistory.refresh_mirror(user)

    def validate_email(self, value):
        if not value:
            return value
        if not (self.instance and self.instance.email == value):
            validate_email_domain(value)
        # Check if email already exists, excluding the user instance being edited
        qs = User.objects.filter(email__iexact=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("A user with this email address already registered.")
        return value

    def get_avatar_url(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        
        # Fallback to Gravatar
        email = obj.email.lower().encode('utf-8')
        email_hash = hashlib.md5(email).hexdigest()
        return f"https://www.gravatar.com/avatar/{email_hash}?d=identicon&s=200"

    def get_permission(self, obj):
        
        if obj.is_superuser:
            return list(CustomPermission.objects.values_list('permission_code', flat=True))
        if obj.role:
            return list(obj.role.permissions.values_list('permission_code', flat=True))
        return []

class SimpleUserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'avatar_url']

    def get_avatar_url(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        
        
        email = obj.email.lower().encode('utf-8')
        email_hash = hashlib.md5(email).hexdigest()
        return f"https://www.gravatar.com/avatar/{email_hash}?d=identicon&s=200"


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
    tenant_slug = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'password', 'password2', 'tenant', 'tenant_slug')
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False},
            'tenant': {'required': False, 'read_only': True},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        
        validate_email_domain(attrs['email'])
        # Check if email already exists
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({"email": "This email is already registered."})
        
        # Check if username already exists
        if User.objects.filter(username=attrs['username']).exists():
            raise serializers.ValidationError({"username": "This username is already taken."})
            
        # Validate tenant_slug
        if 'tenant_slug' in attrs:
            from tenants.models import Tenant
            try:
                tenant = Tenant.objects.get(slug=attrs['tenant_slug'])
                attrs['tenant'] = tenant
            except Tenant.DoesNotExist:
                raise serializers.ValidationError({"tenant_slug": "Tenant with this slug does not exist."})
            del attrs['tenant_slug']
        
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        # user = User.objects.create_user(**validated_data) # usage of create_user might not handle foreign key object directly if not simple field? 
        # Actually create_user should handle it if passed as kwarg 'tenant=tenant_obj'
        user = User.objects.create_user(**validated_data)
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer that includes user info in response.
    """
    def get_token(self, user):
        token = super().get_token(user)
        # Add custom claims
        token['is_platform_admin'] = user.is_platform_admin
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Add user info to response
        data['user'] = UserSerializer(self.user, context=self.context).data
        
        request = self.context.get('request')
        
        # If the request indicates it's for the admin portal, restrict to platform admins and superusers on public schema
        if request and request.data.get('portal') == 'admin':
            from django.db import connection
            if connection.schema_name != 'public':
                raise ValidationError("Admin portal access is only allowed through the public domain.")
                
            if not (self.user.is_platform_admin or self.user.is_superuser):
                raise ValidationError("Only administrators or superusers can log in to the admin portal.")
        elif request and request.data.get('portal') == 'company':
            if not self.user.tenant:
                raise ValidationError("User does not belong to any tenant.")
            # Optional: If your architecture supports subdomains, verify tenant matches request here
            # For now, we just ensure they HAVE a tenant.
                
        return data




# roletable serlizer

class RoleSerializer(serializers.ModelSerializer):

    class Meta:
        model = RoleTable
        fields = '__all__'


class UserLevelHistorySerializer(serializers.ModelSerializer):
    created_by_email = serializers.ReadOnlyField(source='created_by.email')

    class Meta:
        model = UserLevelHistory
        fields = ['id', 'seniority', 'effective_from', 'created_by_email', 'created_at']


class ResourceAllocationSerializer(serializers.ModelSerializer):
    developer_email = serializers.ReadOnlyField(source='developer.email')
    developer_name = serializers.ReadOnlyField(source='developer.get_full_name')
    project_name = serializers.ReadOnlyField(source='project.name')
    project_key = serializers.ReadOnlyField(source='project.key')

    class Meta:
        from .models import ResourceAllocation
        model = ResourceAllocation
        fields = [
            'id', 'developer', 'developer_email', 'developer_name',
            'project', 'project_name', 'project_key',
            'month', 'year', 'percentage_allocated', 'status',
            'created_at', 'updated_at'
        ]


class MonthlyAllocationStatusSerializer(serializers.ModelSerializer):
    published_by_email = serializers.ReadOnlyField(source='published_by.email')

    class Meta:
        from .models import MonthlyAllocationStatus
        model = MonthlyAllocationStatus
        fields = [
            'id', 'month', 'year', 'status',
            'published_at', 'published_by', 'published_by_email',
            'created_at', 'updated_at'
        ]