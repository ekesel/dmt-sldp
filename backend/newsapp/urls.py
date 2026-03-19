from django.urls import path
from .views import (
    CreateCommentView,
    PostCommentsView,
    UpdateCommentView,
    DeleteCommentView,
    ReactPostView,
    PostReactionsView,
    DeleteReactionView,
    upload_temp_image
)

app_name = "newsapp"

urlpatterns = [
    # Comment endpoints
    path("comments/create/", CreateCommentView.as_view(), name="comment-create"),
    path("comments/post/<int:post_id>/", PostCommentsView.as_view(), name="post-comments"),
    path("comments/update/<int:comment_id>/", UpdateCommentView.as_view(), name="comment-update"),
    path("comments/delete/<int:comment_id>/", DeleteCommentView.as_view(), name="comment-delete"),

    # Reaction endpoints
    path("reactions/create/", ReactPostView.as_view(), name="reaction-create"),
    path("reactions/post/<int:post_id>/", PostReactionsView.as_view(), name="post-reactions"),
    path("reactions/delete/<int:post_id>/", DeleteReactionView.as_view(), name="reaction-delete"),

    # Image upload endpoint
    path("upload-image/", upload_temp_image, name="upload-image"),
]