from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    # Added common fields here
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, null=True, blank=True)
    is_platform_admin = models.BooleanField(default=False)
