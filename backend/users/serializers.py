from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework.exceptions import ValidationError
from rest_framework import serializers
from .models import RoleTable
from .models import CustomPermission
import hashlib

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    tenant_name = serializers.ReadOnlyField(source='tenant.name')
    tenant_slug = serializers.ReadOnlyField(source='tenant.slug')
    role_name = serializers.ReadOnlyField(source='role.role_name')
    avatar_url = serializers.SerializerMethodField()
    permission = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'tenant', 'tenant_name', 'tenant_slug', 'is_platform_admin', 
            'is_staff', 'is_superuser', 'is_manager', 'is_active', 'date_of_join',
            'role', 'role_name',
            'profile_picture', 'custom_title', 'competitive_title', 
            'competitive_title_reason', 'avatar_url', 'permission'
        ]
        read_only_fields = ['id', 'avatar_url']

    def validate_email(self, value):
        if not value:
            return value
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