from rest_framework.routers import DefaultRouter
from .views import TagViewset,MetadataCategoryViewset
 
router = DefaultRouter()
router.register(r'tags', TagViewset, basename='tag')
router.register(r'metadata-categories', MetadataCategoryViewset, basename='metadata-category')

 
urlpatterns = router.urls