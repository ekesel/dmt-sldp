from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.http import FileResponse
from rest_framework.permissions import IsAuthenticated
from .models import Tag, MetadataCategory, MetadataValue, Document, DocumentVersion
from .serializers import (
    TagSerializer, MetadataCategorySerializer, MetadataValueSerializer,
    DocumentSerializer, VersionSerializer, UserSerializer
)
from .permissions import IsManager, IsManagerOrReadOnly, IsTenantUser
from .utils import get_visible_docs
from users.models import User
from django_tenants.utils import schema_context

import logging

logger = logging.getLogger(__name__)

# Documents
class DocumentAPI(APIView):
    permission_classes = [IsManagerOrReadOnly]


    def get(self, request):
        logger.info(f"DocumentAPI GET: User={request.user}, Tenant={getattr(request, 'tenant', 'None')}")
        docs = get_visible_docs(request.user)

        # Optional filters via query params
        if request.GET.get("tag"):
            docs = docs.filter(tags__id=request.GET["tag"])

        if request.GET.get("meta"):
            docs = docs.filter(metadata_values__id=request.GET["meta"])

        return Response(DocumentSerializer(docs.distinct(), many=True).data)

    def post(self, request):
        logger.info(f"DocumentAPI POST: User={request.user}, Tenant={getattr(request, 'tenant', 'None')}")
        ser = DocumentSerializer(data=request.data)

        if ser.is_valid():
            doc = ser.save(
                created_by=request.user
            )
            # Create the first version if a file was uploaded
            if request.FILES.get("file"):
                DocumentVersion.objects.create(
                    document=doc,
                    file=request.FILES["file"],
                    version_number=1,
                    uploaded_by=request.user
                )
            return Response({"data": ser.data, "msg": "Document created"}, status=status.HTTP_201_CREATED)

        logger.error(f"DocumentAPI POST: Validation failed. Errors={ser.errors}")
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


# Single Document  →  /documents/<id>/
class DocumentDetailAPI(APIView):
    permission_classes = [IsManagerOrReadOnly]


    def get_object(self, request, id):
        # Allow viewing any non-deleted document if you have the ID
        return get_object_or_404(
            Document.objects.prefetch_related('versions', 'tags', 'metadata_values__category'),
            id=id
        )


    def get(self, request, id):
        logger.info(f"DocumentDetailAPI GET: id={id}, User={request.user}, Tenant={getattr(request, 'tenant', 'None')}")
        doc = self.get_object(request, id)
        latest_version = doc.versions.order_by("-version_number").first()

        return Response({
            "data": DocumentSerializer(doc).data,
            "latest_version": VersionSerializer(latest_version).data if latest_version else None,
            "msg": "Document fetched"
        })


    def patch(self, request, id):
        logger.info(f"DocumentDetailAPI PATCH: id={id}, User={request.user}, Tenant={getattr(request, 'tenant', 'None')}")
        doc = self.get_object(request, id)
    

        ser = DocumentSerializer(doc, data=request.data, partial=True)


        if ser.is_valid():
            ser.save()
            return Response({"msg": "Updated"})

        logger.error(f"DocumentDetailAPI PATCH: Validation failed. Errors={ser.errors}")
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, id):
        logger.info(f"DocumentDetailAPI DELETE: id={id}, User={request.user}, Tenant={getattr(request, 'tenant', 'None')}")
        doc = self.get_object(request, id)
        
    
        doc.is_deleted = True
    
        doc.save()

        return Response({"msg": "Deleted"})


# Versions  →  /documents/<id>/versions/
class UploadVersionAPI(APIView):
    permission_classes = [IsManager]


    def post(self, request, id):
        logger.info(f"UploadVersionAPI POST: id={id}, User={request.user}, Tenant={getattr(request, 'tenant', 'None')}")
        doc = get_object_or_404(Document, id=id)

        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "File is required"}, status=status.HTTP_400_BAD_REQUEST)

        last = doc.versions.order_by("-version_number").first()
        next_version = (last.version_number + 1) if last else 1

        DocumentVersion.objects.create(
            document=doc,
            file=file_obj,
            version_number=next_version,
            uploaded_by=request.user
        )

        return Response({"msg": f"Version {next_version} uploaded"})


class VersionListAPI(APIView):
    permission_classes = [IsTenantUser]


    def get(self, request, id):
        logger.info(f"VersionListAPI GET: id={id}, User={request.user}, Tenant={getattr(request, 'tenant', 'None')}")
        # Allow all users to see versions of any non-deleted document
        get_object_or_404(Document, id=id)
        versions = DocumentVersion.objects.filter(document_id=id)
        return Response(VersionSerializer(versions, many=True).data)



# Tags  →  /tags/
class TagAPI(APIView):
    permission_classes = [IsManagerOrReadOnly]

    def get(self, request):
        logger.info(f"TagAPI GET: Reached view successfully. User={request.user}, Tenant={getattr(request, 'tenant', 'None')}")
        return Response(TagSerializer(Tag.objects.all(), many=True).data)

    def post(self, request):
        logger.info(f"TagAPI POST: Reached view successfully. User={request.user}, Tenant={getattr(request, 'tenant', 'None')}")
        ser = TagSerializer(data=request.data)
        if ser.is_valid():
            ser.save()
            return Response(ser.data, status=status.HTTP_201_CREATED)
        logger.error(f"TagAPI POST: Validation failed. Errors={ser.errors}")
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


# Metadata Category  →  /metadata/categories/
class MetadataCategoryAPI(APIView):
    permission_classes = [IsManagerOrReadOnly]



    def get(self, request):
        logger.info(f"MetadataCategoryAPI GET: User={request.user}, Tenant={getattr(request, 'tenant', 'None')}")
        return Response(MetadataCategorySerializer(MetadataCategory.objects.all(), many=True).data)

    def post(self, request):
        logger.info(f"MetadataCategoryAPI POST: User={request.user}, Tenant={getattr(request, 'tenant', 'None')}")
        ser = MetadataCategorySerializer(data=request.data)
        if ser.is_valid():
            ser.save()
            return Response(ser.data, status=status.HTTP_201_CREATED)
        logger.error(f"MetadataCategoryAPI POST: Validation failed. Errors={ser.errors}")
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


# Metadata Value  →  /metadata/values/
class MetadataValueAPI(APIView):
    permission_classes = [IsManagerOrReadOnly]



    def get(self, request):
        logger.info(f"MetadataValueAPI GET: User={request.user}, Tenant={getattr(request, 'tenant', 'None')}")
        qs = MetadataValue.objects.filter(category__is_deleted=False)
        if request.GET.get("category"):
            qs = qs.filter(category_id=request.GET["category"])
        return Response(MetadataValueSerializer(qs, many=True).data)

    def post(self, request):
        logger.info(f"MetadataValueAPI POST: User={request.user}, Tenant={getattr(request, 'tenant', 'None')}")
        ser = MetadataValueSerializer(data=request.data)
        if ser.is_valid():
            ser.save()
            return Response(ser.data, status=status.HTTP_201_CREATED)
        logger.error(f"MetadataValueAPI POST: Validation failed. Errors={ser.errors}")
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

