from django.db import models
from django.utils.text import slugify
from django_tenants.models import TenantMixin, DomainMixin
from django.conf import settings


class Tenant(TenantMixin):
    STATUS_ACTIVE = 'active'
    STATUS_INACTIVE = 'inactive'
    STATUS_PENDING = 'pending'

    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_INACTIVE, 'Inactive'),
        (STATUS_PENDING, 'Pending'),
    ]

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, null=True, blank=True, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
        db_index=True,
    )
    created_on = models.DateField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Data Retention Settings (Months)
    retention_work_items = models.IntegerField(default=12)
    retention_ai_insights = models.IntegerField(default=6)
    retention_pull_requests = models.IntegerField(default=12)

    # default true, schema will be automatically created and synced when it is saved
    auto_create_schema = True

    def save(self, *args, **kwargs):
        # keep slug aligned and unique; fallback to schema_name
        if not self.slug:
            base = slugify(self.name) or slugify(self.schema_name) or f"tenant-{self.schema_name}"
            candidate = base
            i = 1
            while Tenant.objects.exclude(pk=self.pk).filter(slug=candidate).exists():
                i += 1
                candidate = f"{base}-{i}"
            self.slug = candidate

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Domain(DomainMixin):
    pass


class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('test_connection', 'Test Connection'),
        ('trigger_sync', 'Trigger Sync'),
        ('archive_data', 'Archive Data'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    entity_type = models.CharField(max_length=50)
    entity_id = models.IntegerField(db_index=True)
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']


class SystemSetting(models.Model):
    name = models.CharField(max_length=100, unique=True)
    value = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name