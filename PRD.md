# PRD.md: DMT-SLDP Unified Platform

## 1. Executive Summary

### 1.1 Product Vision
A multi-tenant SaaS platform that unifies the **Done Means Tested (DMT)** quality enforcement process with the **SLDP Productivity Measurement Framework**, providing real-time compliance monitoring, deep agile analytics, and AI-powered insights across heterogeneous project management tools and code registries.

### 1.2 Target Users
| User Type | Portal | Primary Actions |
|-----------|--------|-----------------|
| **Platform Admin** | admin.company.com | Manage tenants, configure global settings, monitor system health, trigger data retention |
| **Company Users** | app.company.com | View project dashboards, individual/team metrics, compliance flags, export reports, receive notifications |

### 1.3 Core Value Propositions
1. **Quality Gates**: Enforce DMT compliance through automated data validation (not workflow blocking)
2. **Unified Visibility**: Normalize Jira/ClickUp/Azure Boards + Azure DevOps/GitHub into single analytics layer
3. **Predictive Intelligence**: Statistical forecasting + AI suggestions for team optimization
4. **Zero-Config Scaling**: UI-driven source configuration with auto-discovery, no code changes for new projects

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────────┐    ┌─────────────────────────────────────────┐  │
│  │   Admin Portal          │    │   Company Portal (app.company.com)      │  │
│  │   (admin.company.com)   │    │   • Dashboards                          │  │
│  │   • Tenant Management   │    │   • Individual/Team Metrics             │  │
│  │   • Source Configuration│    │   • Compliance Flags                    │  │
│  │   • System Health       │    │   • AI Insights                         │  │
│  │   • Data Retention      │    │   • Notifications                       │  │
│  └───────────┬─────────────┘    └───────────────────┬─────────────────────┘  │
│              │                                      │                        │
│              └──────────────────┬───────────────────┘                        │
│                                 │                                            │
│                                 ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         DJANGO BACKEND API                               │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │ │
│  │  │   Public    │  │  Company    │  │  Company    │  │     Company     │ │ │
│  │  │   Schema    │  │   Schema A  │  │   Schema B  │  │     Schema C    │ │ │
│  │  │  (tenants,  │  │  (work_item,│  │  (work_item,│  │   (work_item,   │ │ │
│  │  │   users,    │  │   pr_data,  │  │   pr_data,  │  │    pr_data,     │ │
│  │  │   audit_log)│  │   metrics)  │  │   metrics)  │  │    metrics)     │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │ │
│  │                                                                          │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                    CELERY WORKERS (ETL + AI)                         │ │ │
│  │  │  • Nightly ETL extraction per source                                 │ │ │
│  │  │  • Historical backfill jobs                                          │ │ │
│  │  │  • AI prediction generation                                          │ │ │
│  │  │  • Data retention archival                                           │ │ │
│  │  └─────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                          │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                    DJANGO CHANNELS (WebSocket)                       │ │ │
│  │  │  • Real-time dashboard updates                                       │ │ │
│  │  │  • ETL progress streaming                                            │ │ │
│  │  │  • Notification broadcasting                                         │ │ │
│  │  └─────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                 │                                            │
│                                 ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         DATA LAYER                                       │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │ │
│  │  │  PostgreSQL │  │    Redis    │  │  (Optional) │  │   File Store    │ │ │
│  │  │  (Multi-    │  │  (Cache +   │  │  S3/MinIO   │  │  (Exports,      │ │ │
│  │  │   tenant)   │  │   Queue)    │  │  (Backups)  │  │   Archives)     │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                 │                                            │
│                                 ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      EXTERNAL INTEGRATIONS                               │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────┐   │ │
│  │  │   Jira   │ │ ClickUp  │ │Azure Boards  │ │Azure Dev │ │  GitHub  │   │ │
│  │  │   API    │ │   API    │ │    API       │ │  Ops Git │ │   API    │   │ │
│  │  └──────────┘ └──────────┘ └──────────────┘ └──────────┘ └──────────┘   │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                    AI PROVIDER (OpenAI/Configurable)                 │ │ │
│  │  └─────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend API** | Django 5.x + Django REST Framework 3.14 | Core business logic, multi-tenant ORM |
| **Async Tasks** | Celery 5.x + Redis | ETL pipelines, AI jobs, notifications |
| **Real-time** | Django Channels 4.x + Daphne | WebSocket for live updates |
| **Database** | PostgreSQL 15+ | Multi-tenant schema isolation |
| **Cache/Queue** | Redis 7+ | Celery broker, result backend, caching |
| **Frontend (Admin)** | Next.js 14 (App Router), TypeScript, Tailwind CSS | Tenant/Source management |
| **Frontend (Company)** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts | Dashboards, analytics |
| **AI/ML** | OpenAI API (configurable) | Predictions, suggestions |
| **Containerization** | Docker + Docker Compose | Local development, deployment |
| **Web Server** | Nginx (reverse proxy) | SSL termination, static files |

### 2.3 Design Patterns

| Pattern | Application |
|---------|-------------|
| **Repository Pattern** | Data access layer abstracting multi-tenant schema switching |
| **Strategy Pattern** | Source connectors (Jira/ClickUp/Azure) implement common interface |
| **Factory Pattern** | Connector instantiation based on source_type configuration |
| **Observer Pattern** | Django signals for audit logging, notification triggers |
| **CQRS (lightweight)** | Separate read models for dashboards vs. write models for ETL |
| **Circuit Breaker** | ETL jobs fail fast after N consecutive failures per source |

---

## 3. Database Schema

### 3.1 Public Schema (Admin/Tenant Management)

