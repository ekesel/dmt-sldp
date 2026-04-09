from rest_framework import serializers
from .models import Tag, MetadataCategory, MetadataValue, Document, DocumentVersion
from users.models import User

# Tag
class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name"]



# Metadata Category
class MetadataCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MetadataCategory
        fields = ["id", "name"]



# Metadata Value
class MetadataValueSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = MetadataValue
        fields = ["id", "category", "category_name", "value"]



# Document
class DocumentSerializer(serializers.ModelSerializer):

    # Write fields (accept list of IDs)
    tags = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Tag.objects.all(),
        required=False
    )
    metadata_values = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=MetadataValue.objects.all(),
        required=False
    )

    # Read-only detail fields
    tag_details = TagSerializer(source="tags", many=True, read_only=True)
    metadata_details = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id", "title", "created_by", "owner", "status", "created_at",
            "tags", "metadata_values", "tag_details", "metadata_details"
        ]
        read_only_fields = ["created_by", "status"]

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, "copy") else data

        # Support common aliases (metadata -> metadata_values, tag -> tags)
        for alias, target in [("metadata", "metadata_values"), ("tag", "tags")]:
            if alias in data and target not in data:
                if hasattr(data, "setlist"):
                    data.setlist(target, data.getlist(alias))
                else:
                    data[target] = data.get(alias)

        for field in ["tags", "metadata_values"]:
            if field in data:
                raw = data.get(field)
                # If it looks like a comma-sep string or a bracketed list e.g. "1,2" or "[1]"
                if isinstance(raw, str) and ("," in raw or (raw.startswith("[") and raw.endswith("]"))):
                    items = [x.strip() for x in raw.strip("[]").split(",") if x.strip()]
                    if hasattr(data, "setlist"):
                        data.setlist(field, items)
                    else:
                        data[field] = items

        return super().to_internal_value(data)

    def get_metadata_details(self, obj):
        return [
            {
                "id": m.id,
                "category": m.category.name,
                "value": m.value,
            }
            for m in obj.metadata_values.all()
        ]

    def create(self, validated_data):
        tags = validated_data.pop("tags", [])
        metas = validated_data.pop("metadata_values", [])

        doc = Document.objects.create(**validated_data)
        doc.tags.set(tags)
        doc.metadata_values.set(metas)

        return doc

    def update(self, instance, validated_data):
        tags = validated_data.pop("tags", None)
        metas = validated_data.pop("metadata_values", None)

        # Update simple fields
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()

        # Only update M2M if they were actually sent in the request
        if tags is not None:
            instance.tags.set(tags)
        if metas is not None:
            instance.metadata_values.set(metas)

        return instance



# Document Version
class VersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentVersion
        fields = "__all__"



# User
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]