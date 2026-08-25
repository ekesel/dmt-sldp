from django.contrib.auth.models import AbstractUser
from django.db import models


def get_user_media_upload_path(instance, filename):
    from django.db import connection
    from django.utils.text import get_valid_filename
    filename = get_valid_filename(filename)
    return f'{connection.schema_name}/profile_pics/{filename}'

class User(AbstractUser):
    # Added common fields here
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, null=True, blank=True)
    is_platform_admin = models.BooleanField(default=False)
    is_manager = models.BooleanField(default=False)
    profile_picture = models.ImageField(upload_to=get_user_media_upload_path, null=True, blank=True)
    custom_title = models.CharField(max_length=100, null=True, blank=True)
    competitive_title = models.CharField(max_length=100, null=True, blank=True)
    competitive_title_reason = models.TextField(null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    date_of_join = models.DateField(null=True, blank=True)
    role = models.ForeignKey('RoleTable', on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    parent = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    org_chart_visibility = models.BooleanField(default=False) 
    
    

class ExternalIdentity(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='external_identities')
    provider = models.CharField(max_length=20) # e.g., 'github', 'jira'
    external_id = models.CharField(max_length=255) # Email or Username
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('provider', 'external_id')

    def __str__(self):
        return f"{self.user.username} - {self.provider}: {self.external_id}"



class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class CustomPermission(models.Model):
    permission_code = models.CharField(max_length=100, unique=True)  # e.g., "UPLOAD_DOCUMENTS"
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'custom_permissions'

    def __str__(self):
        return f"{self.name} ({self.permission_code})"


class RoleTable(models.Model):
    role_name = models.CharField(max_length=50) 
    role_code = models.CharField(max_length=50, unique=True, null=True, blank=True)
    role_category = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Role Category e.g. DEVELOPER, QA, DESIGNER, DEVOPS, etc."
    )
    dep_name  = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )
    permissions = models.ManyToManyField(
        CustomPermission,
        blank=True,
        related_name='roles',
        db_table='role_permissions_mapping'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.role_code and self.role_name:
            self.role_code = self.role_name.upper().replace(' ', '_')
        if not self.role_category:
            name_code = f"{self.role_name} {self.role_code or ''}".lower()
            if 'qa' in name_code or 'test' in name_code:
                self.role_category = 'QA'
            elif any(k in name_code for k in ['dev', 'eng', 'software', 'backend', 'frontend', 'fullstack', 'python', 'java', 'react']):
                self.role_category = 'DEVELOPER'
        super().save(*args, **kwargs)




class MonthlyAllocationStatus(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PUBLISHED', 'Published'),
    ]
    month = models.IntegerField()
    year = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    published_at = models.DateTimeField(null=True, blank=True)
    published_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='published_allocations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'monthly_allocation_statuses'
        unique_together = ('month', 'year')
        indexes = [
            models.Index(fields=['year', 'month', 'status']),
        ]

    def __str__(self):
        return f"{self.year}-{self.month:02d}: {self.status}"


class ResourceAllocation(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PUBLISHED', 'Published'),
    ]
    developer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='resource_allocations')
    project = models.ForeignKey('configuration.Project', on_delete=models.CASCADE, related_name='resource_allocations')
    month = models.IntegerField()
    year = models.IntegerField()
    percentage_allocated = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'resource_allocations'
        unique_together = ('developer', 'project', 'month', 'year')
        indexes = [
            models.Index(fields=['developer', 'year', 'month', 'status']),
            models.Index(fields=['year', 'month', 'status']),
        ]

    def __str__(self):
        return f"{self.developer.email} -> {self.project.name} ({self.year}-{self.month:02d}): {self.percentage_allocated}% [{self.status}]"




