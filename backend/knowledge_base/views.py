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
from .permissions import IsManager, IsManagerOrReadOnly

from .utils import get_visible_docs
from users.models import User


# Documents  →  /documents/
class DocumentAPI(APIView):
    permission_classes = [IsManagerOrReadOnly]


    def get(self, request):
        # Base visibility: Managers/Admins see all; Regular users see APPROVED or OWNED.
        docs = get_visible_docs(request.user)

        # Filter by "mine" (available to everyone)
        if request.GET.get("mine") == "true":
            docs = docs.filter(owner=request.user)

        # Filter by status (optional overriding)
        requested_status = request.GET.get("status")
        if requested_status:
            docs = docs.filter(status=requested_status)
        else:
            # Everyone (including managers) defaults to seeing ONLY APPROVED documents
            # unless they specifically filter by status or are looking at their own documents.
            if request.GET.get("mine") != "true":
                docs = docs.filter(status=Document.Status.APPROVED)

        # Optional filters via query params
        if request.GET.get("tag"):
            docs = docs.filter(tags__id=request.GET["tag"])

        if request.GET.get("meta"):
            docs = docs.filter(metadata_values__id=request.GET["meta"])

        return Response(DocumentSerializer(docs.distinct(), many=True).data)

    def post(self, request):
        ser = DocumentSerializer(data=request.data)

        if ser.is_valid():
            doc = ser.save(
                created_by=request.user,
                owner=ser.validated_data.get("owner", request.user)
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
        doc = self.get_object(request, id)
        latest_version = doc.versions.order_by("-version_number").first()

        return Response({
            "data": DocumentSerializer(doc).data,
            "latest_version": VersionSerializer(latest_version).data if latest_version else None,
            "msg": "Document fetched"
        })


    def patch(self, request, id):
        doc = self.get_object(request, id)
        
        # Only owner or manager (if applicable) should update. 
        # But per latest: "owner mean that manager whoes id is given in that doc ment"
        # Manager check is handled by permission_classes (IsManagerOrReadOnly)
    
        ser = DocumentSerializer(doc, data=request.data, partial=True)


        if ser.is_valid():
            ser.save()
            return Response({"msg": "Updated"})

        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, id):
        doc = self.get_object(request, id)
        
        # Manager check is handled by permission_classes
    
        doc.is_deleted = True

        doc.save()
        return Response({"msg": "Deleted"})


# Unified Workflow  →  /documents/<id>/status/
class DocumentStatusAPI(APIView):
    permission_classes = [IsManager]


    def post(self, request, id):
        doc = get_object_or_404(Document, id=id)
        # Check for 'status' or 'Status' to be user-friendly
        target_status = request.data.get("status") or request.data.get("Status")

        if not target_status:
            return Response({"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST)

        valid_statuses = Document.Status.values
        if target_status not in valid_statuses:
            return Response({"error": f"Invalid status. Choose from: {valid_statuses}"}, status=status.HTTP_400_BAD_REQUEST)

        # Manager check is already handled by IsManager permission class


        doc.status = target_status
        doc.save()
        return Response({"msg": f"Document status updated to {target_status}", "data": {"status": doc.status}})


# Versions  →  /documents/<id>/versions/
class UploadVersionAPI(APIView):
    permission_classes = [IsManager]


    def post(self, request, id):
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

        # New upload resets document back to DRAFT
        doc.status = Document.Status.DRAFT
        doc.save()

        return Response({"msg": f"Version {next_version} uploaded"})


class VersionListAPI(APIView):
    permission_classes = [IsAuthenticated]


    def get(self, request, id):
        # Allow all users to see versions of any non-deleted document
        get_object_or_404(Document, id=id)
        versions = DocumentVersion.objects.filter(document_id=id)
        return Response(VersionSerializer(versions, many=True).data)



class DownloadAPI(APIView):
    permission_classes = [IsAuthenticated]


    def get(self, request, vid):
        version = get_object_or_404(DocumentVersion, id=vid)
        # Check if the parent document is deleted
        if version.document.is_deleted:
            return Response({"error": "This document has been deleted."}, status=status.HTTP_404_NOT_FOUND)
            
        return FileResponse(version.file.open(), as_attachment=True)



# Tags  →  /tags/
class TagAPI(APIView):
    permission_classes = [IsManagerOrReadOnly]



    def get(self, request):
        return Response(TagSerializer(Tag.objects.all(), many=True).data)

    def post(self, request):
        ser = TagSerializer(data=request.data)
        if ser.is_valid():
            ser.save()
            return Response(ser.data, status=status.HTTP_201_CREATED)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


# Metadata Category  →  /metadata/categories/
class MetadataCategoryAPI(APIView):
    permission_classes = [IsManagerOrReadOnly]



    def get(self, request):
        return Response(MetadataCategorySerializer(MetadataCategory.objects.all(), many=True).data)

    def post(self, request):
        ser = MetadataCategorySerializer(data=request.data)
        if ser.is_valid():
            ser.save()
            return Response(ser.data, status=status.HTTP_201_CREATED)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


# Metadata Value  →  /metadata/values/
class MetadataValueAPI(APIView):
    permission_classes = [IsManagerOrReadOnly]



    def get(self, request):
        qs = MetadataValue.objects.filter(category__is_deleted=False)
        if request.GET.get("category"):
            qs = qs.filter(category_id=request.GET["category"])
        return Response(MetadataValueSerializer(qs, many=True).data)

    def post(self, request):
        ser = MetadataValueSerializer(data=request.data)
        if ser.is_valid():
            ser.save()
            return Response(ser.data, status=status.HTTP_201_CREATED)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


# Users in current tenant  →  /users/
class TenantUsersAPI(APIView):
    permission_classes = [IsManager]


    def get(self, request):
        tenant = request.tenant
        users = User.objects.filter(tenant=tenant, is_active=True, is_manager=True)
        return Response(UserSerializer(users, many=True).data)