```python
# models.py - Public Schema

class Tenant(models.Model):
    """
    Company/Organization entity. Each tenant gets dedicated PostgreSQL schema.
    """
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)  # Used for schema naming: slug.work_item
    domain = models.CharField(max_length=255, blank=True)  # Custom domain if any
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)  # Soft delete
    
    # Configuration
    data_retention_days = models.IntegerField(default=90)  # Before archival
    archive_storage_path = models.CharField(max_length=500, blank=True)
    
    # AI Configuration
    ai_provider = models.CharField(max_length=50, default='openai')  # openai/azure/etc
    ai_api_key_encrypted = models.BinaryField(null=True, blank=True)  # Encrypted
    ai_model = models.CharField(max_length=50, default='gpt-4')
    
    class Meta:
        db_table = 'public.tenants'
    
    def get_schema_name(self):
        return self.slug

class User(AbstractBaseUser):
    """
    Global user model. Users belong to one tenant (company) exclusively.
    Role determines which portal they access.
    """
    ROLE_CHOICES = [
        ('platform_admin', 'Platform Admin'),  # Access to admin.company.com
        ('company_user', 'Company User'),       # Access to app.company.com
    ]
    
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    
    # Company user specific
    projects = models.ManyToManyField('Project', through='UserProjectRole', blank=True)
    
    class Meta:
        db_table = 'public.users'

class UserProjectRole(models.Model):
    """
    Many-to-many with role specification for company users.
    """
    ROLE_CHOICES = [
        ('viewer', 'Viewer'),
        ('developer', 'Developer'),
        ('tech_lead', 'Tech Lead'),
        ('project_manager', 'Project Manager'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    project = models.ForeignKey('Project', on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'public.user_project_roles'
        unique_together = ['user', 'project']

class Project(models.Model):
    """
    Project belongs to a tenant. Stored in public schema for cross-reference,
    but all data lives in tenant schema.
    """
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    key = models.CharField(max_length=50)  # Project key/slug
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # DMT Configuration (defaults, can override)
    default_coverage_threshold = models.FloatField(default=80.0)
    
    class Meta:
        db_table = 'public.projects'

class SourceConfiguration(models.Model):
    """
    Configurable data sources per project. Generic design for extensibility.
    """
    SOURCE_TYPES = [
        ('jira', 'Jira'),
        ('clickup', 'ClickUp'),
        ('azure_boards', 'Azure Boards'),
        ('github', 'GitHub'),
        ('azure_devops_git', 'Azure DevOps Git'),
    ]
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='sources')
    source_type = models.CharField(max_length=30, choices=SOURCE_TYPES)
    name = models.CharField(max_length=100)  # Human-readable label
    
    # Connection details (encrypted)
    base_url = models.URLField()
    api_token_encrypted = models.BinaryField()
    username = models.CharField(max_length=100, blank=True)  # For basic auth if needed
    
    # Source-specific configuration (JSON)
    config_json = models.JSONField(default=dict, help_text="""
    {
        'board_id': '123',
        'project_key': 'PROJ',
        'repository_names': ['repo1', 'repo2'],
        'custom_field_mappings': {
            'story_points': 'customfield_10016',
            'ac_quality': 'customfield_10021',
            'unit_testing_status': 'customfield_10022'
        }
    }
    """)
    
    # Field mappings (auto-discovered, admin can override)
    field_mappings = models.JSONField(default=dict, help_text="""
    {
        'story_points': {'source_field': 'customfield_10016', 'type': 'number'},
        'ac_quality': {'source_field': 'customfield_10021', 'type': 'select', 'options': [...]},
        'sprint': {'source_field': 'customfield_10020', 'type': 'sprint'}
    }
    """)
    
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
        db_table = 'public.source_configurations'

class AuditLog(models.Model):
    """
    Immutable audit trail for all configuration changes.
    """
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('test_connection', 'Test Connection'),
        ('trigger_sync', 'Trigger Sync'),
        ('archive_data', 'Archive Data'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    entity_type = models.CharField(max_length=50)  # 'SourceConfiguration', 'Project', etc.
    entity_id = models.IntegerField()
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'public.audit_logs'
        indexes = [
            models.Index(fields=['tenant', 'timestamp']),
            models.Index(fields=['entity_type', 'entity_id']),
        ]

class Notification(models.Model):
    """
    In-app notifications for company users.
    """
    NOTIFICATION_TYPES = [
        ('compliance_failure', 'Compliance Failure'),
        ('etl_failure', 'ETL Failure'),
        ('sprint_ending', 'Sprint Ending Soon'),
        ('exception_approved', 'DMT Exception Approved'),
        ('ai_insight', 'AI Insight'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    data = models.JSONField(default=dict)  # Link to relevant entity
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'public.notifications'
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
        ]

class DataRetentionJob(models.Model):
    """
    Track data archival and deletion jobs.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('archiving', 'Archiving'),
        ('archived', 'Archived'),
        ('deleting', 'Deleting'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    initiated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    quarter = models.CharField(max_length=10)  # '2024-Q1'
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    archive_path = models.CharField(max_length=500, blank=True)
    records_archived = models.IntegerField(default=0)
    records_deleted = models.IntegerField(default=0)
    
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        db_table = 'public.data_retention_jobs'
```

### 3.2 Tenant Schema (Per-Company Data)

Each tenant gets a schema named by `tenant.slug`. Tables are created via Django migrations using `schema` parameter or `run_sql` with `CREATE SCHEMA IF NOT EXISTS`.

