import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from users.models import RoleTable, CustomPermission


roles = [
    "CEO",
    "CTO",
    "Owner",
    "HR Manager",
    "Project Manager",
    "Frontend Team Lead",
    "Frontend Developer",
    "Junior Frontend Developer",
    "Frontend Intern",
    "Backend Team Lead",
    "Backend Developer",
    "Junior Backend Developer",
    "Backend Intern",
    "QA Team Lead",
    "QA Engineer",
    "Junior QA Engineer",
    "QA Intern",
    "AI Team Lead",
    "AI Engineer",
    "Junior AI Engineer",
    "AI Intern",
    "Data Engineer",
    "Junior Data Engineer",
    "Data Intern",
    "Intern",
]

def seed_roles():
    created_count = 0
    skipped_count = 0

    # Ensure upload_documents permission exists
    upload_perm, _ = CustomPermission.objects.get_or_create(
        permission_code="UPLOAD_DOCUMENTS",
        defaults={
            "name": "Upload Documents",
            "description": "Allows uploading company policies and learning & development files"
        }
    )

    for role_name in roles:
        obj, created = RoleTable.objects.get_or_create(role_name=role_name)
        if created:
            print(f"[Created] {role_name}")
            created_count += 1
        else:
            print(f"[Skipped] {role_name} (already exists)")
            skipped_count += 1

        # Backfill/ensure role_code is saved
        if not obj.role_code:
            obj.role_code = role_name.upper().replace(' ', '_')
            obj.save()

        # Attach UPLOAD_DOCUMENTS permission to HR Manager and HR roles
        if obj.role_code in ["HR_MANAGER", "HR"]:
            obj.permissions.add(upload_perm)

    print(f"\n[Done] Created: {created_count}, Skipped: {skipped_count}")



if __name__ == "__main__":
    seed_roles()
