from django.contrib import admin
# Trigger reload
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from data.views import (
    MetricDashboardView, ForecastView, AIInsightFeedbackView,
    DashboardSummaryView, VelocityView, ThroughputView, DefectDensityView,
    ComplianceView, BlockedItemsView, PRHealthView,
    DeveloperListView, DeveloperMetricsView, DeveloperComparisonView,
    ComplianceFlagListView, ComplianceFlagResolveView, ComplianceSummaryView, SprintListView, AIInsightListView,
    AssigneeDistributionView, AIInsightRefreshView
)
from data.exports import ExportSprintView, ExportDeveloperView, ExportComplianceView
from tenants.views import TenantViewSet, SystemHealthView, ActivityLogView, SystemSettingsView, ServiceDetailView, ServiceRestartView
from users.views import RegisterView, CustomTokenObtainPairView, UserProfileView, LogoutView, UserViewSet, InviteUserView
from rest_framework.routers import DefaultRouter

from configuration.views import ProjectViewSet, SourceConfigurationViewSet
from notifications.views import NotificationViewSet

router = DefaultRouter()
router.register(r'admin/tenants', TenantViewSet, basename='tenants')
router.register(r'admin/users', UserViewSet, basename='users')
router.register(r'admin/projects', ProjectViewSet, basename='projects')
router.register(r'admin/sources', SourceConfigurationViewSet, basename='source_configurations')
router.register(r'notifications', NotificationViewSet, basename='notifications')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/profile/', UserProfileView.as_view(), name='user_profile'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),
    
    # Analytics & Dashboard
    path('api/analytics/metrics/', MetricDashboardView.as_view(), name='metrics_dashboard'),
    path('api/dashboard/forecast/', ForecastView.as_view(), name='forecast'),
    path('api/dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard_summary'),
    path('api/dashboard/velocity/', VelocityView.as_view(), name='dashboard_velocity'),
    path('api/dashboard/throughput/', ThroughputView.as_view(), name='dashboard_throughput'),
    path('api/dashboard/defect-density/', DefectDensityView.as_view(), name='dashboard_defect_density'),
    path('api/dashboard/compliance/', ComplianceView.as_view(), name='dashboard_compliance'),
    path('api/dashboard/blocked-items/', BlockedItemsView.as_view(), name='dashboard_blocked_items'),
    path('api/dashboard/pr-health/', PRHealthView.as_view(), name='dashboard_pr_health'),
    path('api/dashboard/assignee-distribution/', AssigneeDistributionView.as_view(), name='assignee_distribution'),
    
    # User management
    path('api/users/<int:pk>/invite/', InviteUserView.as_view(), name='user_invite'),
    
    # Developers
    path('api/developers/', DeveloperListView.as_view(), name='developer_list'),
    path('api/developers/<str:id>/metrics/', DeveloperMetricsView.as_view(), name='developer_metrics'),
    path('api/developers/<str:id>/comparison/', DeveloperComparisonView.as_view(), name='developer_comparison'),
    path('api/me/metrics/', DeveloperMetricsView.as_view(), name='my_metrics'), # Needs filtering logic adjustment in view if used

    # Compliance
    path('api/compliance-flags/', ComplianceFlagListView.as_view(), name='compliance_flags'),
    path('api/compliance-flags/<str:id>/resolve/', ComplianceFlagResolveView.as_view(), name='compliance_resolve'),
    path('api/compliance-summary/', ComplianceSummaryView.as_view(), name='compliance_summary'),
    path('api/sprints/', SprintListView.as_view(), name='sprint_list'),
    
    # AI Insights
    path('api/ai-insights/', AIInsightListView.as_view(), name='ai_insights'),
    path('api/ai-insights/refresh/', AIInsightRefreshView.as_view(), name='ai_insights_refresh'),
    path('api/ai-insights/<int:insight_id>/feedback/', AIInsightFeedbackView.as_view(), name='ai_feedback'),

    # Exports
    path('api/exports/sprint/', ExportSprintView.as_view(), name='export_sprint'),
    path('api/exports/developer/', ExportDeveloperView.as_view(), name='export_developer'),
    path('api/exports/compliance/', ExportComplianceView.as_view(), name='export_compliance'),

    # Admin / System
    path('api/admin/health/', SystemHealthView.as_view(), name='system_health'),
    path('api/admin/health/services/<str:service_name>/', ServiceDetailView.as_view(), name='service_detail'),
    path('api/admin/services/<str:service_name>/restart/', ServiceRestartView.as_view(), name='service_restart'),
    path('api/admin/activity-log/', ActivityLogView.as_view(), name='activity_log'),
    path('api/admin/settings/', SystemSettingsView.as_view(), name='system_settings'),
    # Notification custom actions — must be listed BEFORE router.urls
    # to prevent DRF's /{pk}/ pattern from greedily matching "send" / "send-bulk"
    path('api/notifications/send/', NotificationViewSet.as_view({'post': 'send_notification'}), name='notification_send'),
    path('api/notifications/send-bulk/', NotificationViewSet.as_view({'post': 'send_notification_bulk'}), name='notification_send_bulk'),

    path('api/', include(router.urls)),
]
