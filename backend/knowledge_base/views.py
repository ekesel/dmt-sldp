from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import *
from .serializers import *
# from .permissions import *
from rest_framework.permissions import IsAuthenticated

# Tags Viwesets
class TagViewset(ModelViewSet):
    queryset = Tag.objects.filter(is_deleted=False)
    serializer_class = TagSerializer    
    

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.save()
        return Response({"message": "Tag deleted successfully"})



# Metadata Category Viewset
class MetadataCategoryViewset(ModelViewSet):
    queryset = MetadataCategory.objects.filter(is_deleted=False)
    serializer_class = MetadataCategorySerializer
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.save()
        return Response({"message": "Metadata category deleted successfully"})
    
    def create(self, request, *args, **kwargs):
        name = request.data.get('name', '').strip().lower()
        if MetadataCategory.objects.filter(name=name, is_deleted=False).exists():
            return Response({"error": "Metadata category with this name already exists."}, status=400)
        
        category = MetadataCategory.objects.get(name=name)
        category.is_deleted = False
        category.save()
        serializer = self.get_serializer(category)
        return Response(serializer.data, status=201)