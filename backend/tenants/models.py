from django.db import models
from django.utils.text import slugify
from django_tenants.models import TenantMixin, DomainMixin


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