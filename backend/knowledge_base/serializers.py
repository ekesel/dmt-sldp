from rest_framework import serializers
from .models import *
 
 
# VERSION
class DocumentVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentVersion
        fields = ['id', 'file', 'version_number', 'created_at']
 
 
# METADATA CATEGORY
class MetadataCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MetadataCategory
        fields = ['id', 'name']
 
 
# METADATA
class DocumentMetadataSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
 
    class Meta:
        model = DocumentMetadata
        fields = ['id', 'document', 'category', 'category_name', 'value']
 
 
# TAG
class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name']
 
 
# DOCUMENT
class DocumentSerializer(serializers.ModelSerializer):
    versions = DocumentVersionSerializer(many=True, read_only=True)
    metadata = DocumentMetadataSerializer(many=True, read_only=True)
 
    class Meta:
        model = Document
        fields = [
            'id', 'title', 'status',
            'created_by', 'owner',
            'versions', 'metadata'
        ]
 
 
# CREATE DOCUMENT
class DocumentCreateSerializer(serializers.Serializer):
    title = serializers.CharField()
    owner_id = serializers.IntegerField()
    file = serializers.FileField()
 
    def create(self, validated_data):
        user = self.context['request'].user
 
        doc = Document.objects.create(
            title=validated_data['title'],
            created_by=user,
            owner_id=validated_data['owner_id']
        )
 
        version = DocumentVersion.objects.create(
            document=doc,
            file=validated_data['file'],
            version_number=1,
            uploaded_by=user
        )
 
        doc.latest_version = version
        doc.save()
 
        return doc