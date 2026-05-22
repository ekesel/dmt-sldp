from users.models import RoleTable

roles = [
    "CEO",
    "CTO",
    "HR Manager",
    "Frontend Team Lead",
    "Backend Team Lead",
    "QA Team Lead",
    "AI Team Lead",
    "Data Engineer",
    "Project Manager",
]

created_count = 0
skipped_count = 0

for role_name in roles:
    obj, created = RoleTable.objects.get_or_create(role_name=role_name)
    if created:
        print(f"✅ Created: {role_name}")
        created_count += 1
    else:
        print(f"⏭️  Skipped (already exists): {role_name}")
        skipped_count += 1

print(f"\n✅ Done! Created: {created_count}, Skipped: {skipped_count}")
