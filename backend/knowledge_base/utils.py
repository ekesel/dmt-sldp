from django.db.models import Q
from .models import Document

def get_visible_docs(user):
    """
    Visibility rules:
    - Anyone can see APPROVED documents.
    - Owners can see their own documents (even if DRAFT or REJECTED).
    """
    if not user.is_authenticated:
        return Document.objects.none()

    return Document.objects.filter(is_deleted=False).filter(
        Q(status="APPROVED") | Q(owner=user)
    )