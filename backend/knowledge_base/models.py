from django.db import models
from django.conf import settings
from django.db import connection
from django.utils.text import get_valid_filename
import uuid
from users.models import User
 
 
 
def get_doc_upload_path(instance, filename):
    filename = get_valid_filename(filename)
    schema_name = getattr(connection, 'schema_name', 'public')
    return f"{schema_name}/docs/{uuid.uuid4()}_{filename}"
 
# Document table
class Document(models.Model):
    STATUS = [
        ('DRAFT', 'Draft'),
        ('PUBLISHED', 'Published'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
 
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS, default='DRAFT')
 
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_docs')
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_docs')
 
    latest_version = models.ForeignKey(
        'DocumentVersion',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+'
    )
 
    tags = models.ManyToManyField('Tag',related_name='documents')
 
    created_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        app_label = 'knowledge_base'

    def __str__(self):
        return self.title

    def delete(self, *args, **kwargs):
        self.is_deleted = True
        self.save()
 
 
# Document version table
class DocumentVersion(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='versions')
    file = models.FileField(upload_to=get_doc_upload_path)
    version_number = models.IntegerField()
 
    previous_version = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
 
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
 
    class Meta:
        app_label = 'knowledge_base'
        unique_together = ('document', 'version_number')
        ordering = ['-version_number']
 
# category table
class MetadataCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        app_label = 'knowledge_base'

    def save(self, *args, **kwargs):
        self.name = self.name.lower()
        super().save(*args, **kwargs)
 
    def __str__(self):
        return self.name
 
 
# document metadata table
class DocumentMetadata(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='metadata')
    category = models.ForeignKey(MetadataCategory, on_delete=models.CASCADE)
    value = models.CharField(max_length=255)
 
    class Meta:
        app_label = 'knowledge_base'
        unique_together = ('document', 'category')
        indexes = [
            models.Index(fields=['category', 'value']),
        ]
 
# Tag table
class Tag(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_deleted = models.BooleanField(default=False)
 
    class Meta:
        app_label = 'knowledge_base'

    def __str__(self):
        return self.name
 