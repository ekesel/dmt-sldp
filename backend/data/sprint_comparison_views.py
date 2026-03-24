from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import SprintMetrics, DeveloperMetrics, WorkItem
from django.db.models import Count, Q

class SprintComparisonView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project_id')
        sprint_a_name = request.query_params.get('sprint_a')
        sprint_b_name = request.query_params.get('sprint_b')
        developer_id = request.query_params.get('developer_id')

        if not sprint_a_name or not sprint_b_name:
            return Response({"error": "sprint_a and sprint_b are required query parameters"}, status=status.HTTP_400_BAD_REQUEST)

        # Build filter kwargs
        filter_kwargs_a = {'sprint_name': sprint_a_name}
        filter_kwargs_b = {'sprint_name': sprint_b_name}
        if project_id:
            filter_kwargs_a['project_id'] = project_id
            filter_kwargs_b['project_id'] = project_id

        data = {
            'sprint_a': {'name': sprint_a_name},
            'sprint_b': {'name': sprint_b_name},
            'kpis': {},
            'charts': {
                'radar': [],
                'planned_vs_completed': [],
                'work_type_distribution': {'sprint_a': {}, 'sprint_b': {}},
                'workload_distribution': [],
                'blocked_time': []
            }
        }

        if developer_id:
            filter_kwargs_a['developer_source_id'] = developer_id
            filter_kwargs_b['developer_source_id'] = developer_id
            
            # Developer View
            metric_a = DeveloperMetrics.objects.filter(**filter_kwargs_a).order_by('-sprint_end_date').first()
            metric_b = DeveloperMetrics.objects.filter(**filter_kwargs_b).order_by('-sprint_end_date').first()
            
            # Calculate KPIs
            self._build_kpis(data['kpis'], metric_a, metric_b, sprint_a_name, sprint_b_name, is_developer=True)
            self._build_developer_charts(data['charts'], metric_a, metric_b, sprint_a_name, sprint_b_name)
        else:
            # Team View
            metric_a = SprintMetrics.objects.filter(**filter_kwargs_a).order_by('-sprint_end_date').first()
            metric_b = SprintMetrics.objects.filter(**filter_kwargs_b).order_by('-sprint_end_date').first()
            
            # Calculate KPIs
            self._build_kpis(data['kpis'], metric_a, metric_b, sprint_a_name, sprint_b_name, is_developer=False)
            self._build_team_charts(data['charts'], metric_a, metric_b, sprint_a_name, sprint_b_name)
            
            # Work items distribution for team
            self._build_work_type_distribution(data['charts'], sprint_a_name, sprint_b_name, project_id)
            self._build_workload_distribution(data['charts'], sprint_a_name, sprint_b_name, project_id)

        return Response(data)

    def _build_kpis(self, kpis, m_a, m_b, sprint_a_name, sprint_b_name, is_developer=False):
        def _get_val(obj, key, default=0):
            val = getattr(obj, key, default) if obj else default
            return val if val is not None else default

        if is_developer:
            kpis['velocity'] = {
                'a': _get_val(m_a, 'story_points_completed'),
                'b': _get_val(m_b, 'story_points_completed'),
            }
            kpis['throughput'] = {
                'a': _get_val(m_a, 'items_completed'),
                'b': _get_val(m_b, 'items_completed'),
            }
            kpis['compliance'] = {
                'a': _get_val(m_a, 'dmt_compliance_rate'),
                'b': _get_val(m_b, 'dmt_compliance_rate'),
            }
            kpis['defect_density'] = {
                'a': _get_val(m_a, 'defects_attributed'),
                'b': _get_val(m_b, 'defects_attributed'),
            }
            kpis['pr_review_speed'] = {
                'a': _get_val(m_a, 'avg_review_time_hours'),
                'b': _get_val(m_b, 'avg_review_time_hours'),
            }
            kpis['ai_usage'] = {
                'a': _get_val(m_a, 'ai_usage_percent'),
                'b': _get_val(m_b, 'ai_usage_percent'),
            }
            kpis['code_ai_usage'] = {
                'a': _get_val(m_a, 'code_ai_usage_percent'),
                'b': _get_val(m_b, 'code_ai_usage_percent'),
            }
            
            # Calculate item volume from WorkItems (Total vs Completed)
            def _get_dev_items(m, s_name):
                if not m: return 0, 0
                qs = WorkItem.objects.filter(sprint__name=s_name, assignee_email=m.developer_email)
                total = qs.count()
                completed = qs.filter(status_category='done').count()
                return total, completed

            tot_a, comp_a = _get_dev_items(m_a, sprint_a_name)
            tot_b, comp_b = _get_dev_items(m_b, sprint_b_name)

            kpis['item_volume'] = {
                'a': tot_a,
                'b': tot_b,
                'sub_a': comp_a,
                'sub_b': comp_b,
            }
        else:
            kpis['velocity'] = {
                'a': _get_val(m_a, 'velocity'),
                'b': _get_val(m_b, 'velocity'),
            }
            kpis['throughput'] = {
                'a': _get_val(m_a, 'items_completed'),
                'b': _get_val(m_b, 'items_completed'),
            }
            kpis['cycle_time'] = {
                'a': _get_val(m_a, 'avg_cycle_time_days'),
                'b': _get_val(m_b, 'avg_cycle_time_days'),
            }
            kpis['compliance'] = {
                'a': _get_val(m_a, 'compliance_rate_percent'),
                'b': _get_val(m_b, 'compliance_rate_percent'),
            }
            kpis['defect_density'] = {
                'a': _get_val(m_a, 'defect_density_per_100_points'),
                'b': _get_val(m_b, 'defect_density_per_100_points'),
            }
            kpis['pr_review_speed'] = {
                'a': _get_val(m_a, 'avg_time_to_first_review_hours'),
                'b': _get_val(m_b, 'avg_time_to_first_review_hours'),
            }
            kpis['ai_usage'] = {
                'a': _get_val(m_a, 'ai_usage_percent'),
                'b': _get_val(m_b, 'ai_usage_percent'),
            }
            kpis['code_ai_usage'] = {
                'a': _get_val(m_a, 'code_ai_usage_percent'),
                'b': _get_val(m_b, 'code_ai_usage_percent'),
            }
            kpis['item_volume'] = {
                'a': _get_val(m_a, 'total_items'),
                'b': _get_val(m_b, 'total_items'),
                'sub_a': _get_val(m_a, 'items_completed'),
                'sub_b': _get_val(m_b, 'items_completed'),
            }
            
        for key, vals in kpis.items():
            a = vals['a']
            b = vals['b']
            variance = 0
            if a and a > 0:
                variance = ((b - a) / a) * 100
            elif b and b > 0:
                variance = 100
            vals['variance'] = variance

    def _build_team_charts(self, charts, m_a, m_b, name_a, name_b):
        def _get_val(obj, key, default=0):
            val = getattr(obj, key, default) if obj else default
            return val if val is not None else default

        charts['planned_vs_completed'] = [
            {
                'sprint': name_a,
                'planned': _get_val(m_a, 'total_story_points_committed'),
                'completed': _get_val(m_a, 'total_story_points_completed'),
            },
            {
                'sprint': name_b,
                'planned': _get_val(m_b, 'total_story_points_committed'),
                'completed': _get_val(m_b, 'total_story_points_completed'),
            }
        ]

        charts['blocked_time'] = [
            {
                'sprint': name_a,
                'total_blocked_days': _get_val(m_a, 'total_blocked_days'),
                'avg_blocked_days': _get_val(m_a, 'avg_blocked_days_per_item'),
            },
            {
                'sprint': name_b,
                'total_blocked_days': _get_val(m_b, 'total_blocked_days'),
                'avg_blocked_days': _get_val(m_b, 'avg_blocked_days_per_item'),
            }
        ]

        # Radar normalizes values roughly to 0-100 or simply provides absolute values to frontend
        # Assuming frontend radar handles absolute values but it's better if they're grouped by metric
        charts['radar'] = [
            {"subject": "Velocity", "A": _get_val(m_a, 'velocity'), "B": _get_val(m_b, 'velocity'), "fullMark": max(_get_val(m_a, 'velocity'), _get_val(m_b, 'velocity'), 100)},
            {"subject": "Throughput", "A": _get_val(m_a, 'items_completed'), "B": _get_val(m_b, 'items_completed'), "fullMark": max(_get_val(m_a, 'items_completed'), _get_val(m_b, 'items_completed'), 100)},
            {"subject": "Compliance (%)", "A": _get_val(m_a, 'compliance_rate_percent'), "B": _get_val(m_b, 'compliance_rate_percent'), "fullMark": 100},
            {"subject": "Cycle Time", "A": _get_val(m_a, 'avg_cycle_time_days'), "B": _get_val(m_b, 'avg_cycle_time_days'), "fullMark": max(_get_val(m_a, 'avg_cycle_time_days'), _get_val(m_b, 'avg_cycle_time_days'), 14)},
            {"subject": "PR Speed", "A": _get_val(m_a, 'avg_time_to_first_review_hours'), "B": _get_val(m_b, 'avg_time_to_first_review_hours'), "fullMark": max(_get_val(m_a, 'avg_time_to_first_review_hours'), _get_val(m_b, 'avg_time_to_first_review_hours'), 48)},
            {"subject": "AI Usage (PR)", "A": _get_val(m_a, 'code_ai_usage_percent'), "B": _get_val(m_b, 'code_ai_usage_percent'), "fullMark": 100}
        ]

    def _build_developer_charts(self, charts, m_a, m_b, name_a, name_b):
        def _get_val(obj, key, default=0):
            val = getattr(obj, key, default) if obj else default
            return val if val is not None else default

        charts['radar'] = [
            {"subject": "Points", "A": _get_val(m_a, 'story_points_completed'), "B": _get_val(m_b, 'story_points_completed'), "fullMark": max(_get_val(m_a, 'story_points_completed'), _get_val(m_b, 'story_points_completed'), 50)},
            {"subject": "Commits", "A": _get_val(m_a, 'commits_count'), "B": _get_val(m_b, 'commits_count'), "fullMark": max(_get_val(m_a, 'commits_count'), _get_val(m_b, 'commits_count'), 50)},
            {"subject": "PRs Authored", "A": _get_val(m_a, 'prs_authored'), "B": _get_val(m_b, 'prs_authored'), "fullMark": max(_get_val(m_a, 'prs_authored'), _get_val(m_b, 'prs_authored'), 20)},
            {"subject": "PRs Reviewed", "A": _get_val(m_a, 'prs_reviewed'), "B": _get_val(m_b, 'prs_reviewed'), "fullMark": max(_get_val(m_a, 'prs_reviewed'), _get_val(m_b, 'prs_reviewed'), 20)},
            {"subject": "Compliance (%)", "A": _get_val(m_a, 'dmt_compliance_rate'), "B": _get_val(m_b, 'dmt_compliance_rate'), "fullMark": 100},
            {"subject": "AI Usage (PR)", "A": _get_val(m_a, 'code_ai_usage_percent'), "B": _get_val(m_b, 'code_ai_usage_percent'), "fullMark": 100}
        ]

    def _build_work_type_distribution(self, charts, name_a, name_b, project_id):
        # We need to query WorkItem directly for this
        qs_a = WorkItem.objects.filter(sprint__name=name_a)
        qs_b = WorkItem.objects.filter(sprint__name=name_b)
        
        # Sprint might be related through a foreign key or external ID, we might need to check how it's linked
        # If no strict relation, we might just query by sprint name directly
        if project_id:
            # We assume source_config_id ties to project, but for now we filter by sprint name
            pass
            
        counts_a = qs_a.values('item_type').annotate(count=Count('id'))
        counts_b = qs_b.values('item_type').annotate(count=Count('id'))
        
        for c in counts_a:
            charts['work_type_distribution']['sprint_a'][c['item_type']] = c['count']
        for c in counts_b:
            charts['work_type_distribution']['sprint_b'][c['item_type']] = c['count']

    def _build_workload_distribution(self, charts, name_a, name_b, project_id):
        # Get all developer metrics for these two sprints
        filter_a = Q(sprint_name=name_a)
        filter_b = Q(sprint_name=name_b)
        if project_id:
            filter_a &= Q(project_id=project_id)
            filter_b &= Q(project_id=project_id)

        metrics_a = DeveloperMetrics.objects.filter(filter_a).values('developer_name', 'story_points_completed', 'items_completed')
        metrics_b = DeveloperMetrics.objects.filter(filter_b).values('developer_name', 'story_points_completed', 'items_completed')

        # Combine into a format the frontend can easily use for a side-by-side or stacked bar chart
        dist = {} # name -> { points_a, points_b, items_a, items_b }

        for m in metrics_a:
            name = m['developer_name']
            if name not in dist: dist[name] = {'name': name, 'points_a': 0, 'points_b': 0, 'items_a': 0, 'items_b': 0}
            dist[name]['points_a'] = m['story_points_completed']
            dist[name]['items_a'] = m['items_completed']

        for m in metrics_b:
            name = m['developer_name']
            if name not in dist: dist[name] = {'name': name, 'points_a': 0, 'points_b': 0, 'items_a': 0, 'items_b': 0}
            dist[name]['points_b'] = m['story_points_completed']
            dist[name]['items_b'] = m['items_completed']

        charts['workload_distribution'] = sorted(list(dist.values()), key=lambda x: x['points_b'], reverse=True)
