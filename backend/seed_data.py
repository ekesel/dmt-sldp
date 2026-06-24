from users.models import RoleTable

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

    for role_name in roles:
        obj, created = RoleTable.objects.get_or_create(role_name=role_name)
        if created:
            print(f"✅ Created: {role_name}")
            created_count += 1
        else:
            print(f"⏭️  Skipped (already exists): {role_name}")
            skipped_count += 1

    print(f"\n✅ Done! Created: {created_count}, Skipped: {skipped_count}")


if __name__ == "__main__":
    seed_roles()