```python
# models.py - Tenant Schema (dynamic)

class WorkItem(models.Model):
    """
    Normalized work item from any PM tool.
    """
    ITEM_TYPES = [
        ('story', 'Story'),
        ('bug', 'Bug'),
        ('task', 'Task'),
        ('epic', 'Epic'),
    ]
    
    # Source tracking
    source_config = models.IntegerField()  # FK to public.SourceConfiguration (stored as ID)
    source_id = models.CharField(max_length=100)  # Original ID from PM tool
    source_url = models.URLField(blank=True)
    
    # Core fields
    item_type = models.CharField(max_length=20, choices=ITEM_TYPES)
    title = models.TextField()
    description = models.TextField(blank=True)
    
    # Story points and estimation
    story_points = models.FloatField(null=True, blank=True)
    original_estimate_hours = models.FloatField(null=True, blank=True)
    
    # Status tracking
    status = models.CharField(max_length=50)
    status_category = models.CharField(max_length=20, choices=[
        ('todo', 'To Do'),
        ('in_progress', 'In Progress'),
        ('done', 'Done'),
    ])
    
    # Sprint/Iteration
    sprint_name = models.CharField(max_length=100, blank=True)
    sprint_start_date = models.DateField(null=True, blank=True)
    sprint_end_date = models.DateField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField()
    started_at = models.DateTimeField(null=True, blank=True)  # First In Progress
    done_at = models.DateTimeField(null=True, blank=True)
    
    # Assignment
    assignee_source_id = models.CharField(max_length=100, blank=True)
    assignee_email = models.EmailField(blank=True)
    assignee_name = models.CharField(max_length=255, blank=True)
    
    # DMT Fields (normalized from source)
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
    pr_links = models.JSONField(default=list)  # List of PR URLs
    ci_evidence_links = models.JSONField(default=list)
    reviewer_dmt_signoff = models.BooleanField(null=True, blank=True)
    dmt_exception_required = models.BooleanField(default=False)
    dmt_exception_reason = models.TextField(blank=True)
    exception_approver = models.CharField(max_length=255, blank=True)
    
    # Blocked tracking
    is_blocked = models.BooleanField(default=False)
    blocked_reason = models.TextField(blank=True)
    blocked_at = models.DateTimeField(null=True, blank=True)
    blocked_days_total = models.IntegerField(default=0)
    
    # Raw data for debugging
    raw_source_data = models.JSONField(default=dict)
    
    # Compliance calculation (denormalized for query performance)
    dmt_compliant = models.BooleanField(null=True, blank=True)
    compliance_failures = models.JSONField(default=list)  # ['missing_pr_link', 'low_coverage']
    
    created_in_system_at = models.DateTimeField(auto_now_add=True)
    updated_in_system_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)  # Soft delete
    
    class Meta:
        indexes = [
            models.Index(fields=['sprint_name', 'sprint_end_date']),
            models.Index(fields=['assignee_source_id', 'done_at']),
            models.Index(fields=['dmt_compliant', 'status_category']),
            models.Index(fields=['source_config', 'source_id'], unique=True),
        ]

class PullRequest(models.Model):
    """
    Code registry data (Azure DevOps Git, GitHub).
    """
    PR_STATUS = [
        ('open', 'Open'),
        ('merged', 'Merged'),
        ('closed', 'Closed'),
    ]
    
    source_config = models.IntegerField()  # FK to public.SourceConfiguration
    
    # PR identification
    pr_number = models.IntegerField()
    repository_name = models.CharField(max_length=255)
    source_id = models.CharField(max_length=100)  # PR ID from source
    
    # Content
    title = models.TextField()
    description = models.TextField(blank=True)
    branch_from = models.CharField(max_length=255)
    branch_to = models.CharField(max_length=255)
    
    # Authorship
    author_source_id = models.CharField(max_length=100)
    author_email = models.EmailField()
    author_name = models.CharField(max_length=255)
    
    # Timing
    created_at = models.DateTimeField()
    first_review_at = models.DateTimeField(null=True, blank=True)
    merged_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    
    # Review metrics
    review_count = models.IntegerField(default=0)
    reviewers = models.JSONField(default=list)  # [{'source_id': '...', 'email': '...', 'name': '...'}]
    comments_count = models.IntegerField(default=0)
    
    # Links to work items (parsed from PR description or API links)
    linked_work_items = models.JSONField(default=list)  # List of WorkItem.source_id
    
    # DMT specific
    has_dmt_signoff = models.BooleanField(default=False)  # Reviewer marked DMT-OK
    dmt_signoff_by = models.CharField(max_length=255, blank=True)
    
    status = models.CharField(max_length=20, choices=PR_STATUS)
    
    raw_source_data = models.JSONField(default=dict)
    created_in_system_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['author_source_id', 'created_at']),
            models.Index(fields=['repository_name', 'status']),
            models.Index(fields=['linked_work_items']),  # GIN index recommended
        ]

class ComplianceFlag(models.Model):
    """
    Real-time compliance violations for dashboard alerting.
    Created/updated by ETL or real-time checks.
    """
    SEVERITY = [
        ('critical', 'Critical'),  # Blocks Done equivalent
        ('warning', 'Warning'),    # Should fix
        ('info', 'Info'),          # FYI
    ]
    
    FLAG_TYPES = [
        ('missing_ac_quality', 'AC Quality Not Set'),
        ('missing_unit_test_task', 'Unit Test Task Missing'),
        ('unit_testing_not_done', 'Unit Testing Not Complete'),
        ('low_coverage', 'Coverage Below Threshold'),
        ('missing_pr_link', 'PR Link Missing'),
        ('missing_ci_evidence', 'CI Evidence Missing'),
        ('missing_dmt_signoff', 'DMT Signoff Missing'),
        ('exception_expiring', 'DMT Exception Expiring Soon'),
    ]
    
    work_item = models.ForeignKey(WorkItem, on_delete=models.CASCADE)
    flag_type = models.CharField(max_length=30, choices=FLAG_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY)
    message = models.TextField()
    
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.CharField(max_length=255, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['work_item', 'is_resolved']),
            models.Index(fields=['flag_type', 'severity', 'created_at']),
        ]

class SprintMetrics(models.Model):
    """
    Pre-calculated sprint metrics for fast dashboard loading.
    Updated by ETL after each sprint close.
    """
    sprint_name = models.CharField(max_length=100)
    sprint_start_date = models.DateField()
    sprint_end_date = models.DateField()
    
    # Velocity
    total_story_points_committed = models.FloatField(default=0)
    total_story_points_completed = models.FloatField(default=0)
    velocity = models.FloatField(default=0)  # Same as completed for this sprint
    
    # Throughput
    items_completed = models.IntegerField(default=0)
    stories_completed = models.IntegerField(default=0)
    bugs_completed = models.IntegerField(default=0)
    
    # Quality
    defects_found_post_release = models.IntegerField(default=0)
    defect_density_per_100_points = models.FloatField(default=0)  # Calculated
    
    # DMT Compliance
    total_items = models.IntegerField(default=0)
    compliant_items = models.IntegerField(default=0)
    compliance_rate_percent = models.FloatField(default=0)
    
    # Timing
    avg_cycle_time_days = models.FloatField(null=True, blank=True)  # Start to Done
    avg_lead_time_days = models.FloatField(null=True, blank=True)  # Create to Done
    
    # Blocked time
    total_blocked_days = models.IntegerField(default=0)
    avg_blocked_days_per_item = models.FloatField(default=0)
    
    # PR Metrics
    total_prs_merged = models.IntegerField(default=0)
    avg_time_to_first_review_hours = models.FloatField(null=True, blank=True)
    prs_with_reviews_percent = models.FloatField(default=0)
    
    calculated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['sprint_name', 'sprint_end_date']
        indexes = [
            models.Index(fields=['sprint_end_date']),
        ]

class DeveloperMetrics(models.Model):
    """
    Individual developer metrics (denormalized for performance).
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
    defects_attributed = models.IntegerField(default=0)  # Defects linked to their stories
    coverage_avg_percent = models.FloatField(null=True, blank=True)
    
    # DMT
    dmt_compliance_rate = models.FloatField(default=0)
    
    calculated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['developer_source_id', 'sprint_name', 'sprint_end_date']
        indexes = [
            models.Index(fields=['developer_source_id', 'sprint_end_date']),
        ]

class AIPrediction(models.Model):
    """
    AI-generated insights and predictions.
    """
    PREDICTION_TYPES = [
        ('velocity_forecast', 'Velocity Forecast'),
        ('developer_risk', 'Developer Risk Assessment'),
        ('team_optimization', 'Team Optimization Suggestion'),
        ('compliance_risk', 'Compliance Risk'),
    ]
    
    prediction_type = models.CharField(max_length=30, choices=PREDICTION_TYPES)
    
    # Scope
    sprint_name = models.CharField(max_length=100, blank=True)  # Optional
    developer_source_id = models.CharField(max_length=100, blank=True)  # Optional
    project_id = models.IntegerField(null=True, blank=True)  # Optional
    
    # Content
    title = models.CharField(max_length=255)
    summary = models.TextField()
    detailed_analysis = models.TextField()
    recommended_actions = models.JSONField(default=list)
    
    # Data snapshot (for reproducibility)
    input_data_summary = models.JSONField(default=dict)
    
    # Feedback
    was_helpful = models.BooleanField(null=True, blank=True)
    feedback_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['prediction_type', 'created_at']),
            models.Index(fields=['sprint_name']),
            models.Index(fields=['developer_source_id']),
        ]
```

