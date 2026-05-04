from homepage.models import *
from rest_framework import serializers

class OrgChartSerializer(serializers.ModelSerializer):
    class Meta:
        model = Org_chart
        fields = ['id','org_chart_file']
       
class HolidayCalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Holidaycalendar
        fields = ['id','holiday_calendar_file']
        

class EmployeeEngagementCalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeEngagementCalendar
        fields = ['id','employee_engagement_calendar_file']
        

class PolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = Policy
        fields = ['id','policy_file']  

