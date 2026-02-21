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


class Sprint(SoftDeleteMixin, models.Model):
    external_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # multiple sprints can be 'active' simultaneously
    status = models.CharField(max_length=50, default='active', db_index=True)
    
    def __str__(self):
        return self.name

class WorkItem(SoftDeleteMixin, models.Model):
    ITEM_TYPES = [
        ('story', 'Story'),
        ('bug', 'Bug'),
        ('task', 'Task'),
        ('epic', 'Epic'),
    ]
    
    # Source tracking
    external_id = models.CharField(max_length=100) # Original ID from PM tool
    source_config_id = models.IntegerField(db_index=True) # ID of SourceConfiguration in public schema
    source_url = models.URLField(blank=True, null=True)
    
    # Core fields
    sprint = models.ForeignKey(Sprint, on_delete=models.SET_NULL, null=True, blank=True, related_name='work_items')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subtasks')
    item_type = models.CharField(max_length=20, choices=ITEM_TYPES, default='task')
    title = models.TextField()
    description = models.TextField(blank=True, null=True)
    priority = models.CharField(max_length=50, blank=True, null=True)
    story_points = models.FloatField(null=True, blank=True)
    ai_usage_percent = models.FloatField(null=True, blank=True)
    
    # Status tracking
    status = models.CharField(max_length=50)
    status_category = models.CharField(max_length=20, choices=[
        ('todo', 'To Do'),
        ('in_progress', 'In Progress'),
        ('done', 'Done'),
    ], default='todo')
    
    # Timestamps
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    started_at = models.DateTimeField(null=True, blank=True) # First In Progress
    resolved_at = models.DateTimeField(null=True, blank=True) # Done At
    
    # Assignment
    creator_email = models.EmailField(blank=True, null=True)
    assignee_email = models.EmailField(blank=True, null=True)
    assignee_name = models.CharField(max_length=255, blank=True, null=True)
    resolved_assignee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, null=True, blank=True, related_name='work_items')
    
    # DMT Quality Fields (normalized from source)
    ac_quality = models.CharField(max_length=20, blank=True, choices=[
        ('incomplete', 'Incomplete'),
        ('testable', 'Testable'),
        ('final', 'Final'),
    ])
    unit_test_task_present = models.BooleanField(null=True, blank=True)
    unit_testing_status = models.CharField(max_length=30, blank=True, choices=[
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('done', 'Done'),
        ('exception_approved', 'Exception Approved'),
    ])
    coverage_percent = models.FloatField(null=True, blank=True)
    pr_links = models.JSONField(default=list, blank=True)  # List of PR URLs
    ci_evidence_links = models.JSONField(default=list, blank=True)
    reviewer_dmt_signoff = models.BooleanField(null=True, blank=True)
    dmt_exception_required = models.BooleanField(default=False)
    dmt_exception_reason = models.TextField(blank=True)
    exception_approver = models.CharField(max_length=255, blank=True)
    
    # Blocked tracking
    is_blocked = models.BooleanField(default=False)
    blocked_reason = models.TextField(blank=True)
    blocked_at = models.DateTimeField(null=True, blank=True)
    blocked_days_total = models.IntegerField(default=0)
    
    # Raw data for auditing/debugging
    raw_source_data = models.JSONField(default=dict, blank=True)
    
    # Compliance calculation (denormalized)
    dmt_compliant = models.BooleanField(null=True, blank=True)
    compliance_failures = models.JSONField(default=list, blank=True) # ['missing_pr_link', 'low_coverage']
    
    created_in_system_at = models.DateTimeField(auto_now_add=True)
    updated_in_system_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'data_workitem'
        unique_together = ('source_config_id', 'external_id')
        indexes = [
            models.Index(fields=['dmt_compliant', 'status_category']),
            models.Index(fields=['source_config_id', 'external_id']),
        ]

    def __str__(self):
        return f"[{self.external_id}] {self.title[:50]}"

class PullRequest(models.Model):
    external_id = models.CharField(max_length=100, unique=True)
    source_config_id = models.IntegerField(db_index=True)
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
    source_config_id = models.IntegerField(db_index=True)
    summary = models.TextField()
    suggestions = models.JSONField()  # List of {title, impact, description}
    forecast = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"AI Insight for Config #{self.source_config_id} at {self.created_at}"


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

class SprintMetrics(models.Model):
    """
    Pre-calculated sprint metrics for fast dashboard loading.
    Updated by ETL after each sprint close or nightly sync.
    """
    sprint_name = models.CharField(max_length=100)
    sprint_start_date = models.DateField()
    sprint_end_date = models.DateField()
    
    # Velocity
    total_story_points_committed = models.FloatField(default=0)
    total_story_points_completed = models.FloatField(default=0)
    velocity = models.FloatField(default=0)
    
    # Throughput
    items_completed = models.IntegerField(default=0)
    stories_completed = models.IntegerField(default=0)
    bugs_completed = models.IntegerField(default=0)
    
    # Quality
    defects_found_post_release = models.IntegerField(default=0)
    defect_density_per_100_points = models.FloatField(default=0)
    
    # DMT Compliance
    total_items = models.IntegerField(default=0)
    compliant_items = models.IntegerField(default=0)
    compliance_rate_percent = models.FloatField(default=0)
    
    # Timing
    avg_cycle_time_days = models.FloatField(null=True, blank=True)
    avg_lead_time_days = models.FloatField(null=True, blank=True)
    
    # Blocked time
    total_blocked_days = models.IntegerField(default=0)
    avg_blocked_days_per_item = models.FloatField(default=0)
    
    # PR Metrics
    total_prs_merged = models.IntegerField(default=0)
    avg_time_to_first_review_hours = models.FloatField(null=True, blank=True)
    prs_with_reviews_percent = models.FloatField(default=0)
    
    calculated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'data_sprintmetrics'
        unique_together = ['sprint_name', 'sprint_end_date']
        indexes = [
            models.Index(fields=['sprint_end_date']),
        ]

    def __str__(self):
        return f"Metrics for {self.sprint_name}"

class DeveloperMetrics(models.Model):
    """
    Individual developer metrics (denormalized).
    """
    developer_source_id = models.CharField(max_length=100)
    developer_email = models.EmailField()
    developer_name = models.CharField(max_length=255)
    
    sprint_name = models.CharField(max_length=100)
    sprint_end_date = models.DateField()
    
    # Work items
    story_points_completed = models.FloatField(default=0)
    items_completed = models.IntegerField(default=0)
    
    # Code activity
    commits_count = models.IntegerField(default=0)
    prs_authored = models.IntegerField(default=0)
    prs_merged = models.IntegerField(default=0)
    
    # Review activity
    prs_reviewed = models.IntegerField(default=0)
    avg_review_time_hours = models.FloatField(null=True, blank=True)
    
    # Quality
    defects_attributed = models.IntegerField(default=0)
    coverage_avg_percent = models.FloatField(null=True, blank=True)
    
    # DMT
    dmt_compliance_rate = models.FloatField(default=0)
    
    calculated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'data_developermetrics'
        unique_together = ['developer_source_id', 'sprint_name', 'sprint_end_date']
        indexes = [
            models.Index(fields=['developer_source_id', 'sprint_end_date']),
        ]

    def __str__(self):
        return f"{self.developer_name} - {self.sprint_name}"


