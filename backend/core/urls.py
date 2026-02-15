from django.contrib import admin
# Trigger reload
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from data.views import MetricDashboardView, ForecastView, AIInsightFeedbackView
from tenants.views import TenantViewSet, SystemHealthView, ActivityLogView, SystemSettingsView
from users.views import RegisterView, CustomTokenObtainPairView, UserProfileView, LogoutView, UserViewSet
from rest_framework.routers import DefaultRouter

from configuration.views import ProjectViewSet, SourceConfigurationViewSet

router = DefaultRouter()
router.register(r'admin/tenants', TenantViewSet, basename='tenants')
router.register(r'admin/users', UserViewSet, basename='users')
router.register(r'admin/projects', ProjectViewSet, basename='projects')
router.register(r'admin/sources', SourceConfigurationViewSet, basename='source_configurations')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/profile/', UserProfileView.as_view(), name='user_profile'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),
    path('api/analytics/metrics/', MetricDashboardView.as_view(), name='metrics_dashboard'),
    path('api/analytics/forecast/', ForecastView.as_view(), name='forecast'),
    path('api/analytics/insights/feedback/', AIInsightFeedbackView.as_view(), name='ai_feedback'),
    path('api/admin/health/', SystemHealthView.as_view(), name='system_health'),
    path('api/admin/activity-log/', ActivityLogView.as_view(), name='activity_log'),
    path('api/admin/settings/', SystemSettingsView.as_view(), name='system_settings'),
    path('api/', include(router.urls)),
]
