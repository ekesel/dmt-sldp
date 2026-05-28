from django.db import models

class BaseDocument(models.Model):
    org_name = models.CharField(max_length=100)

    class Meta:
        abstract = True

# Function that Handel file 
def image_upload_path(instance, filename):
    return f'{instance.org_name}/{instance.folder_name}/{filename}'


# Model for Holiday Calendar
class Holidaycalendar(BaseDocument):
    folder_name = "holiday_calendar"
    holiday_calendar_file = models.FileField(upload_to=image_upload_path)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.org_name} - {self.holiday_calendar_file.name}"


# Model for Employee Engagement Calendar
class EmployeeEngagementCalendar(BaseDocument):
    folder_name = "employee_engagement_calendar"
    employee_engagement_calendar_file= models.FileField(upload_to=image_upload_path)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.org_name} - {self.employee_engagement_calendar_file.name}"


# Model for Policy
class Policy(BaseDocument):
    folder_name = "policy"
    policy_file = models.FileField(upload_to=image_upload_path)
    
    def __str__(self):
        return f"{self.org_name} - {self.policy_file.name}"


# Model for Learning And Development
class LearningAndDevelopment(BaseDocument):
    folder_name = "learning_and_development"
    learning_and_development_file = models.FileField(upload_to=image_upload_path)
    
    def __str__(self):
        return f"{self.org_name} - {self.learning_and_development_file.name}"


# Model for Onboarding
class Onboarding(BaseDocument):
    folder_name = "onboarding"
    title = models.CharField(max_length=255)
    onboarding_file = models.FileField(upload_to=image_upload_path)
    
    def __str__(self):
        return f"{self.org_name} - {self.title}"


# Model for Holiday Data
class Holiday(models.Model):
    name = models.CharField(max_length=255, help_text="Name of the holiday")
    date = models.DateField(help_text="Date of the holiday")
    tenant_id = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, help_text="Tenant ID")
    
    class Meta:
        ordering = ['date']
        verbose_name = 'Holiday'
        verbose_name_plural = 'Holidays'

    def __str__(self):
        return f"{self.name} ({self.date})"