---

## 4. API Specification

### 4.1 Authentication Endpoints

| Endpoint | Method | Description | Request | Response |
|----------|--------|-------------|---------|----------|
| `/api/auth/register` | POST | Platform admin registration (first setup) | `{email, password, role: 'platform_admin'}` | `{user, tokens}` |
| `/api/auth/login` | POST | Login for both portals | `{email, password}` | `{user, tokens, portal_url}` |
| `/api/auth/refresh` | POST | Refresh JWT | `{refresh}` | `{access}` |
| `/api/auth/logout` | POST | Logout | `{refresh}` | `204` |
| `/api/auth/me` | GET | Current user info | - | `{id, email, role, tenant}` |

### 4.2 Admin Portal Endpoints

#### Tenant Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/tenants` | GET | List all tenants |
| `/api/admin/tenants` | POST | Create new tenant |
| `/api/admin/tenants/{id}` | GET | Get tenant details |
| `/api/admin/tenants/{id}` | PUT | Update tenant |
| `/api/admin/tenants/{id}/activate` | POST | Activate tenant |
| `/api/admin/tenants/{id}/deactivate` | POST | Deactivate tenant |
| `/api/admin/tenants/{id}/users` | GET | List users in tenant |
| `/api/admin/tenants/{id}/users` | POST | Create company user |

#### Project Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/tenants/{tenant_id}/projects` | GET | List projects |
| `/api/admin/tenants/{tenant_id}/projects` | POST | Create project |
| `/api/admin/projects/{id}` | PUT | Update project |
| `/api/admin/projects/{id}/sources` | GET | List source configs |
| `/api/admin/projects/{id}/sources` | POST | Create source config |
| `/api/admin/sources/{id}` | GET | Get source config |
| `/api/admin/sources/{id}` | PUT | Update source config |
| `/api/admin/sources/{id}/test` | POST | Test connection |
| `/api/admin/sources/{id}/discover` | GET | Auto-discover fields |
| `/api/admin/sources/{id}/trigger-sync` | POST | Trigger manual ETL |
| `/api/admin/sources/{id}/trigger-historical` | POST | Trigger historical import |

#### System Health & Monitoring
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/health` | GET | System health overview |
| `/api/admin/health/etl` | GET | Per-source ETL status |
| `/api/admin/health/queues` | GET | Celery queue depths |
| `/api/admin/audit-logs` | GET | Filterable audit logs |
| `/api/admin/data-retention` | GET | List retention jobs |
| `/api/admin/data-retention` | POST | Create retention job |
| `/api/admin/data-retention/{id}/archive` | POST | Execute archive |
| `/api/admin/data-retention/{id}/delete` | POST | Execute hard delete |

### 4.3 Company Portal Endpoints

#### Dashboards
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/summary` | GET | KPI cards for current sprint |
| `/api/dashboard/velocity` | GET | Velocity trend with forecast |
| `/api/dashboard/throughput` | GET | Throughput analysis |
| `/api/dashboard/defect-density` | GET | Defect density trends |
| `/api/dashboard/compliance` | GET | DMT compliance rate |
| `/api/dashboard/blocked-items` | GET | Currently blocked items |
| `/api/dashboard/pr-health` | GET | PR review metrics |

