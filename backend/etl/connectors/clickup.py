from typing import Dict, Any, List, Optional, Callable
import requests
from ..base import BaseConnector
from data.models import WorkItem, Sprint
from django.utils import timezone
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ClickupConnector(BaseConnector):
    def test_connection(self) -> bool:
        """
        Verify ClickUp API token by fetching user info.
        """
        if not self.api_key:
            raise ValueError("API Key is required for ClickUp")
            
        url = f"{self.base_url}/user" # https://api.clickup.com/api/v2/user
        headers = {'Authorization': self.api_key}
        
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return True
        else:
            raise Exception(f"ClickUp Connection Failed: {response.text}")

    def sync(self, tenant_id: int, source_id: int, progress_callback: Optional[Callable[[int, str], None]] = None) -> Dict[str, Any]:
        """
        Fetch workspaces, spaces, lists, and tasks from ClickUp and sync to WorkItem model.
        """
        headers = {'Authorization': self.api_key}
        item_count = 0
        
        def report(pct, msg):
            if progress_callback:
                progress_callback(pct, msg)

        # 1. Get Teams (Workspaces)
        report(25, "Fetching ClickUp workspaces...")
        teams_resp = requests.get(f"{self.base_url}/team", headers=headers)
        if teams_resp.status_code != 200:
             raise Exception(f"Failed to fetch ClickUp teams: {teams_resp.text}")
             
        teams = teams_resp.json().get('teams', [])
        if not teams:
             return {'item_count': 0}
        
        # For MVP, we sync the first team/workspace
        team = teams[0]
        team_id = team['id']
        logger.info(f"Syncing ClickUp Team: {team['name']} ({team_id})")

        # 2. Get Spaces
        report(30, f"Fetching spaces for workspace {team['name']}...")
        spaces_resp = requests.get(f"{self.base_url}/team/{team_id}/space", headers=headers)
        if spaces_resp.status_code != 200:
            raise Exception(f"Failed to fetch ClickUp spaces: {spaces_resp.text}")
        
        spaces = spaces_resp.json().get('spaces', [])
        
        all_lists = []
        sprint_lists = {} # list_id -> Sprint object

        for i, space in enumerate(spaces):
            space_id = space['id']
            report(30 + int((i/len(spaces)) * 15), f"Scanning space: {space['name']}...")
            
            # 3. Get Folders -> Lists
            folders_resp = requests.get(f"{self.base_url}/space/{space_id}/folder", headers=headers)
            if folders_resp.status_code == 200:
                folders = folders_resp.json().get('folders', [])
                print(f"Space {space['name']} has {len(folders)} folders.")
                for folder in folders:
                    # Identify Sprint folders via flag or name fallback
                    is_sprint = folder.get('is_sprint_folder', False) or 'sprint' in folder['name'].lower()
                    lists = folder.get('lists', [])
                    for lst in lists:
                        all_lists.append(lst)
                        if is_sprint:
                            # Create or update Sprint record
                            sprint_ext_id = f"clickup_sprint_{lst['id']}"
                            # ClickUp lists have start_date and due_date in ms
                            s_start = None
                            if lst.get('start_date'):
                                s_start = timezone.make_aware(datetime.fromtimestamp(int(lst['start_date']) / 1000))
                            s_end = None
                            if lst.get('due_date'):
                                s_end = timezone.make_aware(datetime.fromtimestamp(int(lst['due_date']) / 1000))
                            
                            # Determine status - Only timed lists are active/completed
                            now = timezone.now()
                            if not s_start or not s_end:
                                status = 'backlog' # Static lists (In Progress, Done, etc)
                            elif now > s_end:
                                status = 'completed'
                            elif now < s_start:
                                status = 'planned'
                            else:
                                status = 'active'

                            sprint_obj, _ = Sprint.objects.update_or_create(
                                external_id=sprint_ext_id,
                                defaults={
                                    'name': lst['name'],
                                    'start_date': s_start,
                                    'end_date': s_end,
                                    'status': status
                                }
                            )
                            sprint_lists[lst['id']] = sprint_obj
            
            # 4. Get Folderless Lists
            lists_resp = requests.get(f"{self.base_url}/space/{space_id}/list", headers=headers)
            if lists_resp.status_code == 200:
                lists = lists_resp.json().get('lists', [])
                all_lists.extend(lists)

        # 5. Get Tasks from each list
        total_lists = len(all_lists)
        for i, lst in enumerate(all_lists):
            list_id = lst['id']
            list_name = lst['name']
            
            report(50 + int((i/total_lists) * 40), f"Syncing tasks from list: {list_name}...")
            
            # Use subtasks=true and include_closed=true for completeness
            # Implement pagination with larger limit
            page = 0
            limit = 100
            while True:
                url = f"{self.base_url}/list/{list_id}/task?subtasks=true&include_closed=true&page={page}&limit={limit}"
                tasks_resp = requests.get(url, headers=headers)
                if tasks_resp.status_code != 200:
                    break
                
                tasks_data = tasks_resp.json()
                tasks = tasks_data.get('tasks', [])
                if not tasks:
                    break
                
                for task in tasks:
                    self._sync_task(task, source_id, sprint_obj=sprint_lists.get(list_id))
                    item_count += 1
                
                # Check if we should continue
                if tasks_data.get('last_page') or len(tasks) < limit:
                    break
                page += 1
                
                # Memory optimization: Clear query log and collect GC
                from django.db import connection
                connection.queries_log.clear()
                import gc
                gc.collect()
        
        # 6. Post-Sync: Link Parent/Child and Aggregate Points
        report(95, "Resolving parent/child links and aggregating points...")
        self._post_sync_linking(source_id)

        report(100, f"Sync complete. Processed {item_count} items.")
        return {'item_count': item_count}

    def _post_sync_linking(self, source_id: int):
        """
        Link subtasks to parents and aggregate story points / AI usage.
        """
        from data.models import WorkItem
        from django.db.models import Sum, Avg
        
        # Resolve Parent Linkage (for items where parent wasn't synced yet)
        broken_links = WorkItem.objects.filter(source_config_id=source_id, parent__isnull=True, raw_source_data__parent__isnull=False)
        for item in broken_links:
            parent_ext_id = item.raw_source_data.get('parent')
            parent_obj = WorkItem.objects.filter(source_config_id=source_id, external_id=parent_ext_id).first()
            if parent_obj:
                item.parent = parent_obj
                item.save()

        # Aggregate Story Points (Sum subtasks if parent is None/Zero)
        parents = WorkItem.objects.filter(source_config_id=source_id, subtasks__isnull=False).distinct()
        for p in parents:
            # First, check if subtasks in DB are still subtasks in ClickUp
            # This is hard because we don't know "all" subtasks unless we fetch everything.
            # But we can at least check if the subtask's raw_data still has this parent.
            valid_subtasks = p.subtasks.all()
            
            subtask_points = valid_subtasks.aggregate(Sum('story_points'))['story_points__sum']
            if subtask_points:
                # Only overwrite if parent has no points or points were derived from subtasks previously
                if p.story_points is None or p.story_points == 0 or p.story_points == subtask_points:
                     p.story_points = subtask_points
                     p.save()
            elif p.story_points is not None:
                # If no subtasks found, and points were previously aggregated, clear them
                # But only if the 'points' field in ClickUp raw_data is also null/0
                raw_points = p.raw_source_data.get('points')
                if not raw_points:
                    p.story_points = 0
                    p.save()
            
            # Aggregate AI Usage (Avg)
            subtask_ai = valid_subtasks.aggregate(Avg('ai_usage_percent'))['ai_usage_percent__avg']
            if subtask_ai is not None:
                p.ai_usage_percent = subtask_ai
                p.save()

    def normalize_status(self, raw_status: str) -> str:
        """
        Map ClickUp statuses to DMT status categories.
        """
        status = raw_status.lower()
        if status in ['done', 'complete', 'closed', 'resolved', 'verified', 'completed', 'verified - dev']:
            return 'done'
        elif status in ['in progress', 'active', 'development', 'review', 'in review', 'ready for testing', 'testing in progress', 'testing', 'dev scoping', 'reopened']:
            return 'in_progress'
        return 'todo'

    def _sync_task(self, task: Dict[str, Any], source_id: int, sprint_obj=None):
        """
        Map and save a single ClickUp task to the WorkItem model.
        """
        from users.resolver import UserResolver
        from users.resolver import UserResolver
        from etl.transformers import ComplianceEngine

        external_id = task['id']
        
        # ClickUp timestamps are in milliseconds
        created_at = timezone.make_aware(datetime.fromtimestamp(int(task['date_created']) / 1000))
        updated_at = timezone.make_aware(datetime.fromtimestamp(int(task['date_updated']) / 1000))
        
        resolved_at = None
        if task.get('date_closed'):
            resolved_at = timezone.make_aware(datetime.fromtimestamp(int(task['date_closed']) / 1000))
        
        # Capture specific started_at
        started_at = None
        if task.get('date_started'):
            started_at = timezone.make_aware(datetime.fromtimestamp(int(task['date_started']) / 1000))
        elif task.get('start_date'):
            started_at = timezone.make_aware(datetime.fromtimestamp(int(task['start_date']) / 1000))

        # Status and Category
        raw_status = task.get('status', {}).get('status', 'Open')
        status_category = self.normalize_status(raw_status)
        
        # Fallback for resolved_at if status is Done but no date_closed
        if not resolved_at and status_category == 'done':
            resolved_at = updated_at or timezone.now()
        
        priority = task.get('priority', {}).get('priority', 'normal') if task.get('priority') else 'normal'
        
        assignee_email = task.get('assignees', [{}])[0].get('email') if task.get('assignees') else None
        resolved_assignee = UserResolver.resolve_by_identity('clickup', assignee_email)

        # Generic Field Mapping from Config
        from configuration.models import SourceConfiguration
        try:
            sc = SourceConfiguration.objects.get(id=source_id)
            config_mapping = sc.config_json.get('field_mapping', {}) if sc.config_json else {}
        except SourceConfiguration.DoesNotExist:
            config_mapping = {}

        # Custom Fields Extraction
        custom_fields = task.get('custom_fields', [])
        
        # Helper to find value by field ID or Name
        def get_cf_value(field_identifier):
            if not field_identifier: return None
            for cf in custom_fields:
                if cf['id'] == field_identifier or cf['name'] == field_identifier:
                    # Value extraction depends on type
                    val = cf.get('value')
                    
                    # Handle drop_down (value is index) -> Resolve to Name
                    if cf.get('type') == 'drop_down' and val is not None:
                        options = cf.get('type_config', {}).get('options', [])
                        try:
                            # 1. val can be an index (int) mapping to the element's orderindex
                            if isinstance(val, int):
                                for opt in options:
                                    # Some ClickUp fields set 'orderindex'
                                    if opt.get('orderindex') == val:
                                        return opt.get('name')
                                # Fallback to strict array indexing if orderindex isn't present
                                return options[val].get('name') if val < len(options) else str(val)
                            
                            # 2. val can be a string representation of an index ("0", "1")
                            if isinstance(val, str) and val.isdigit():
                                idx = int(val)
                                for opt in options:
                                    if opt.get('orderindex') == idx:
                                        return opt.get('name')
                                # Fallback if orderindex is missing but it is an index string
                                if idx < len(options):
                                    return options[idx].get('name')
                                    
                            # 3. Sometimes ClickUp returns the option ID (UUID string) as value
                            if isinstance(val, str) and not val.isdigit():
                                for opt in options:
                                    if opt.get('id') == val:
                                        return opt.get('name')
                        except (IndexError, KeyError, ValueError):
                            pass
                    return val
            return None

        # 1. AI Usage
        ai_field_id = config_mapping.get('ai_usage_id')
        ai_usage_percent = None
        if ai_field_id:
            val = get_cf_value(ai_field_id)
            if val is not None:
                try:
                    ai_usage_percent = float(val)
                except (ValueError, TypeError):
                    pass
        
        # 2. PR Link
        pr_link_id = config_mapping.get('pr_link_id')
        pr_link = get_cf_value(pr_link_id)
        # Filter out NA values
        if isinstance(pr_link, str) and pr_link.lower() in ['na', 'n/a', 'none']:
            pr_link = None
        
        # 3. AC Quality
        ac_quality_id = config_mapping.get('ac_quality_id')
        ac_quality_val = get_cf_value(ac_quality_id)
        ac_quality_db = ''
        
        if ac_quality_val:
            ac_quality_lower = str(ac_quality_val).lower()
            if ac_quality_lower == 'final':
                ac_quality_db = 'final'
            elif ac_quality_lower == 'testable':
                ac_quality_db = 'testable'
            elif ac_quality_lower == 'incomplete':
                ac_quality_db = 'incomplete'

        # 3b. Reviewer Signoff
        signoff_id = config_mapping.get('reviewer_dmt_signoff_id')
        reviewer_signoff_val = get_cf_value(signoff_id)
        reviewer_signoff = False
        if reviewer_signoff_val and str(reviewer_signoff_val).upper() == 'Y':
            reviewer_signoff = True
            
        # 3c. Unit Testing Status
        unit_testing_id = config_mapping.get('unit_testing_status_id')
        unit_testing_val = get_cf_value(unit_testing_id)
        unit_testing_status_db = ''
        if unit_testing_val:
            # Map string to DB choice (e.g. 'Done' -> 'done', 'Exception Approved' -> 'exception_approved')
            raw_val = str(unit_testing_val).strip().lower()
            if raw_val == 'not started': unit_testing_status_db = 'not_started'
            elif raw_val == 'in progress': unit_testing_status_db = 'in_progress'
            elif raw_val == 'done': unit_testing_status_db = 'done'
            elif raw_val == 'exception approved': unit_testing_status_db = 'exception_approved'


        # 4. Story Points (Standard ClickUp field 'points')
        story_points = task.get('points')
        
        # 5. Parent ID (Subtasks)
        parent_id = task.get('parent')
        parent_obj = None
        if parent_id:
            try:
                parent_obj = WorkItem.objects.filter(source_config_id=source_id, external_id=parent_id).first()
            except Exception:
                pass

        # 6. Item Type Mapping (Custom Type or Tag)
        item_type = 'task' # default
        
        # Check explicit mapping if configured
        type_field_id = config_mapping.get('item_type_id')
        if type_field_id:
             item_type_val = get_cf_value(type_field_id)
             if item_type_val: item_type = str(item_type_val).lower()

        # Fallback 1: ClickUp custom_item_id (Modern ClickUp ID system)
        custom_item_id = task.get('custom_item_id')
        if item_type == 'task' and custom_item_id:
            cit_map = {
                1: 'epic',       # Milestone
                1001: 'story',   # Goal -> Story
                1002: 'story',   # User Story
                1006: 'bug',     # Bug
                1008: 'epic',    # Epic
                1007: 'epic',    # Initiative
            }
            if custom_item_id in cit_map:
                item_type = cit_map[custom_item_id]

        # Fallback 2: custom_type string (Deprecated but common)
        custom_type = task.get('custom_type')
        if item_type == 'task' and custom_type:
            ct_lower = custom_type.lower() if isinstance(custom_type, str) else ''
            if 'milestone' in ct_lower: item_type = 'epic'
            elif 'feature' in ct_lower: item_type = 'story'
            elif 'bug' in ct_lower: item_type = 'bug'
        
        # Fallback 3: tags for 'story'
        tags = [t['name'].lower() for t in task.get('tags', [])]
        if item_type == 'task' and ('story' in tags or 'feature' in tags):
            item_type = 'story'
        
        # Prepare data for model and compliance check
        work_item_data = {
            'source_config_id': source_id,
            'external_id': external_id,
            'title': task.get('name', 'Untitled'),
            'description': task.get('description', ''),
            'item_type': item_type,
            'status': raw_status,
            'status_category': status_category,
            'priority': priority,
            'story_points': story_points,
            'ai_usage_percent': ai_usage_percent,
            'parent': parent_obj,
            'creator_email': task.get('creator', {}).get('email'),
            'assignee_email': assignee_email,
            'assignee_name': task.get('assignees', [{}])[0].get('username') if task.get('assignees') else None,
            'created_at': created_at,
            'updated_at': updated_at,
            'resolved_at': resolved_at,
            'raw_source_data': task,
            'ac_quality': ac_quality_db,
            'reviewer_dmt_signoff': reviewer_signoff,
            'unit_testing_status': unit_testing_status_db,
        }

        # Clear assignee if none in ClickUp
        if not task.get('assignees'):
            work_item_data['assignee_email'] = None
            work_item_data['assignee_name'] = None
        
        if pr_link:
             work_item_data['pr_links'] = [pr_link]

        # Run non-blocking compliance check
        threshold = self.config.get('coverage_threshold', 80.0)
        is_compliant, compliance_failures = ComplianceEngine.check_compliance(work_item_data, coverage_threshold=threshold)
        work_item_data['dmt_compliant'] = is_compliant
        work_item_data['compliance_failures'] = compliance_failures

        WorkItem.objects.update_or_create(
            source_config_id=source_id,
            external_id=external_id,
            defaults={
                **work_item_data,
                'resolved_assignee': resolved_assignee,
                'sprint': sprint_obj
            }
        )
