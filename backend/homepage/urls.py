from django.urls import path
from homepage.views import *

app_name = 'homepage'

urlpatterns = [
    path('org-chart/', OrgChartAPIView.as_view(), name='org-chart'),
    path('org-chart/<int:id>/', OrgChartAPIView.as_view(), name='org-chart-detail'),
    path('holiday-calendar/', HolidayCalendarAPIView.as_view(), name='holiday-calendar'),
    path('holiday-calendar/<int:id>/', HolidayCalendarAPIView.as_view(), name='holiday-calendar-detail'),
    path('employee-engagement/', EmployeeEngagementCalendarAPIView.as_view(), name='employee-engagement'),
    path('employee-engagement/<int:id>/', EmployeeEngagementCalendarAPIView.as_view(), name='employee-engagement-detail'),
    path('policy/', PolicyAPIView.as_view(), name='policy'),
    path('policy/<int:id>/', PolicyAPIView.as_view(), name='policy-detail'),
    path('leaderboard/', LeaderDashboardAPIView.as_view(), name='leaderboard')
    ]