#### Individual Metrics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/developers` | GET | List developers (anonymized if not admin) |
| `/api/developers/{id}/metrics` | GET | Individual metrics over time |
| `/api/developers/{id}/comparison` | GET | Compare to team average |
| `/api/me/metrics` | GET | Current user's metrics |

#### Compliance Flags
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/compliance-flags` | GET | List flags (filterable) |
| `/api/compliance-flags/{id}/resolve` | POST | Mark flag resolved |

#### AI Insights
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai-insights` | GET | List predictions |
| `/api/ai-insights/{id}/feedback` | POST | Submit feedback |

#### Notifications
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications` | GET | List notifications |
| `/api/notifications/{id}/read` | POST | Mark as read |
| `/api/notifications/mark-all-read` | POST | Mark all read |
| `/api/notifications/unread-count` | GET | Unread count badge |

#### Exports
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/exports/sprint` | POST | Export sprint data |
| `/api/exports/developer` | POST | Export developer metrics |
| `/api/exports/compliance` | POST | Export compliance report |
| `/api/exports/{id}/status` | GET | Check export status |
| `/api/exports/{id}/download` | GET | Download file |

### 4.4 WebSocket Endpoints (Django Channels)

| Channel | Event | Description |
|---------|-------|-------------|
| `ws/dashboard/{tenant_slug}` | `metrics_update` | Real-time metric refresh |
| `ws/notifications/{user_id}` | `new_notification` | Push notification |
| `ws/etl/{source_id}` | `progress` | ETL progress streaming |
| `ws/admin/health` | `health_update` | System health changes |

---

## 5. ETL Pipeline Architecture

### 5.1 Connector Strategy Pattern

```python
# etl/connectors/base.py
from abc import ABC, abstractmethod
from typing import Iterator, Dict, Any

class BaseConnector(ABC):
    def __init__(self, config: SourceConfiguration):
        self.config = config
        self.session = self._create_session()
    
    @abstractmethod
    def test_connection(self) -> Dict[str, Any]:
        """Test API connectivity and permissions."""
        pass
    
    @abstractmethod
    def discover_fields(self) -> Dict[str, Any]:
        """Auto-discover available fields from source."""
        pass
    
    @abstractmethod
    def extract_work_items(self, start_date: datetime, end_date: datetime) -> Iterator[Dict]:
        """Extract work items in date range."""
        pass
    
    @abstractmethod
    def extract_pull_requests(self, start_date: datetime, end_date: datetime) -> Iterator[Dict]:
        """Extract PR data in date range."""
        pass
    
    def normalize_work_item(self, raw: Dict) -> Dict:
        """Transform source-specific format to unified schema."""
        raise NotImplementedError
    
    def normalize_pull_request(self, raw: Dict) -> Dict:
        """Transform source-specific format to unified schema."""
        raise NotImplementedError

# etl/connectors/jira.py
class JiraConnector(BaseConnector):
    def test_connection(self):
        url = f"{self.config.base_url}/rest/api/2/myself"
        response = self.session.get(url)
        response.raise_for_status()
        return {"success": True, "user": response.json()}
    
    def discover_fields(self):
        url = f"{self.config.base_url}/rest/api/2/field"
        response = self.session.get(url)
        fields = response.json()
        
        # Find custom fields for common DMT fields
        mappings = {}
        for field in fields:
            name = field['name'].lower()
            if 'point' in name:
                mappings['story_points'] = field
            elif 'ac quality' in name or 'acceptance criteria' in name:
                mappings['ac_quality'] = field
            # ... etc
        
        return mappings
    
    def extract_work_items(self, start_date, end_date):
        jql = self._build_jql(start_date, end_date)
        url = f"{self.config.base_url}/rest/api/2/search"
        
        start_at = 0
        while True:
            params = {
                'jql': jql,
                'startAt': start_at,
                'maxResults': 100,
                'fields': self._get_required_fields()
            }
            response = self.session.get(url, params=params)
            data = response.json()
            
            for issue in data['issues']:
                yield self.normalize_work_item(issue)
            
            if start_at + len(data['issues']) >= data['total']:
                break
            start_at += len(data['issues'])

# etl/connectors/factory.py
class ConnectorFactory:
    _connectors = {
        'jira': JiraConnector,
        'clickup': ClickUpConnector,
        'azure_boards': AzureBoardsConnector,
        'github': GitHubConnector,
        'azure_devops_git': AzureDevOpsGitConnector,
    }
    
    @classmethod
    def get_connector(cls, source_type: str, config: SourceConfiguration):
        connector_class = cls._connectors.get(source_type)
        if not connector_class:
            raise ValueError(f"Unknown source type: {source_type}")
        return connector_class(config)
    
    @classmethod
    def register_connector(cls, source_type: str, connector_class):
        """Allow registration of new connectors without code changes."""
        cls._connectors[source_type] = connector_class
```

### 5.2 ETL Celery Tasks

