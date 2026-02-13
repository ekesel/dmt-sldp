---
phase: 5
plan: 2
wave: 1
---

# Plan 5.2: Azure Boards Integration

## Objective
Implement Azure Boards as an additional project management tool source, supporting WIQL-based work item queries and Microsoft Entra ID OAuth authentication.

## Context
- `.gsd/SPEC.md` — REQ-08 (Advanced integration support)
- `.gsd/phases/5/RESEARCH.md` — Azure Boards API details
- `backend/data/sources/` — Existing source integration pattern
- `backend/data/models.py` — Integration model

## Tasks

<task type="auto">
  <name>Create Azure Boards Source Adapter</name>
  <files>backend/data/sources/azure_boards.py</files>
  <action>
    Create `AzureBoardsSource` class following existing source adapter patterns.
    
    - Implement Microsoft Entra ID OAuth authentication (store access/refresh tokens)
    - Create methods: `fetch_work_items()`, `execute_wiql_query()`, `normalize_workitem()`
    - Map Azure Boards entities to normalized schema:
      - Work Item → WorkItem
      - Project → Project
      - Assigned To → Developer
      - State → WorkItem.status
      - Pull Request links → PullRequest FK
    - Use WIQL to query: "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '{project}' AND [System.ChangedDate] >= '{last_sync}'"
    - Fetch full work item details after WIQL query returns IDs
    - Handle OAuth token refresh logic
    
    AVOID implementing custom work item types in this task (use standard User Story, Bug, Task).
  </action>
  <verify>
    python manage.py shell -c "from backend.data.sources.azure_boards import AzureBoardsSource; print('Azure Boards source adapter loaded')"
  </verify>
  <done>AzureBoardsSource class exists with WIQL query execution and work item normalization</done>
</task>

<task type="auto">
  <name>Integrate Azure Boards Into ETL Pipeline</name>
  <files>backend/data/tasks.py, backend/admin/views.py</files>
  <action>
    Update the ETL sync workflow to support Azure Boards integrations.
    
    - In `sync_tenant_data` task: Add conditional branch for `integration.source_type == 'azure_boards'`
    - Call `AzureBoardsSource(integration).fetch_work_items()` and save to WorkItem model
    - In Admin Portal integration form: Add "Azure Boards" to source_type choices
    - Add configuration fields: organization, project, access_token, refresh_token
    
    Ensure Developer matching works with Azure DevOps email format.
  </action>
  <verify>
    python manage.py shell -c "from backend.data.models import Integration; i = Integration.objects.create(source_type='azure_boards', name='Test'); print(i)"
  </verify>
  <done>ETL pipeline supports Azure Boards source type and Admin Portal form includes Azure Boards option</done>
</task>

## Success Criteria
- [ ] AzureBoardsSource adapter implemented with Entra ID OAuth and WIQL queries
- [ ] ETL pipeline processes Azure Boards work items into normalized model
- [ ] Admin Portal allows creating Azure Boards integrations
