from datetime import date, datetime
from users.models import User
import pandas as pd
from .models import Holiday
from django_tenants.utils import schema_context
# Checking today is any one birthday or not
def get_birthday_info(tenant):
    today = date.today()
    birthday_people = User.objects.filter(date_of_birth__month=today.month, date_of_birth__day=today.day, tenant=tenant)
    return birthday_people

# checking today is any one anniversary or not
def get_anniversary_info(tenant):
    today = date.today()
    anniversary_people = User.objects.filter(date_of_join__month=today.month, date_of_join__day=today.day, tenant=tenant)
    TodayAnniversaryList = []
    for obj in anniversary_people:
        total_year = today.year - obj.date_of_join.year
        TodayAnniversaryList.append({
            "user": obj.first_name + " " + obj.last_name,
            "anniversary_count": total_year
        })
    return TodayAnniversaryList

def upcoming_birthday_info(tenant):
    today = date.today()
    users = User.objects.filter(tenant=tenant)
    upcoming = []
    for user in users:
        if not user.date_of_birth:
            continue
        dob = user.date_of_birth

        # Birthday for current year
        try:
            next_birthday = dob.replace(year=today.year)
        except ValueError:
            # Handle leap year
            next_birthday = dob.replace(year=today.year, day=dob.day-1)

        # If birthday already passed
        if next_birthday < today:
            try:
                next_birthday = next_birthday.replace(year=today.year + 1)
            except ValueError:
                next_birthday = next_birthday.replace(year=today.year + 1, day=dob.day-1)

        # Days left
        days_left = (next_birthday - today).days

        # Upcoming in next 30 days
        if 1 <= days_left <= 30:
            upcoming.append({
                "user": user,
                "next_birthday": next_birthday,
                "days_left": days_left
            })
    return upcoming

def upcoming_anniversary_info(tenant):
    today = date.today()
    users = User.objects.filter(tenant=tenant)
    upcoming = []
    for user in users:
        if not user.date_of_join:
            continue

        doa = user.date_of_join

        # Anniversary for current year
        try:
            next_anniversary = doa.replace(year=today.year)
        except ValueError:
            next_anniversary = doa.replace(year=today.year, day=doa.day-1)

        # If anniversary already passed
        if next_anniversary < today:
            try:
                next_anniversary = next_anniversary.replace(year=today.year + 1)
            except ValueError:
                next_anniversary = next_anniversary.replace(year=today.year + 1, day=doa.day-1)

        # Days left
        days_left = (next_anniversary - today).days

        # Upcoming in next 30 days
        if 1 <= days_left <= 30:
            upcoming.append({
                "user": user,
                "next_anniversary": next_anniversary,
                "days_left": days_left
            })
    return upcoming




def import_holidays_from_excel(file, tenant_id):

    try:
        # Read Excel file
        df = pd.read_excel(file)

        # Normalize column names
        df.columns = df.columns.str.strip().str.lower()

        if "date" not in df.columns or "holiday name" not in df.columns:
            return {
                'success': False,
                'error': f"Required columns 'date' and 'holiday name' not found. Found columns: {list(df.columns)}",
                'stats': {'created': 0}
            }

        created_count = 0
        with schema_context(tenant_id.schema_name):
            # Delete old holidays for this tenant
            Holiday.objects.filter(tenant_id=tenant_id).delete()

            # Insert new holidays
            for _, row in df.iterrows():
                if pd.isna(row["date"]) or pd.isna(row["holiday name"]):
                    continue
                Holiday.objects.create(
                    date=row["date"],
                    name=row["holiday name"],
                    tenant_id=tenant_id
                )
                created_count += 1

        return {
            'success': True,
            'stats': {'created': created_count}
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'stats': {'created': 0}
        }