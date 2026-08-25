from django.contrib import admin
from .models import User, ExternalIdentity, Department, CustomPermission, RoleTable, MonthlyAllocationStatus, ResourceAllocation

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'is_staff')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    list_filter = ('is_active', 'is_staff', 'role')

@admin.register(MonthlyAllocationStatus)
class MonthlyAllocationStatusAdmin(admin.ModelAdmin):
    list_display = ('id', 'year', 'month', 'status', 'published_at', 'published_by', 'updated_at')
    list_filter = ('year', 'month', 'status')
    search_fields = ('year', 'month')

@admin.register(ResourceAllocation)
class ResourceAllocationAdmin(admin.ModelAdmin):
    list_display = ('id', 'developer', 'project', 'year', 'month', 'percentage_allocated', 'status', 'updated_at')
    list_filter = ('year', 'month', 'status', 'project')
    search_fields = ('developer__email', 'developer__username', 'project__name')

@admin.register(RoleTable)
class RoleTableAdmin(admin.ModelAdmin):
    list_display = ('id', 'role_name', 'role_code', 'role_category', 'dep_name', 'created_at')
    list_filter = ('role_category', 'dep_name')
    search_fields = ('role_name', 'role_code', 'dep_name')

admin.site.register(ExternalIdentity)
admin.site.register(Department)
admin.site.register(CustomPermission)

