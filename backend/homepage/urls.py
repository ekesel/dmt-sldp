from django.urls import path
from homepage.views import *

urlpatterns = [
    path('org-chart/', OrgChartAPIView.as_view(), name='org-chart'),
    path('org-chart/<int:id>/', OrgChartAPIView.as_view(), name='org-chart'),
    path('holiday-calendar/', HolidayCalendarAPIView.as_view(), name='holiday-calendar'),
    path('holiday-calendar/<int:id>/', HolidayCalendarAPIView.as_view(), name='holiday-calendar'),
    path('employee-engagement/', EmployeeEngagementCalendarAPIView.as_view(), name='employee-engagement'),
    path('employee-engagement/<int:id>/', EmployeeEngagementCalendarAPIView.as_view(), name='employee-engagement'),
    path('policy/', PolicyAPIView.as_view(), name='policy'),
    path('policy/<int:id>/', PolicyAPIView.as_view(), name='policy'),
    path('leaderboard/', LeaderDashboardAPIView.as_view(), name='leaderboard')
    ]
