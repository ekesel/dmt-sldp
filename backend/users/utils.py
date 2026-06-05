import pandas as pd
import logging
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()
logger = logging.getLogger(__name__)


def import_users_from_excel(file_obj, tenant=None):
    try:
        df = pd.read_excel(file_obj)
        logger.info(f"df: {df}")
    except Exception as e:
        return {"success": False, "error": str(e)}

    stats = {
        "created": 0,
        "updated": 0,
        "failed": 0,
        "errors": []
    }

    df.columns = [col.strip() for col in df.columns]

    for index, row in df.iterrows():
        try:
            full_name = str(row.get("Full Name", "")).strip()
            email = str(row.get("Email", "")).strip().lower()

            # Handle NaN values
            if email == "nan":
                email = ""

            if full_name == "nan":
                full_name = ""

            # Validation
            if not email:
                stats["failed"] += 1
                stats["errors"].append(
                    f"Row {index+2}: Email is required"
                )
                continue

            
            with transaction.atomic():
                # Find existing user
                user = User.objects.filter(email=email, tenant=tenant).first()
                is_new = user is None

                # Create new user
                if is_new:
                    names = full_name.split()

                    user = User.objects.create(
                        username=email,
                        email=email,
                        first_name=names[0] if names else "",
                        last_name=" ".join(names[1:]) if len(names) > 1 else "",
                        tenant=tenant,
                        is_active=True
                    )

                    user.set_unusable_password()

                # Update dates (may raise; must be inside the savepoint)
                if pd.notna(row.get("Date of Joining")):
                    user.date_of_join = pd.to_datetime(
                        row["Date of Joining"]
                    ).date()

                if pd.notna(row.get("Date of Birth")):
                    user.date_of_birth = pd.to_datetime(
                        row["Date of Birth"]
                    ).date()

                user.save()

            # Only update counters after the atomic block commits successfully
            if is_new:
                stats["created"] += 1
            else:
                stats["updated"] += 1

        except Exception as e:
            stats["failed"] += 1
            stats["errors"].append(
                f"Row {index+2}: {str(e)}"
            )
            logger.error(e)

    return {"success": True, "stats": stats}