from django.db import models
from django.conf import settings

class Project(models.Model):
    """
    Project belongs to a tenant. Stored in public schema for cross-reference,
    but all data lives in tenant schema.
    """
    tenant = models.ForeignKey(settings.TENANT_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    key = models.CharField(max_length=50)  # Project key/slug
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # DMT Configuration (defaults, can override)
    default_coverage_threshold = models.FloatField(default=80.0)
    
    class Meta:
        db_table = 'projects'

    def __str__(self):
        return f"{self.name} ({self.key})"

class SourceConfiguration(models.Model):
    """
    Configurable data sources per project. Generic design for extensibility.
    Formerly 'Integration' in data app.
    """
    SOURCE_TYPES = [
        ('jira', 'Jira'),
        ('clickup', 'ClickUp'),
        ('azure_boards', 'Azure Boards'),
        ('github', 'GitHub'),
        ('azure_devops_git', 'Azure DevOps Git'),
        ('azure_devops', 'Azure DevOps'), # Backwards compatibility
    ]
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='sources')
    source_type = models.CharField(max_length=30, choices=SOURCE_TYPES)
    name = models.CharField(max_length=100)  # Human-readable label
    
    # Connection details (encrypted)
    base_url = models.URLField()
    api_token_encrypted = models.BinaryField(null=True, blank=True, editable=True)
    # Temporary plaintext field for migration ease, should be removed later
    api_key = models.CharField(max_length=255, blank=True, null=True, help_text="Encrypted or stored safely in production")
    
    username = models.CharField(max_length=100, blank=True)  # For basic auth if needed
    workspace_id = models.CharField(max_length=100, blank=True, null=True)

    # Source-specific configuration (JSON)
    config_json = models.JSONField(default=dict, help_text="Source specific config like board_id etc")
    
    # Field mappings (auto-discovered, admin can override)
    field_mappings = models.JSONField(default=dict)
    
    # ETL Configuration
    is_active = models.BooleanField(default=True)
    last_sync_at = models.DateTimeField(null=True, blank=True)
    last_sync_status = models.CharField(max_length=20, choices=[
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('in_progress', 'In Progress'),
        ('never', 'Never')
    ], default='never')
    last_error_message = models.TextField(blank=True)
    consecutive_failures = models.IntegerField(default=0)
    failure_alert_threshold = models.IntegerField(default=3)  # N failures before alert
    
    # Historical import config
    historical_import_days = models.IntegerField(default=30)
    historical_import_completed = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'source_configurations'

    def __str__(self):
        return f"{self.name} ({self.source_type})"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_config_json = dict(self.config_json) if self.config_json else {}

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # Check if active_folder_id changed
        old_folder = self._original_config_json.get('active_folder_id')
        new_folder = (self.config_json or {}).get('active_folder_id')
        
        if not is_new and old_folder != new_folder:
            # Trigger a background sync and metric recalculation 
            # (imported locally to avoid circular imports)
            try:
                from configuration.tasks import perform_sync_task
                perform_sync_task.delay(self.id)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to trigger sync on folder change: {e}")
                
        # Update original state for next save
        self._original_config_json = dict(self.config_json) if self.config_json else {}
