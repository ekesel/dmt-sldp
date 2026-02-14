from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from data.views import MetricDashboardView, ForecastView
from tenants.views import TenantViewSet, SystemHealthView
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'admin/tenants', TenantViewSet, basename='tenants')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/analytics/metrics/', MetricDashboardView.as_view(), name='metrics_dashboard'),
    path('api/analytics/forecast/', ForecastView.as_view(), name='forecast'),
    path('api/admin/health/', SystemHealthView.as_view(), name='system_health'),
    path('api/', include(router.urls)),
]
