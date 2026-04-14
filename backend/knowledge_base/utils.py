from django.db.models import Q
from .models import Document

def get_visible_docs(user):
    """
    Visibility rules:
    - Owners can see their own documents (even if DRAFT or REJECTED).
    - Managers can see all non-deleted documents for review/approval.
    - Other authenticated users can only see APPROVED documents.
    - Anonymous users see nothing.
    """
    if not user.is_authenticated:
        return Document.objects.none()

    base_qs = Document.objects.all()
    
    # Managers can see everything (DRAFT, APPROVED, REJECTED)
    if getattr(user, "is_manager", False):
        return base_qs

    # Regular users/Owners
    return base_qs.filter(
        Q(status=Document.Status.APPROVED) | Q(owner=user)
    )