```python
# etl/tasks.py
from celery import shared_task, group, chain
from celery.exceptions import MaxRetriesExceededError

@shared_task(bind=True, max_retries=3)
def extract_source_data(self, source_config_id: int, start_date: str, end_date: str):
    """
    Main ETL task for a single source.
    """
    try:
        config = SourceConfiguration.objects.get(id=source_config_id)
        tenant = config.project.tenant
        
        # Set schema for this tenant
        with schema_context(tenant.get_schema_name()):
            connector = ConnectorFactory.get_connector(config.source_type, config)
            
            # Update status
            config.last_sync_status = 'in_progress'
            config.save()
            
            # Broadcast progress
            broadcast_etl_progress(config.id, 'started', 0)
            
            # Extract work items
            work_items = []
            for idx, raw_item in enumerate(connector.extract_work_items(
                parse(start_date), parse(end_date)
            )):
                normalized = connector.normalize_work_item(raw_item)
                work_items.append(WorkItem(**normalized))
                
                if idx % 10 == 0:
                    broadcast_etl_progress(config.id, 'extracting_work_items', idx)
            
            # Bulk upsert
            WorkItem.objects.bulk_create(
                work_items, 
                update_conflicts=True,
                update_fields=['title', 'status', 'story_points', 'updated_in_system_at'],
                unique_fields=['source_config', 'source_id']
            )
            
            # Extract PRs if code source
            if config.source_type in ['github', 'azure_devops_git']:
                prs = []
                for idx, raw_pr in enumerate(connector.extract_pull_requests(
                    parse(start_date), parse(end_date)
                )):
                    normalized = connector.normalize_pull_request(raw_pr)
                    prs.append(PullRequest(**normalized))
                
                PullRequest.objects.bulk_create(
                    prs,
                    update_conflicts=True,
                    update_fields=['status', 'review_count', 'merged_at'],
                    unique_fields=['source_config', 'pr_number', 'repository_name']
                )
            
            # Run compliance checks
            check_compliance.delay(tenant.id, start_date, end_date)
            
            # Calculate metrics
            calculate_sprint_metrics.delay(tenant.id, start_date, end_date)
            
            # Update source status
            config.last_sync_status = 'success'
            config.last_sync_at = timezone.now()
            config.consecutive_failures = 0
            config.save()
            
            broadcast_etl_progress(config.id, 'completed', 100)
            
            return {'status': 'success', 'work_items': len(work_items)}
            
    except Exception as exc:
        config = SourceConfiguration.objects.get(id=source_config_id)
        config.consecutive_failures += 1
        config.last_error_message = str(exc)
        
        # Check failure threshold
        if config.consecutive_failures >= config.failure_alert_threshold:
            create_notification.delay(
                tenant_id=config.project.tenant.id,
                notification_type='etl_failure',
                title=f"ETL Failed for {config.name}",
                message=f"Source {config.name} has failed {config.consecutive_failures} times. Error: {str(exc)}"
            )
        
        config.save()
        
        # Retry with exponential backoff
        try:
            raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
        except MaxRetriesExceededError:
            config.last_sync_status = 'failed'
            config.save()
            broadcast_etl_progress(config.id, 'failed', 0, error=str(exc))
            raise

@shared_task
def check_compliance(tenant_id: int, start_date: str, end_date: str):
    """
    Check DMT compliance for all work items in date range.
    """
    with schema_context(Tenant.objects.get(id=tenant_id).get_schema_name()):
        work_items = WorkItem.objects.filter(
            updated_in_system_at__gte=start_date,
            updated_in_system_at__lte=end_date
        )
        
        for item in work_items:
            failures = []
            
            # Check AC Quality
            if not item.ac_quality or item.ac_quality == 'incomplete':
                failures.append('missing_ac_quality')
            
            # Check Unit Testing
            if item.unit_testing_status not in ['done', 'exception_approved']:
                failures.append('unit_testing_not_done')
            
            # Check Coverage
            threshold = item.source_config.project.default_coverage_threshold
            if item.coverage_percent is None or item.coverage_percent < threshold:
                if item.unit_testing_status != 'exception_approved':
                    failures.append('low_coverage')
            
            # Check PR Link
            if item.item_type == 'story' and not item.pr_links:
                failures.append('missing_pr_link')
            
            # Update work item
            item.dmt_compliant = len(failures) == 0
            item.compliance_failures = failures
            item.save()
            
            # Create/update compliance flags
            for failure in failures:
                ComplianceFlag.objects.get_or_create(
                    work_item=item,
                    flag_type=failure,
                    defaults={
                        'severity': 'critical' if failure in ['missing_pr_link', 'unit_testing_not_done'] else 'warning',
                        'message': get_compliance_message(failure)
                    }
                )
            
            # Clear resolved flags
            ComplianceFlag.objects.filter(
                work_item=item,
                flag_type__in=[f for f in ['missing_ac_quality', 'low_coverage', 'missing_pr_link'] if f not in failures],
                is_resolved=False
            ).update(is_resolved=True, resolved_at=timezone.now())

@shared_task
def generate_ai_predictions(tenant_id: int):
    """
    Nightly AI prediction generation.
    """
    tenant = Tenant.objects.get(id=tenant_id)
    
    with schema_context(tenant.get_schema_name()):
        # Velocity forecast
        recent_sprints = SprintMetrics.objects.order_by('-sprint_end_date')[:6]
        if len(recent_sprints) >= 3:
            velocities = [s.velocity for s in recent_sprints]
            trend = calculate_trend(velocities)
            
            # Call AI for narrative
            prompt = f"""
            Sprint velocity trend: {velocities}
            Trend direction: {trend}
            Provide 2-3 sentence analysis and recommendation for next sprint planning.
            """
            
            response = call_ai_api(tenant, prompt)
            
            AIPrediction.objects.create(
                prediction_type='velocity_forecast',
                sprint_name=recent_sprints[0].sprint_name,
                title=f"Velocity Forecast for Next Sprint",
                summary=response['summary'],
                detailed_analysis=response['analysis'],
                recommended_actions=response['actions'],
                input_data_summary={'recent_velocities': velocities}
            )
        
        # Developer risk assessment
        developers = DeveloperMetrics.objects.filter(
            sprint_end_date=recent_sprints[0].sprint_end_date
        ).exclude(developer_source_id='')
        
        for dev in developers:
            if dev.dmt_compliance_rate < 70 or dev.defects_attributed > 2:
                prompt = f"""
                Developer metrics:
                - Compliance rate: {dev.dmt_compliance_rate}%
                - Defects attributed: {dev.defects_attributed}
                - Story points: {dev.story_points_completed}
                
                Provide supportive coaching recommendation for tech lead.
                """
                
                response = call_ai_api(tenant, prompt)
                
                AIPrediction.objects.create(
                    prediction_type='developer_risk',
                    developer_source_id=dev.developer_source_id,
                    title=f"Check-in recommended: {dev.developer_name}",
                    summary=response['summary'],
                    recommended_actions=response['actions']
                )
```

