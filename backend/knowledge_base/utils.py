from .models import Document

def get_visible_docs(user):
    """
    Visibility rules:
    - All authenticated users can see all non-deleted documents.
    - Anonymous users see nothing.
    """
    if not user.is_authenticated:
        return Document.objects.none()

    return Document.objects.filter(is_deleted=False)