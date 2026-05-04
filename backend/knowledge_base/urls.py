from django.urls import path
from .views import (
    DocumentAPI, DocumentDetailAPI, DocumentStatusAPI,
    UploadVersionAPI, VersionListAPI, DownloadAPI,
      TagAPI, MetadataCategoryAPI, MetadataValueAPI,
    TenantUsersAPI
)

urlpatterns = [

    path("documents/", DocumentAPI.as_view()),
    path("documents/<int:id>/", DocumentDetailAPI.as_view()),

    path("documents/<int:id>/status/", DocumentStatusAPI.as_view()),

    path("documents/<int:id>/upload-version/", UploadVersionAPI.as_view()),
    path("documents/<int:id>/versions/", VersionListAPI.as_view()),

    path("download/<int:vid>/", DownloadAPI.as_view()),

    path("tags/", TagAPI.as_view()),

    path("metadata/categories/", MetadataCategoryAPI.as_view()),
    path("metadata/values/", MetadataValueAPI.as_view()),

    path("users/", TenantUsersAPI.as_view()),
]