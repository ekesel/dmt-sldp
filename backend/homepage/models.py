from django.db import models

class BaseDocument(models.Model):
    org_name = models.CharField(max_length=100)

    class Meta:
        abstract = True

# Function that Handel file 
def image_upload_path(instance, filename):
    return f'{instance.org_name}/{instance.folder_name}/{filename}'

# Model for Organization Chart
class Org_chart(BaseDocument):
    folder_name = "org_chart"
    org_chart_file = models.FileField(upload_to=image_upload_path)
    
    def __str__(self):
        return f"{self.org_name} - {self.org_chart_file.name}"


# Model for Holiday Calendar
class Holidaycalendar(BaseDocument):
    folder_name = "holiday_calendar"
    holiday_calendar_file = models.FileField(upload_to=image_upload_path)
    
    def __str__(self):
        return f"{self.org_name} - {self.holiday_calendar_file.name}"


# Model for Employee Engagement Calendar
class EmployeeEngagementCalendar(BaseDocument):
    folder_name = "employee_engagement_calendar"
    employee_engagement_calendar_file= models.FileField(upload_to=image_upload_path)
    
    def __str__(self):
        return f"{self.org_name} - {self.employee_engagement_calendar_file.name}"


# Model for Policy
class Policy(BaseDocument):
    folder_name = "policy"
    policy_file = models.FileField(upload_to=image_upload_path)
    
    def __str__(self):
        return f"{self.org_name} - {self.policy_file.name}"