---

## 6. Frontend Architecture

### 6.1 Admin Portal (admin.company.com)

```
src/
├── app/
│   ├── layout.tsx              # Root layout with auth check
│   ├── page.tsx                # Redirect to /dashboard
│   ├── login/
│   │   └── page.tsx            # Platform admin login
│   ├── dashboard/
│   │   ├── page.tsx            # System overview
│   │   ├── tenants/
│   │   │   ├── page.tsx        # Tenant list
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx    # Tenant detail
│   │   │   │   ├── projects/
│   │   │   │   │   └── page.tsx # Projects in tenant
│   │   │   │   └── users/
│   │   │   │       └── page.tsx # Users in tenant
│   │   │   └── new/
│   │   │       └── page.tsx    # Create tenant
│   │   ├── projects/
│   │   │   └── [id]/
│   │   │       ├── page.tsx    # Project detail
│   │   │       └── sources/
│   │   │           ├── page.tsx # List sources
│   │   │           └── new/
│   │   │               └── page.tsx # Add source config
│   │   ├── sources/
│   │   │   └── [id]/
│   │   │       ├── page.tsx    # Source detail/edit
│   │   │       └── test/
│   │   │           └── page.tsx # Test connection results
│   │   ├── health/
│   │   │   └── page.tsx        # ETL status, queue depths
│   │   ├── audit-logs/
│   │   │   └── page.tsx        # Filterable audit trail
│   │   └── data-retention/
│   │       └── page.tsx        # Retention job management
│   └── api/
│       └── [...route]          # Next.js API routes (proxy to Django)
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── forms/                  # Tenant form, Source config form
│   ├── tables/                 # Data tables with sorting/filtering
│   └── charts/                 # Simple charts for admin
├── lib/
│   ├── api.ts                  # API client
│   ├── auth.ts                 # Auth utilities
│   └── utils.ts
└── types/
    └── index.ts                # TypeScript interfaces
```

### 6.2 Company Portal (app.company.com)

```
src/
├── app/
│   ├── layout.tsx              # Root with sidebar navigation
│   ├── login/
│   │   └── page.tsx            # Company user login
│   ├── dashboard/
│   │   ├── page.tsx            # Main dashboard with KPI cards
│   │   ├── velocity/
│   │   │   └── page.tsx        # Deep velocity analysis
│   │   ├── throughput/
│   │   │   └── page.tsx        # Throughput trends
│   │   ├── quality/
│   │   │   └── page.tsx        # Defect density, compliance
│   │   └── pr-health/
│   │       └── page.tsx        # Code review metrics
│   ├── team/
│   │   ├── page.tsx            # Team overview
│   │   └── sprint/
│   │       └── [name]/
│   │           └── page.tsx    # Sprint deep-dive
│   ├── developers/
│   │   ├── page.tsx            # Developer list (anonymized)
│   │   └── [id]/
│   │       └── page.tsx        # Individual metrics
│   ├── me/
│   │   └── page.tsx            # Current user's metrics
│   ├── compliance/
│   │   ├── page.tsx            # Compliance overview
│   │   └── flags/
│   │       └── page.tsx        # Non-compliance flags list
│   ├── ai-insights/
│   │   └── page.tsx            # AI predictions and suggestions
│   ├── notifications/
│   │   └── page.tsx            # Notification center
│   └── exports/
│       └── page.tsx            # Export reports UI
├── components/
│   ├── ui/
│   ├── dashboard/
│   │   ├── KPICard.tsx
│   │   ├── VelocityChart.tsx
│   │   ├── SprintBurndown.tsx
│   │   ├── ComplianceGauge.tsx
│   │   └── PredictionCard.tsx
│   ├── charts/
│   │   ├── LineChart.tsx
│   │   ├── BarChart.tsx
│   │   ├── ScatterPlot.tsx
│   │   └── Heatmap.tsx
│   ├── tables/
│   │   ├── WorkItemTable.tsx
│   │   ├── DeveloperTable.tsx
│   │   └── ComplianceFlagTable.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       └── NotificationBell.tsx
├── hooks/
│   ├── useWebSocket.ts         # Real-time updates
│   ├── useAuth.ts
│   └── useTenant.ts
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   ├── websocket.ts
│   └── export.ts
└── types/
    └── index.ts
```

### 6.3 Key Frontend Features

| Feature | Implementation |
|---------|---------------|
| **Real-time Dashboards** | WebSocket connection to Django Channels, recharts for visualization |
| **Deep Analysis** | Drill-down from high-level metrics to individual work items |
| **AI Insights** | Dedicated section with feedback buttons (thumbs up/down) |
| **Compliance Flags** | Red/yellow/green indicators, filterable table, one-click resolve |
| **Export** | Client-side generation (Excel: xlsx library, CSV: native) with progress |
| **Responsive** | Tailwind grid, mobile-optimized tables/cards |

---

## 7. Docker & Deployment

### 7.1 Directory Structure

