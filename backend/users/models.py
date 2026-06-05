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



class RoleTable(models.Model):

    class DepartmentChoices(models.TextChoices):
        BACKEND   = 'backend',   'Backend'
        FRONTEND  = 'frontend',  'Frontend'
        MOBILE    = 'mobile',    'Mobile'
        DEVOPS    = 'devops',    'DevOps'
        QA        = 'qa',        'QA / Testing'
        DATA      = 'data',      'Data & Analytics'
        DESIGN    = 'design',    'Design / UX'
        PRODUCT   = 'product',   'Product'
        HR        = 'hr',        'HR'
        FINANCE   = 'finance',   'Finance'
        SALES     = 'sales',     'Sales'
        MARKETING = 'marketing', 'Marketing'
        OTHER     = 'other',     'Other'
        AIML      = 'aiml',      'AI & ML'

    role_name = models.CharField(max_length=50)   # ceo, cto, backend tl …
    dep_name  = models.CharField(
        max_length=20,
        choices=DepartmentChoices.choices,
        default=DepartmentChoices.OTHER,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

