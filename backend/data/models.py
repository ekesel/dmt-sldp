from django.db import models
from django.conf import settings

class Integration(models.Model):
    SOURCE_TYPES = (
        ('jira', 'Jira'),
        ('clickup', 'ClickUp'),
        ('azure_boards', 'Azure Boards'),
        ('github', 'GitHub'),
        ('azure_devops', 'Azure DevOps'),
    )
    
    name = models.CharField(max_length=100)
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES)
    base_url = models.URLField()
    api_key = models.CharField(max_length=255, help_text="Encrypted or stored safely in production")
    workspace_id = models.CharField(max_length=100, blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    last_sync_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.source_type})"

class Sprint(models.Model):
    external_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    status = models.CharField(max_length=50, default='active')
    
    def __str__(self):
        return self.name

class WorkItem(models.Model):
    external_id = models.CharField(max_length=100, unique=True)
    integration = models.ForeignKey(Integration, on_delete=models.CASCADE, related_name='work_items')
    sprint = models.ForeignKey(Sprint, on_delete=models.SET_NULL, null=True, blank=True, related_name='work_items')
    
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    type = models.CharField(max_length=50) # bug, story, task
    status = models.CharField(max_length=50)
    priority = models.CharField(max_length=50, blank=True, null=True)
    
    creator_email = models.EmailField(blank=True, null=True)
    assignee_email = models.EmailField(blank=True, null=True)
    
    # DMT Specific fields
    is_compliant = models.BooleanField(default=False)
    compliance_reason = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"[{self.external_id}] {self.title}"

class PullRequest(models.Model):
    external_id = models.CharField(max_length=100, unique=True)
    integration = models.ForeignKey(Integration, on_delete=models.CASCADE, related_name='pull_requests')
    work_item = models.ForeignKey(WorkItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='pull_requests')
    
    title = models.CharField(max_length=500)
    author_email = models.EmailField()
    status = models.CharField(max_length=50) # open, merged, closed
    
    repository_name = models.CharField(max_length=255)
    source_branch = models.CharField(max_length=255)
    target_branch = models.CharField(max_length=255)
    
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    merged_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"PR #{self.external_id}: {self.title}"
