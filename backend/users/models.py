from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    # Added common fields here
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, null=True, blank=True)
    is_platform_admin = models.BooleanField(default=False)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    custom_title = models.CharField(max_length=100, null=True, blank=True)

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