```
dmt-sldp-platform/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py
│   ├── dmt_platform/          # Django project
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py            # Channels config
│   │   └── celery.py
│   ├── apps/
│   │   ├── public/            # Tenant management
│   │   ├── etl/               # Connectors, tasks
│   │   ├── compliance/        # DMT checks
│   │   ├── ai/                # Prediction engine
│   │   └── notifications/     # In-app notifications
│   └── connectors/            # Extensible connectors
│       ├── base.py
│       ├── jira.py
│       ├── clickup.py
│       ├── azure_boards.py
│       ├── github.py
│       └── azure_devops_git.py
├── frontend-admin/            # Next.js admin portal
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── frontend-company/          # Next.js company portal
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── nginx/
│   └── nginx.conf             # Reverse proxy config
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example               # Template for all env vars
```

### 7.2 Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    command: >
      sh -c "python manage.py migrate_schemas --executor=parallel &&
             python manage.py runserver 0.0.0.0:8000"
    volumes:
      - ./backend:/app
    environment:
      - DEBUG=True
      - SECRET_KEY=${DJANGO_SECRET_KEY}
      - DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/1
      - CELERY_RESULT_BACKEND=redis://redis:6379/2
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis

  celery_worker:
    build: ./backend
    command: celery -A dmt_platform worker -l info -c 4
    volumes:
      - ./backend:/app
    environment:
      - DEBUG=True
      - SECRET_KEY=${DJANGO_SECRET_KEY}
      - DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/1
      - CELERY_RESULT_BACKEND=redis://redis:6379/2
    depends_on:
      - postgres
      - redis

  celery_beat:
    build: ./backend
    command: celery -A dmt_platform beat -l info
    volumes:
      - ./backend:/app
    environment:
      - DEBUG=True
      - SECRET_KEY=${DJANGO_SECRET_KEY}
      - DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/1
      - CELERY_RESULT_BACKEND=redis://redis:6379/2
    depends_on:
      - postgres
      - redis

  frontend_admin:
    build: ./frontend-admin
    command: npm run dev
    volumes:
      - ./frontend-admin:/app
      - /app/node_modules
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api
    ports:
      - "3000:3000"

  frontend_company:
    build: ./frontend-company
    command: npm run dev
    volumes:
      - ./frontend-company:/app
      - /app/node_modules
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api
      - NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
    ports:
      - "3001:3000"

volumes:
  postgres_data:
```

### 7.3 Environment Variables (.env.example)

```bash
# Database
DB_USER=dmt_platform
DB_PASSWORD=change_me_in_production
DB_NAME=dmt_platform

# Django
DJANGO_SECRET_KEY=generate_strong_random_key
DEBUG=False
ALLOWED_HOSTS=localhost,api.yourdomain.com

# Redis
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2

# AI Provider (OpenAI default)
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_MODEL=gpt-4

# Frontend URLs (for CORS and redirects)
ADMIN_PORTAL_URL=https://admin.yourdomain.com
COMPANY_PORTAL_URL=https://app.yourdomain.com

# File Storage (for exports/archives)
DEFAULT_FILE_STORAGE=django.core.files.storage.FileSystemStorage
MEDIA_ROOT=/app/media
MEDIA_URL=/media/

# Optional: S3 for production
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
# AWS_STORAGE_BUCKET_NAME=...
```

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

| Task | Deliverable |
|------|-------------|
| Setup Django project with multi-tenant support | Working backend with schema separation |
| Create public schema models (Tenant, User, Project, SourceConfiguration) | Admin API endpoints |
| Implement JWT authentication | Login/register endpoints |
| Setup Next.js admin portal | Basic UI for tenant/project management |
| Docker Compose environment | `docker-compose up` works locally |

### Phase 2: ETL Core (Weeks 3-4)

| Task | Deliverable |
|------|-------------|
| Implement BaseConnector and JiraConnector | Jira extraction working |
| Build Celery tasks for ETL | Nightly extraction automated |
| Add field auto-discovery UI | Admin can map fields visually |
| Create tenant schema models (WorkItem, PullRequest) | Data storage ready |
| Historical import functionality | Backfill one month on onboarding |

### Phase 3: Compliance & Metrics (Weeks 5-6)

| Task | Deliverable |
|------|-------------|
| Implement DMT compliance engine | Flags generated automatically |
| Build SprintMetrics calculation | Pre-aggregated metrics |
| Create DeveloperMetrics aggregation | Individual metrics ready |
| Build compliance flags dashboard | Non-compliance visible in UI |
| Add notification system | Bell icon with unread count |

### Phase 4: Company Portal & Real-time (Weeks 7-8)

| Task | Deliverable |
|------|-------------|
| Build company portal Next.js app | All dashboards functional |
| Implement Django Channels | WebSocket for live updates |
| Add deep analysis charts | Drill-down functionality |
| Export functionality (Excel/CSV) | Downloadable reports |
| AI prediction integration | Nightly AI insights generated |

### Phase 5: Polish & Scale (Weeks 9-10)

| Task | Deliverable |
|------|-------------|
| Add remaining connectors (ClickUp, Azure Boards, GitHub, Azure DevOps Git) | Full tool coverage |
| Implement data retention UI | Archive/delete workflows |
| Health monitoring dashboard | Admin system health view |
| Performance optimization | Query optimization, caching |
| Production deployment docs | Deployment guide |

---

## 9. Key Design Decisions Summary

| Decision | Rationale |
|----------|-----------|
| **Schema-per-tenant** | Data isolation, GDPR compliance, easy backup/restore per company |
| **Two separate frontends** | Clean separation of concerns, different auth flows, independent scaling |
| **UI-driven configuration** | Zero code changes for new projects/sources |
| **Strategy pattern for connectors** | Easy addition of new PM tools/code registries without core changes |
| **Async AI predictions** | Don't block dashboards, store results for instant retrieval |
| **Soft delete + archival** | Financial year compliance, recoverability |
| **Real-time via WebSocket** | Immediate visibility into compliance issues and ETL status |

---

This PRD provides complete specification for an AI agent to build the entire platform independently. All architectural patterns, data models, API contracts, and implementation sequences are defined.