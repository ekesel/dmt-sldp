from django.db import models
from users.models import User
from django.db import connection

def get_file_upload_path(instance, filename):
    schema = connection.schema_name
    # Using instance.document.id instead of slugified title for stability
    return f"{schema}/documents/{instance.document.id}/v{instance.version_number or 1}/{filename}"

# BASE
class BaseModel(models.Model):
    is_deleted = models.BooleanField(default=False)

    class Meta:
        abstract = True


# TAG
class Tag(BaseModel):
    name = models.CharField(max_length=100, unique=True)

# METADATA
class MetadataCategory(BaseModel):
    name = models.CharField(max_length=100)

# metadata values of that category, e.g. "type" -> "ppt", "functional document", etc.
class MetadataValue(models.Model):
    category = models.ForeignKey(MetadataCategory, on_delete=models.CASCADE)
    value = models.CharField(max_length=100)

    class Meta:
        unique_together = ("category", "value")


# DOCUMENT (WORKFLOW CORE)
class Document(BaseModel):

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "DRAFT"
        APPROVED = "APPROVED", "APPROVED"
        REJECTED = "REJECTED", "REJECTED"


    title = models.CharField(max_length=255)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_docs")
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="owned_docs")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)

    # M2M FIELDS
    tags = models.ManyToManyField(Tag, related_name="documents", blank=True)
    metadata_values = models.ManyToManyField(MetadataValue, related_name="documents", blank=True)



# VERSIONING
class DocumentVersion(BaseModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="versions")
    file = models.FileField(upload_to=get_file_upload_path)
    version_number = models.IntegerField()
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
