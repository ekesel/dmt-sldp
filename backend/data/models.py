from django.db import models
from django.conf import settings
from django.utils import timezone

class SoftDeleteMixin(models.Model):
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        self.deleted_at = timezone.now()
        self.save()

    def hard_delete(self):
        super().delete()

class Integration(SoftDeleteMixin, models.Model):
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
    credentials = models.JSONField(default=dict, blank=True)
    
    is_active = models.BooleanField(default=True)
    last_sync_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.source_type})"

class Sprint(SoftDeleteMixin, models.Model):
    external_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    status = models.CharField(max_length=50, default='active')
    
    def __str__(self):
        return self.name

class WorkItem(SoftDeleteMixin, models.Model):
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
    resolved_assignee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, null=True, blank=True, related_name='work_items')
    
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
    resolved_author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, null=True, blank=True, related_name='pull_requests')
    status = models.CharField(max_length=50) # open, merged, closed
    
    repository_name = models.CharField(max_length=255)
    source_branch = models.CharField(max_length=255)
    target_branch = models.CharField(max_length=255)
    
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    merged_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"PR #{self.external_id}: {self.title}"

class PullRequestStatus(models.Model):
    pull_request = models.ForeignKey(PullRequest, on_delete=models.CASCADE, related_name='statuses')
    name = models.CharField(max_length=255) # e.g., "build", "lint", "test"
    state = models.CharField(max_length=50) # e.g., "success", "failure", "pending"
    target_url = models.URLField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.pull_request} - {self.name}: {self.state}"

class AIInsight(models.Model):
    integration = models.ForeignKey(Integration, on_delete=models.CASCADE, related_name='ai_insights')
    summary = models.TextField()
    suggestions = models.JSONField()  # List of {title, impact, description}
    forecast = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"AI Insight for {self.integration} at {self.created_at}"


class TaskLog(models.Model):
    TASK_STATUS = (
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    )
    
    task_name = models.CharField(max_length=255)
    target_id = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=20, choices=TASK_STATUS, default='pending')
    error_message = models.TextField(null=True, blank=True)
    execution_time_ms = models.IntegerField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.task_name} - {self.status} ({self.created_at})"

class DailyMetric(models.Model):
    date = models.DateField(db_index=True)
    total_work_items = models.IntegerField(default=0)
    compliant_work_items = models.IntegerField(default=0)
    compliance_rate = models.FloatField(default=0.0)
    avg_cycle_time_hours = models.FloatField(default=0.0)
    prs_merged_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('date',)
        ordering = ['-date']

    def __str__(self):
        return f"Metrics for {self.date}"

class HistoricalSprintMetric(models.Model):
    sprint = models.OneToOneField(Sprint, on_delete=models.CASCADE, related_name='metrics')
    velocity = models.IntegerField(default=0)
    final_compliance_rate = models.FloatField(default=0.0)
    ai_efficiency_score = models.FloatField(default=0.0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Metrics for Sprint: {self.sprint.name}"

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('compliance_failure', 'Compliance Failure'),
        ('etl_failure', 'ETL Failure'),
        ('sprint_ending', 'Sprint Ending Soon'),
        ('exception_approved', 'DMT Exception Approved'),
        ('ai_insight', 'AI Insight'),
    ]
    
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING)
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    data = models.JSONField(default=dict)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
