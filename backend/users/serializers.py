from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework.exceptions import ValidationError

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    tenant_name = serializers.ReadOnlyField(source='tenant.name')
    tenant_slug = serializers.ReadOnlyField(source='tenant.slug')

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'tenant', 'tenant_name', 'tenant_slug', 'is_platform_admin', 'is_staff', 'is_superuser', 'is_active', 'date_joined']
        read_only_fields = ['id']


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
        data['user'] = UserSerializer(self.user).data
        
        request = self.context.get('request')
        
        # If the request indicates it's for the admin portal, restrict to platform admins and staff
        if request and request.data.get('portal') == 'admin':
            if not (self.user.is_platform_admin or self.user.is_staff):
                raise ValidationError("Only administrators or staff can log in to the admin portal.")
        elif request and request.data.get('portal') == 'company':
            if not self.user.tenant:
                raise ValidationError("User does not belong to any tenant.")
            # Optional: If your architecture supports subdomains, verify tenant matches request here
            # For now, we just ensure they HAVE a tenant.
                
        return data
